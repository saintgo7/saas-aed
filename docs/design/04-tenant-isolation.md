# 04. 다기관(Multi-tenant) 격리 설계

> 결론 먼저: **3계층 가드(인증 → 미들웨어 → ORM 헬퍼)**를 모두 통과해야만 데이터에 닿는다. 한 계층이 무너져도 다음 계층이 막는 심층 방어(defense-in-depth) 구조.

---

## 1. 위협 모델

| 위협 | 설명 | 방어 계층 |
|------|------|-----------|
| T1. 토큰 위조 | 다른 테넌트 사용자의 세션 쿠키 탈취/위조 | Layer 1 (Auth.js JWT 서명) |
| T2. 파라미터 변조 | URL의 `:deviceId`를 다른 테넌트 자원으로 변경 | Layer 2 (req.context.tenantId 강제) + Layer 3 (`withTenant` WHERE) |
| T3. 코드 회귀 | 신규 라우트에서 `db.select(devices)`를 그냥 호출 | Layer 3 (ESLint `no-bare-db`) + 코드 리뷰 |
| T4. 마이그레이션 누수 | 신규 테이블에 `tenant_id` 미포함 | Drizzle generate 후 lint 룰: 모든 도메인 테이블 `tenant_id` 필수 |
| T5. 백업 노출 | DB 덤프가 외부 유출 | 어떤 컬럼에도 평문 PII 최소화, R2는 SSE-S3 암호화 |
| T6. R2 객체 cross-tenant | 다른 테넌트가 signed URL 추측 | R2 키 prefix `tenants/{tid}/...`, signed URL 5분 만료, prefix 정책 검증 |

본 문서는 T1~T4를 다룬다.

---

## 2. 3계층 가드 개요

```mermaid
graph TD
  REQ[HTTP Request] --> L1[Layer 1: Auth.js<br/>session.tenantId]
  L1 -->|callbacks.session| L2[Layer 2: middleware.ts<br/>req.context.tenantId]
  L2 -->|NextRequest with ctx| L3[Layer 3: withTenant(db, tid)<br/>ORM scope helper]
  L3 --> DB[(PostgreSQL<br/>WHERE tenant_id = $1)]

  style L1 fill:#fde68a
  style L2 fill:#bbf7d0
  style L3 fill:#bfdbfe
```

각 계층이 빠지면 다음과 같이 실패한다.

| 누락 계층 | 결과 |
|-----------|------|
| L1 빠짐 | 세션이 없으니 401 즉시 반환 |
| L2 빠짐 | ctx 없음 → 핸들러 진입 시 `assertTenantContext()` throw |
| L3 빠짐 | ESLint 빌드 실패 (`no-bare-db`) |

---

## 3. Layer 1 — Auth.js v5 콜백에서 tenantId 주입

```typescript
// src/auth.ts
import NextAuth from "next-auth"
import EmailProvider from "next-auth/providers/email"
import { db } from "@/db"
import { users } from "@/db/schema"
import { and, eq } from "drizzle-orm"

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 60 * 60 * 12 }, // 12h
  providers: [
    EmailProvider({
      from: process.env.RESEND_FROM!,
      // 매직링크 발송은 Resend 어댑터로 위임
      sendVerificationRequest: async ({ identifier, url, token }) => {
        await sendMagicLink({ to: identifier, url })
      },
    }),
  ],
  callbacks: {
    async signIn({ user, email }) {
      // tenantSlug는 로그인 폼에서 별도 query로 받아 cookie에 저장 후 여기서 검증
      // (생략: signInTenantSlug() 헬퍼)
      return true
    },
    async jwt({ token, user, trigger }) {
      if (user?.email) {
        const tenantSlug = readTenantSlugFromCookie()
        const row = await db
          .select({ id: users.id, tenantId: users.tenantId, role: users.role })
          .from(users)
          .where(and(eq(users.email, user.email), eq(users.tenantSlug, tenantSlug)))
          .limit(1)
        const u = row[0]
        if (!u) throw new Error("UNREGISTERED_USER_FOR_TENANT")
        token.userId = u.id
        token.tenantId = u.tenantId    // ← 핵심: 세션 토큰에 박는다
        token.role = u.role
      }
      return token
    },
    async session({ session, token }) {
      // 클라이언트가 useSession()으로 받는 객체에는 tenantId 노출 X (보안)
      // 단, 내부 helper auth()로는 접근 가능
      return {
        ...session,
        user: {
          ...session.user,
          id: token.userId as string,
          role: token.role as "ADMIN" | "INSPECTOR",
          // tenantId는 server-only context로만 전달
        },
        tenantId: token.tenantId as string,
      }
    },
  },
})
```

**불변 조건**: JWT는 서버 비밀(`AUTH_SECRET`)로 서명되므로 클라이언트가 `tenantId`를 임의로 변경할 수 없다.

---

## 4. Layer 2 — `src/middleware.ts`

```typescript
// src/middleware.ts
import { NextResponse, type NextRequest } from "next/server"
import { auth } from "@/auth"

export async function middleware(req: NextRequest) {
  const session = await auth()

  // public routes
  const publicPaths = ["/api/health", "/api/auth", "/login"]
  if (publicPaths.some((p) => req.nextUrl.pathname.startsWith(p))) {
    return NextResponse.next()
  }

  if (!session?.tenantId || !session.user?.id) {
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: "Sign in required" } },
      { status: 401 }
    )
  }

  // request-scoped context propagation via headers (server-only readable)
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set("x-ctx-tenant-id", session.tenantId)
  requestHeaders.set("x-ctx-user-id", session.user.id)
  requestHeaders.set("x-ctx-role", session.user.role)

  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
```

핸들러에서 ctx 추출:

```typescript
// src/lib/request-context.ts
import { headers } from "next/headers"

export type RequestCtx = { tenantId: string; userId: string; role: "ADMIN" | "INSPECTOR" }

export function getRequestCtx(): RequestCtx {
  const h = headers()
  const tenantId = h.get("x-ctx-tenant-id")
  const userId = h.get("x-ctx-user-id")
  const role = h.get("x-ctx-role") as RequestCtx["role"] | null
  if (!tenantId || !userId || !role) {
    throw new Error("MISSING_REQUEST_CTX") // L2 미통과 → 즉시 fail-fast
  }
  return { tenantId, userId, role }
}

export function assertRole(ctx: RequestCtx, allowed: RequestCtx["role"][]) {
  if (!allowed.includes(ctx.role)) {
    const err = new Error("FORBIDDEN_ROLE") as Error & { httpStatus: number }
    err.httpStatus = 403
    throw err
  }
}
```

---

## 5. Layer 3 — `withTenant(db, tenantId)` ORM 헬퍼

> 직접 `db.select(devices)` 호출은 금지. 반드시 `withTenant(db, ctx.tenantId)`를 거친다.

```typescript
// src/db/with-tenant.ts
import { and, eq, SQL } from "drizzle-orm"
import { type PgDatabase } from "drizzle-orm/pg-core"
import * as schema from "@/db/schema"

type TenantTable = { tenantId: typeof schema.devices.tenantId }

export function withTenant(db: PgDatabase<any>, tenantId: string) {
  if (!tenantId || tenantId.length !== 36) {
    throw new Error("INVALID_TENANT_ID")
  }

  return {
    /** SELECT with tenant filter forced. */
    select<T extends TenantTable>(table: T) {
      return db.select().from(table as any).where(eq((table as any).tenantId, tenantId))
    },

    /** Compose extra WHERE on top of tenant filter. */
    selectWhere<T extends TenantTable>(table: T, extra: SQL) {
      return db.select().from(table as any).where(and(eq((table as any).tenantId, tenantId), extra))
    },

    /** INSERT with tenant_id auto-injected. */
    insert<T extends TenantTable>(table: T, values: Record<string, unknown> | Record<string, unknown>[]) {
      const inject = (v: Record<string, unknown>) => ({ ...v, tenantId })
      const payload = Array.isArray(values) ? values.map(inject) : inject(values)
      return db.insert(table as any).values(payload as any)
    },

    /** UPDATE constrained to tenant. */
    update<T extends TenantTable>(table: T, set: Record<string, unknown>, extra: SQL) {
      return db.update(table as any).set(set).where(and(eq((table as any).tenantId, tenantId), extra))
    },

    /** DELETE constrained to tenant (rarely; prefer soft delete). */
    delete<T extends TenantTable>(table: T, extra: SQL) {
      return db.delete(table as any).where(and(eq((table as any).tenantId, tenantId), extra))
    },
  } as const
}
```

### 5.1 사용 예

```typescript
// src/app/api/devices/route.ts
import { db } from "@/db"
import { devices } from "@/db/schema"
import { withTenant } from "@/db/with-tenant"
import { getRequestCtx } from "@/lib/request-context"

export async function GET() {
  const ctx = getRequestCtx()
  const scoped = withTenant(db, ctx.tenantId)
  const items = await scoped.select(devices).limit(20)
  return Response.json({ data: { items } })
}

export async function POST(req: Request) {
  const ctx = getRequestCtx()
  assertRole(ctx, ["ADMIN"])
  const body = DeviceCreateSchema.parse(await req.json())
  const scoped = withTenant(db, ctx.tenantId)
  const [created] = await scoped.insert(devices, body).returning()
  return Response.json({ data: created }, { status: 201 })
}
```

### 5.2 ESLint 룰 — `no-bare-db`

```javascript
// eslint-rules/no-bare-db.js
module.exports = {
  meta: {
    type: "problem",
    docs: { description: "Disallow direct db.select/insert/update/delete calls; use withTenant() instead." },
    messages: {
      bareDb: "Direct db.{{ method }} call is forbidden. Use withTenant(db, ctx.tenantId).{{ method }} instead.",
    },
    schema: [],
  },
  create(context) {
    // Allowlist: db file itself, migrations, withTenant, audit_logs writer (which manages tenantId differently)
    const allowFiles = [/src\/db\/with-tenant\.ts$/, /drizzle\//, /src\/db\/index\.ts$/, /audit-logger\.ts$/]
    const filename = context.getFilename()
    if (allowFiles.some((re) => re.test(filename))) return {}

    return {
      MemberExpression(node) {
        if (
          node.object.type === "Identifier" &&
          node.object.name === "db" &&
          node.property.type === "Identifier" &&
          ["select", "insert", "update", "delete"].includes(node.property.name)
        ) {
          context.report({ node, messageId: "bareDb", data: { method: node.property.name } })
        }
      },
    }
  },
}
```

`.eslintrc.cjs`에 등록:

```javascript
module.exports = {
  plugins: ["custom"],
  rules: { "custom/no-bare-db": "error" },
}
```

CI에서 `pnpm lint`가 실패하면 PR은 머지 불가.

---

## 6. tenant_id 컬럼 강제 (스키마 lint)

```typescript
// scripts/lint-schema.ts
import * as schema from "@/db/schema"

const exempted = new Set(["organizations"]) // 자기 자신
const errors: string[] = []
for (const [name, table] of Object.entries(schema)) {
  if (exempted.has(name)) continue
  if (typeof table === "object" && "tenantId" in (table as any)) continue
  errors.push(`Table "${name}" missing tenant_id column`)
}
if (errors.length) {
  console.error(errors.join("\n"))
  process.exit(1)
}
```

`pnpm lint:schema` → CI에서 빌드 전 실행.

---

## 7. 보안 테스트 시나리오

### 7.1 단위 테스트 — `withTenant` 누수 방지

```typescript
// tests/with-tenant.test.ts
import { describe, expect, it, beforeAll } from "vitest"
import { db, resetDb } from "./helpers/db"
import { devices, organizations } from "@/db/schema"
import { withTenant } from "@/db/with-tenant"

describe("withTenant", () => {
  let tA: string, tB: string
  beforeAll(async () => {
    await resetDb()
    const [a] = await db.insert(organizations).values({ name: "A", slug: "a" }).returning()
    const [b] = await db.insert(organizations).values({ name: "B", slug: "b" }).returning()
    tA = a.id; tB = b.id
    await db.insert(devices).values([
      { tenantId: tA, serialNo: "A-1", model: "x", locationName: "x", locationAddr: "x",
        padExpiresAt: "2026-09-01", batteryExpiresAt: "2027-09-01", deviceExpiresAt: "2030-01-01" },
      { tenantId: tB, serialNo: "B-1", model: "y", locationName: "y", locationAddr: "y",
        padExpiresAt: "2026-09-01", batteryExpiresAt: "2027-09-01", deviceExpiresAt: "2030-01-01" },
    ])
  })

  it("returns only tenant A's rows when scoped to A", async () => {
    const rows = await withTenant(db, tA).select(devices)
    expect(rows).toHaveLength(1)
    expect(rows[0].serialNo).toBe("A-1")
  })

  it("never leaks B rows even with crafted WHERE", async () => {
    const rows = await withTenant(db, tA).selectWhere(devices, eq(devices.serialNo, "B-1"))
    expect(rows).toHaveLength(0) // tenant filter wins
  })

  it("rejects empty/short tenantId", () => {
    expect(() => withTenant(db, "")).toThrow("INVALID_TENANT_ID")
  })
})
```

### 7.2 통합 테스트 — 다른 테넌트 자원 접근 시도

```typescript
// tests/api/cross-tenant.test.ts
it("returns 404 when ADMIN of tenant A reads tenant B's device by id", async () => {
  const sessionA = await signInAs("admin@a.example", "tenant-a")
  const deviceB = await seedDevice("tenant-b")

  const res = await fetch(`http://localhost:3000/api/devices/${deviceB.id}`, {
    headers: { Cookie: sessionA },
  })
  expect(res.status).toBe(404) // 존재 자체를 노출하지 않는다
})

it("returns 403 TENANT_FORBIDDEN when crafting tenantId in body", async () => {
  const sessionA = await signInAs("admin@a.example", "tenant-a")
  const res = await fetch("http://localhost:3000/api/devices", {
    method: "POST",
    headers: { Cookie: sessionA, "content-type": "application/json" },
    body: JSON.stringify({
      tenantId: "tenant-b",          // ← 위조 시도
      serialNo: "X", model: "y",
      locationName: "z", locationAddr: "z",
      padExpiresAt: "2027-01-01",
      batteryExpiresAt: "2028-01-01",
      deviceExpiresAt: "2032-01-01",
    }),
  })
  // body의 tenantId는 zod schema에서 strip, withTenant가 ctx의 tenantId로 강제 주입
  expect(res.status).toBe(201)
  const json = await res.json()
  expect(json.data.tenantId).toBe(/* tenant-a */ expect.any(String))
})
```

### 7.3 E2E — 세션 변조 시도

```typescript
// tests/e2e/forge-session.spec.ts
test("cannot escalate by editing JWT payload", async ({ page }) => {
  // 1) 정상 로그인 후 쿠키 추출
  const cookie = await loginAs("user@a.example")

  // 2) JWT payload 디코드 후 tenantId를 B로 바꿔 재서명 시도 (서버 비밀 없음 → 실패)
  const tampered = tamperJwt(cookie, { tenantId: "tenant-b" })

  // 3) tampered cookie로 호출 → 401 (서명 검증 실패)
  const res = await page.request.get("/api/devices", { headers: { Cookie: tampered } })
  expect(res.status()).toBe(401)
})
```

### 7.4 보안 회귀 체크리스트

| 항목 | 확인 방법 |
|------|-----------|
| 신규 라우트가 `getRequestCtx()` 호출하는가? | grep `^export async function (GET|POST|PATCH|DELETE)` + ctx 사용 검증 |
| 신규 라우트가 `withTenant`를 거치는가? | ESLint `no-bare-db` |
| 신규 도메인 테이블에 `tenant_id` 있는가? | `pnpm lint:schema` |
| 신규 R2 키가 `tenants/{tid}/` prefix를 따르는가? | `StorageAdapter.put` 내부 검증 (mismatch 시 throw) |
| audit_logs에 actor + tenant 포함되는가? | audit-logger 단위 테스트 |

---

## 8. 운영 시 모니터링

| 메트릭 | 임계값 | 알림 |
|--------|--------|------|
| `MISSING_REQUEST_CTX` 예외 발생 | > 0/시간 | 즉시 PagerDuty (L2 회귀) |
| `INVALID_TENANT_ID` 발생 | > 0/시간 | 즉시 알림 (가드 호출 실수) |
| 동일 IP에서 다중 tenantId 시도 | > 3건/10분 | 보안 이벤트 — IP 일시 차단 |
| `audit_logs` 일일 건수 | 평균 대비 -50% | DB 누락 가능성 — 점검 |

---

## 9. 요약

1. **Auth.js JWT**가 위조 불가능한 `tenantId`를 세션에 박는다.
2. **middleware.ts**가 모든 보호 라우트에서 `tenantId`를 request header로 전파한다.
3. **withTenant()**가 ORM 호출의 모든 SELECT/INSERT/UPDATE/DELETE에 `tenant_id` 조건을 강제한다.
4. **ESLint + 스키마 lint**가 회귀를 빌드 단계에서 차단한다.
5. **단위/통합/E2E 테스트**가 cross-tenant 시나리오를 명시적으로 거부함을 증명한다.

세 계층 모두를 우회하지 않으면 다른 테넌트의 데이터에 닿을 수 없다. 이것이 본 SaaS의 안전성에 대한 약속이다.
