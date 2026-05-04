/**
 * CNU pilot seed.
 *
 * Usage: `pnpm seed:cnu`
 *
 * Reads:
 *   seeds/cnu/departments.csv  (28 rows, fixed)
 *   seeds/cnu/users.csv        (template; rows with empty email are skipped)
 *
 * Idempotent — re-runs only insert missing rows.
 */
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { db, schema } from "@/lib/db"
import { and, eq } from "drizzle-orm"

type DeptRow = { code: string; name: string; deviceQuota: number; isHq: boolean }
type UserRow = { deptCode: string; role: string; name: string; email: string; phone: string }

const TENANT_SLUG = "cnu"
const TENANT_NAME = "충남대학교"
const TENANT_CONTACT = "safety@cnu.ac.kr"

function parseCsv(path: string): Record<string, string>[] {
  const raw = readFileSync(path, "utf8").trim()
  const [header, ...lines] = raw.split(/\r?\n/)
  if (!header) {
    return []
  }
  const cols = header.split(",")
  return lines.map((line) => {
    const cells = line.split(",")
    return Object.fromEntries(cols.map((c, i) => [c, cells[i] ?? ""]))
  })
}

async function ensureTenant(): Promise<string> {
  const existing = await db
    .select()
    .from(schema.organizations)
    .where(eq(schema.organizations.slug, TENANT_SLUG))
    .limit(1)
  if (existing.length > 0) {
    return existing[0]!.id
  }
  const inserted = await db
    .insert(schema.organizations)
    .values({ slug: TENANT_SLUG, name: TENANT_NAME, contactEmail: TENANT_CONTACT, plan: "STANDARD" })
    .returning({ id: schema.organizations.id })
  const row = inserted[0]
  if (!row) {
    throw new Error("seed-cnu: failed to insert tenant")
  }
  return row.id
}

async function ensureDepartment(tenantId: string, idx: number, row: DeptRow): Promise<string> {
  const existing = await db
    .select()
    .from(schema.departments)
    .where(and(eq(schema.departments.tenantId, tenantId), eq(schema.departments.code, row.code)))
    .limit(1)
  if (existing.length > 0) {
    return existing[0]!.id
  }
  const inserted = await db
    .insert(schema.departments)
    .values({
      tenantId,
      code: row.code,
      name: row.name,
      deviceQuota: row.deviceQuota,
      isHq: row.isHq,
      sortOrder: idx + 1
    })
    .returning({ id: schema.departments.id })
  const r = inserted[0]
  if (!r) {
    throw new Error(`seed-cnu: failed to insert department ${row.code}`)
  }
  return r.id
}

async function ensureUser(
  tenantId: string,
  departmentId: string | null,
  row: UserRow
): Promise<string | null> {
  if (!row.email || !row.name) {
    return null
  }
  const validRoles = ["SUPER_ADMIN", "HQ_ADMIN", "DEPT_MANAGER", "INSPECTOR"] as const
  type ValidRole = (typeof validRoles)[number]
  if (!(validRoles as readonly string[]).includes(row.role)) {
    throw new Error(`seed-cnu: invalid role "${row.role}" for ${row.email}`)
  }
  const role = row.role as ValidRole

  const existing = await db
    .select()
    .from(schema.users)
    .where(and(eq(schema.users.tenantId, tenantId), eq(schema.users.email, row.email)))
    .limit(1)
  if (existing.length > 0) {
    return existing[0]!.id
  }
  const inserted = await db
    .insert(schema.users)
    .values({
      tenantId,
      departmentId,
      email: row.email,
      name: row.name,
      phone: row.phone || null,
      role,
      emailVerifiedAt: new Date()
    })
    .returning({ id: schema.users.id })
  return inserted[0]?.id ?? null
}

async function main(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log("[seed-cnu] starting…")

  const root = resolve(process.cwd(), "seeds/cnu")
  const deptRows = parseCsv(resolve(root, "departments.csv")).map((r) => ({
    code: r.code!,
    name: r.name!,
    deviceQuota: Number(r.deviceQuota ?? "0"),
    isHq: r.isHq === "true"
  }))
  const userRows = parseCsv(resolve(root, "users.csv")).map((r) => ({
    deptCode: r.deptCode ?? "",
    role: r.role ?? "",
    name: r.name ?? "",
    email: r.email ?? "",
    phone: r.phone ?? ""
  }))

  const tenantId = await ensureTenant()
  // eslint-disable-next-line no-console
  console.log(`[seed-cnu] tenant cnu → ${tenantId}`)

  const deptIdByCode = new Map<string, string>()
  for (let i = 0; i < deptRows.length; i++) {
    const row = deptRows[i]!
    const id = await ensureDepartment(tenantId, i, row)
    deptIdByCode.set(row.code, id)
  }
  // eslint-disable-next-line no-console
  console.log(`[seed-cnu] departments ready (${deptIdByCode.size})`)

  let userCount = 0
  let skipped = 0
  for (const row of userRows) {
    if (!row.email) {
      skipped += 1
      continue
    }
    const departmentId = row.deptCode ? deptIdByCode.get(row.deptCode) ?? null : null
    const userId = await ensureUser(tenantId, departmentId, row)
    if (userId) {
      userCount += 1
      // Wire department.managerUserId for DEPT_MANAGER / HQ_ADMIN with own dept
      if (departmentId && (row.role === "DEPT_MANAGER" || row.role === "HQ_ADMIN")) {
        await db
          .update(schema.departments)
          .set({ managerUserId: userId })
          .where(eq(schema.departments.id, departmentId))
      }
    }
  }
  // eslint-disable-next-line no-console
  console.log(`[seed-cnu] users seeded: ${userCount}, skipped (empty rows): ${skipped}`)

  const totalQuota = deptRows.reduce((sum, r) => sum + r.deviceQuota, 0)
  // eslint-disable-next-line no-console
  console.log(`[seed-cnu] done — tenant=cnu, depts=${deptRows.length}, deviceQuota total=${totalQuota}`)
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch((error: unknown) => {
    // eslint-disable-next-line no-console
    console.error("[seed-cnu] failed:", error)
    process.exit(1)
  })
