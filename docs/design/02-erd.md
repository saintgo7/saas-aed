# 02. 데이터 모델 (ERD)

> Drizzle ORM + PostgreSQL 16 기준. 8개 핵심 테이블, 모든 도메인 테이블에 `tenant_id`를 포함하며 복합 인덱스로 격리한다.

---

## 1. ERD 개요

```mermaid
erDiagram
  organizations ||--o{ users : "has"
  organizations ||--o{ devices : "owns"
  organizations ||--o{ inspections : "scopes"
  organizations ||--o{ notifications : "scopes"
  organizations ||--o{ audit_logs : "scopes"
  organizations ||--o{ magic_link_tokens : "scopes"

  users ||--o{ inspections : "performs"
  users ||--o{ device_managers : "assigned"
  users ||--o{ audit_logs : "actor"
  users ||--o{ magic_link_tokens : "requests"

  devices ||--o{ device_managers : "managed_by"
  devices ||--o{ inspections : "inspected"
  devices ||--o{ notifications : "subjected"

  organizations {
    uuid id PK
    text name
    text slug UK
    text plan
    timestamptz created_at
    timestamptz deleted_at
  }
  users {
    uuid id PK
    uuid tenant_id FK
    text email UK
    text name
    text role "ADMIN_INSPECTOR"
    timestamptz last_login_at
    timestamptz created_at
  }
  devices {
    uuid id PK
    uuid tenant_id FK
    text serial_no
    text model
    text location_name
    text location_addr
    date pad_expires_at
    date battery_expires_at
    date device_expires_at
    timestamptz created_at
    timestamptz deleted_at
  }
  device_managers {
    uuid device_id PK_FK
    uuid user_id PK_FK
    uuid tenant_id FK
    text role "PRIMARY_BACKUP"
    timestamptz assigned_at
  }
  inspections {
    uuid id PK
    uuid tenant_id FK
    uuid device_id FK
    uuid inspector_id FK
    text status "DRAFT_SIGNED_SENT_FAILED"
    jsonb checklist
    text memo
    text signature_hash
    text signature_url
    text r2_docx_key
    text r2_pdf_key
    timestamptz signed_at
    timestamptz sent_at
    timestamptz inspected_at
    timestamptz created_at
  }
  notifications {
    uuid id PK
    uuid tenant_id FK
    uuid device_id FK_NULL
    text type
    text status "PENDING_SENT_FAILED"
    jsonb payload
    timestamptz scheduled_for
    timestamptz sent_at
    int attempts
  }
  audit_logs {
    uuid id PK
    uuid tenant_id FK
    uuid actor_id FK_NULL
    text action
    text entity_type
    uuid entity_id
    jsonb diff
    text ip
    timestamptz created_at
  }
  magic_link_tokens {
    uuid id PK
    uuid tenant_id FK
    uuid user_id FK
    text token_hash UK
    timestamptz expires_at
    timestamptz used_at
  }
```

---

## 2. Drizzle 스키마 (TypeScript)

> 파일 위치: `src/db/schema/*.ts`

### 2.1 organizations

```typescript
// src/db/schema/organizations.ts
import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core"

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    plan: text("plan", { enum: ["FREE", "PRO", "ENT"] }).notNull().default("FREE"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => ({
    slugIdx: index("org_slug_idx").on(t.slug),
  })
)
```

### 2.2 users

```typescript
// src/db/schema/users.ts
import { pgTable, uuid, text, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core"
import { organizations } from "./organizations"

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    name: text("name").notNull(),
    role: text("role", { enum: ["ADMIN", "INSPECTOR"] }).notNull().default("INSPECTOR"),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    // 같은 이메일이라도 tenant가 다르면 별개 계정 (multi-tenant 원칙)
    tenantEmailUq: uniqueIndex("users_tenant_email_uq").on(t.tenantId, t.email),
    tenantRoleIdx: index("users_tenant_role_idx").on(t.tenantId, t.role),
  })
)
```

### 2.3 devices

```typescript
// src/db/schema/devices.ts
import { pgTable, uuid, text, date, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core"
import { organizations } from "./organizations"

export const devices = pgTable(
  "devices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    serialNo: text("serial_no").notNull(),
    model: text("model").notNull(),
    locationName: text("location_name").notNull(),
    locationAddr: text("location_addr").notNull(),
    padExpiresAt: date("pad_expires_at").notNull(),
    batteryExpiresAt: date("battery_expires_at").notNull(),
    deviceExpiresAt: date("device_expires_at").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => ({
    tenantSerialUq: uniqueIndex("devices_tenant_serial_uq").on(t.tenantId, t.serialNo),
    tenantPadIdx: index("devices_tenant_pad_idx").on(t.tenantId, t.padExpiresAt),
    tenantDeviceExpIdx: index("devices_tenant_device_exp_idx").on(t.tenantId, t.deviceExpiresAt),
  })
)
```

### 2.4 device_managers (M:N)

```typescript
// src/db/schema/device-managers.ts
import { pgTable, uuid, text, timestamp, primaryKey, index } from "drizzle-orm/pg-core"
import { devices } from "./devices"
import { users } from "./users"
import { organizations } from "./organizations"

export const deviceManagers = pgTable(
  "device_managers",
  {
    deviceId: uuid("device_id").notNull().references(() => devices.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["PRIMARY", "BACKUP"] }).notNull().default("PRIMARY"),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.deviceId, t.userId] }),
    tenantUserIdx: index("dm_tenant_user_idx").on(t.tenantId, t.userId),
  })
)
```

### 2.5 inspections

```typescript
// src/db/schema/inspections.ts
import { pgTable, uuid, text, jsonb, timestamp, index } from "drizzle-orm/pg-core"
import { organizations } from "./organizations"
import { devices } from "./devices"
import { users } from "./users"

// 12-item checklist key
export type ChecklistKey =
  | "OP_POWER" | "OP_PAD" | "OP_BATTERY"
  | "BX_ALARM" | "BX_GUIDE" | "BX_EMG" | "BX_CPR" | "BX_EXP"
  | "LOC_ENT" | "LOC_DIR"
  | "DOC_FILE" | "TIME_24"

export type Checklist = Record<ChecklistKey, "OK" | "NG" | "NA">

export const inspections = pgTable(
  "inspections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    deviceId: uuid("device_id").notNull().references(() => devices.id, { onDelete: "restrict" }),
    inspectorId: uuid("inspector_id").notNull().references(() => users.id, { onDelete: "restrict" }),
    status: text("status", { enum: ["DRAFT", "SIGNED", "SENT", "FAILED"] }).notNull().default("DRAFT"),
    checklist: jsonb("checklist").$type<Checklist>().notNull(),
    memo: text("memo"),
    signatureHash: text("signature_hash"),
    signatureUrl: text("signature_url"),
    r2DocxKey: text("r2_docx_key"),
    r2PdfKey: text("r2_pdf_key"),
    inspectedAt: timestamp("inspected_at", { withTimezone: true }).notNull().defaultNow(),
    signedAt: timestamp("signed_at", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantDeviceIdx: index("ins_tenant_device_idx").on(t.tenantId, t.deviceId),
    tenantInspectedIdx: index("ins_tenant_inspected_idx").on(t.tenantId, t.inspectedAt),
    tenantStatusIdx: index("ins_tenant_status_idx").on(t.tenantId, t.status),
  })
)
```

### 2.6 notifications

```typescript
// src/db/schema/notifications.ts
import { pgTable, uuid, text, jsonb, timestamp, integer, index } from "drizzle-orm/pg-core"
import { organizations } from "./organizations"
import { devices } from "./devices"

export type NotificationType =
  | "MONTHLY_REMIND"     // 매월 1일
  | "MONTHLY_OVERDUE"    // 매월 5일 미점검 경고
  | "PAD_D30"            // 패드 만료 D-30
  | "PAD_D7"             // 패드 만료 D-7
  | "DEVICE_D90"         // 본체 만료 D-90
  | "INSPECTION_DONE"    // 점검 완료 즉시

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    deviceId: uuid("device_id").references(() => devices.id, { onDelete: "set null" }),
    type: text("type").$type<NotificationType>().notNull(),
    status: text("status", { enum: ["PENDING", "SENT", "FAILED"] }).notNull().default("PENDING"),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    attempts: integer("attempts").notNull().default(0),
  },
  (t) => ({
    tenantSchedIdx: index("noti_tenant_sched_idx").on(t.tenantId, t.scheduledFor),
    tenantStatusIdx: index("noti_tenant_status_idx").on(t.tenantId, t.status),
    tenantTypeIdx: index("noti_tenant_type_idx").on(t.tenantId, t.type),
  })
)
```

### 2.7 audit_logs

```typescript
// src/db/schema/audit-logs.ts
import { pgTable, uuid, text, jsonb, timestamp, index } from "drizzle-orm/pg-core"
import { organizations } from "./organizations"
import { users } from "./users"

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),       // e.g. "INSPECTION_SIGNED"
    entityType: text("entity_type").notNull(), // e.g. "inspection"
    entityId: uuid("entity_id").notNull(),
    diff: jsonb("diff").$type<{ before?: unknown; after?: unknown }>(),
    ip: text("ip"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantCreatedIdx: index("audit_tenant_created_idx").on(t.tenantId, t.createdAt),
    tenantEntityIdx: index("audit_tenant_entity_idx").on(t.tenantId, t.entityType, t.entityId),
  })
)
```

### 2.8 magic_link_tokens

```typescript
// src/db/schema/magic-link-tokens.ts
import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core"
import { organizations } from "./organizations"
import { users } from "./users"

export const magicLinkTokens = pgTable(
  "magic_link_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(), // SHA256 of opaque token
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
  },
  (t) => ({
    tenantUserIdx: index("mlt_tenant_user_idx").on(t.tenantId, t.userId),
    expiresIdx: index("mlt_expires_idx").on(t.expiresAt),
  })
)
```

---

## 3. 인덱스 전략 (요약)

| 테이블 | 핵심 복합 인덱스 | 용도 |
|--------|-------------------|------|
| `users` | `(tenant_id, email)` UNIQUE | 로그인 조회, 다기관 동일 이메일 허용 |
| `devices` | `(tenant_id, serial_no)` UNIQUE | 시리얼 중복 방지(테넌트 단위) |
| `devices` | `(tenant_id, pad_expires_at)` | D-30/D-7 알림 스캔 |
| `devices` | `(tenant_id, device_expires_at)` | D-90 알림 스캔 |
| `inspections` | `(tenant_id, device_id)` | 기기별 이력 조회 |
| `inspections` | `(tenant_id, inspected_at)` | 월간 점검 현황 |
| `inspections` | `(tenant_id, status)` | 미서명/미발송 큐 |
| `notifications` | `(tenant_id, scheduled_for)` | 워커가 due 잡 스캔 |
| `audit_logs` | `(tenant_id, created_at)` | 감사 타임라인 |
| `audit_logs` | `(tenant_id, entity_type, entity_id)` | 특정 레코드 변경사 |

> 모든 도메인 테이블은 첫 번째 인덱스 컬럼이 `tenant_id`이다. 이는 [04-tenant-isolation.md](./04-tenant-isolation.md)의 ORM 가드와 짝을 이루어 누수 시에도 인덱스 효율을 보장한다.

---

## 4. 마이그레이션 순서

```bash
# drizzle/0000_init.sql
# 1) 종속성 없는 루트
organizations

# 2) tenant 참조하는 1차 테이블
users
devices
magic_link_tokens

# 3) 2단계 종속
device_managers   # devices + users
inspections       # devices + users
notifications     # devices
audit_logs        # users
```

생성 명령:

```bash
pnpm drizzle-kit generate    # SQL diff 생성
pnpm drizzle-kit migrate     # 적용 (CI에서 staging 먼저, prod는 수동 승인)
```

---

## 5. 시드 데이터 예시

```typescript
// scripts/seed.ts
import { db } from "@/db"
import { organizations, users, devices } from "@/db/schema"

await db.transaction(async (tx) => {
  const [org] = await tx.insert(organizations).values({
    name: "삼성서울병원",
    slug: "smc",
    plan: "PRO",
  }).returning()

  const [admin] = await tx.insert(users).values({
    tenantId: org.id,
    email: "admin@smc.example",
    name: "관리자",
    role: "ADMIN",
  }).returning()

  await tx.insert(devices).values([
    {
      tenantId: org.id,
      serialNo: "AED-001",
      model: "Philips HeartStart FRx",
      locationName: "본관 1층 로비",
      locationAddr: "서울시 강남구 일원로 81 본관 1F",
      padExpiresAt: "2026-09-01",
      batteryExpiresAt: "2027-03-01",
      deviceExpiresAt: "2030-01-01",
    },
  ])
})
```

---

## 6. 데이터 보존 정책

| 테이블 | 보존 기간 | 삭제 방식 |
|--------|-----------|-----------|
| `inspections` + R2 객체 | 7년 (의료기기법 권고) | soft delete (`status` 유지) + R2 lifecycle 만료 |
| `audit_logs` | 7년 | append-only, 절대 삭제 금지 |
| `notifications` | 1년 | 월간 cron으로 SENT/FAILED 1년 초과분 hard delete |
| `magic_link_tokens` | 30일 | `expires_at` 기준 일 1회 cron 정리 |
| `users.deleted_at` | 영구 (soft) | 익명화: `email` → `deleted+{id}@example`, `name` → `(삭제됨)` |

ERD가 정해졌으니 다음은 [03-api-spec.md](./03-api-spec.md)에서 이 데이터에 접근하는 12개 엔드포인트를 정의한다.
