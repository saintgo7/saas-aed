/**
 * Development seed script.
 *
 * Usage: `pnpm seed:dev`
 *
 * Assumes `pnpm db:migrate` has already been run.
 * Idempotent against duplicate (tenant_id, email/serial) by skipping inserts
 * when matching rows already exist.
 */
import { db, schema } from "@/lib/db"
import { eq, and } from "drizzle-orm"

type SeededOrg = { id: string }

async function ensureOrganization(name: string, contactEmail: string): Promise<SeededOrg> {
  const existing = await db
    .select()
    .from(schema.organizations)
    .where(eq(schema.organizations.contactEmail, contactEmail))
    .limit(1)

  if (existing.length > 0) {
    const row = existing[0]!
    return { id: row.id }
  }

  const inserted = await db
    .insert(schema.organizations)
    .values({ name, contactEmail, plan: "STANDARD" })
    .returning({ id: schema.organizations.id })

  const row = inserted[0]
  if (!row) {
    throw new Error("seed-dev: failed to insert organization")
  }
  return { id: row.id }
}

async function ensureUser(
  tenantId: string,
  email: string,
  name: string,
  role: "SYSTEM_ADMIN" | "ADMIN" | "INSPECTOR"
): Promise<void> {
  const existing = await db
    .select()
    .from(schema.users)
    .where(and(eq(schema.users.tenantId, tenantId), eq(schema.users.email, email)))
    .limit(1)

  if (existing.length > 0) {
    return
  }

  await db.insert(schema.users).values({
    tenantId,
    email,
    name,
    role,
    emailVerifiedAt: new Date()
  })
}

async function ensureDevice(
  tenantId: string,
  serial: string,
  data: {
    manufacturer: string
    model: string
    location: string
  }
): Promise<void> {
  const existing = await db
    .select()
    .from(schema.devices)
    .where(and(eq(schema.devices.tenantId, tenantId), eq(schema.devices.serial, serial)))
    .limit(1)

  if (existing.length > 0) {
    return
  }

  const now = new Date()
  const yearsFromNow = (years: number): Date => {
    const d = new Date(now)
    d.setFullYear(d.getFullYear() + years)
    return d
  }

  await db.insert(schema.devices).values({
    tenantId,
    manufacturer: data.manufacturer,
    model: data.model,
    serial,
    manufacturedAt: yearsFromNow(-1),
    purchasedAt: yearsFromNow(-1),
    expiresAt: yearsFromNow(9),
    padReplaceAt: yearsFromNow(2),
    batteryReplaceAt: yearsFromNow(4),
    location: data.location,
    available24h: true
  })
}

async function main(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log("[seed-dev] starting…")

  const org = await ensureOrganization("Demo AED Org", "e8both@gmail.com")
  // eslint-disable-next-line no-console
  console.log(`[seed-dev] organization ready: ${org.id}`)

  await ensureUser(org.id, "system+e8both@gmail.com", "System Admin", "SYSTEM_ADMIN")
  await ensureUser(org.id, "admin+e8both@gmail.com", "Org Admin", "ADMIN")
  await ensureUser(org.id, "inspector1+e8both@gmail.com", "Inspector One", "INSPECTOR")
  await ensureUser(org.id, "inspector2+e8both@gmail.com", "Inspector Two", "INSPECTOR")

  await ensureDevice(org.id, "AED-DEMO-001", {
    manufacturer: "Philips",
    model: "HeartStart FRx",
    location: "본관 1층 로비"
  })
  await ensureDevice(org.id, "AED-DEMO-002", {
    manufacturer: "ZOLL",
    model: "AED Plus",
    location: "본관 2층 휴게실"
  })
  await ensureDevice(org.id, "AED-DEMO-003", {
    manufacturer: "Cu Medical",
    model: "i-PAD CU-SP1",
    location: "별관 1층 출입구"
  })

  // eslint-disable-next-line no-console
  console.log("[seed-dev] done — 1 org, 4 users, 3 devices")
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch((error: unknown) => {
    // eslint-disable-next-line no-console
    console.error("[seed-dev] failed:", error)
    process.exit(1)
  })
