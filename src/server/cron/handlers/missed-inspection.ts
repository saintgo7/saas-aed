import { and, eq } from "drizzle-orm"
import { db, schema } from "@/lib/db"
import { isTenantAdminRole } from "@/lib/auth/admin-roles"
import { email } from "@/lib/email"
import MissedInspectionEmail from "@/lib/email/templates/missed-inspection"

interface MissedInspectionResult {
  readonly sent: number
  readonly failed: number
  readonly missingDevices: number
}

function currentYearMonth(now: Date = new Date()): string {
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, "0")
  return `${y}-${m}`
}

/**
 * Runs on the 5th of each month at 09:00 KST.
 * For every device without an inspection in the current YYYY-MM,
 * notifies the tenant's ADMIN users (and optionally INSPECTORs).
 */
export async function checkMissedInspections(): Promise<MissedInspectionResult> {
  const yearMonth = currentYearMonth()
  let sent = 0
  let failed = 0
  let missingDevices = 0

  try {
    const orgs = await db.select().from(schema.organizations)

    for (const org of orgs) {
      const devicesList = await db
        .select()
        .from(schema.devices)
        .where(eq(schema.devices.tenantId, org.id))

      const inspectionsThisMonth = await db
        .select({ deviceId: schema.inspections.deviceId })
        .from(schema.inspections)
        .where(
          and(
            eq(schema.inspections.tenantId, org.id),
            eq(schema.inspections.yearMonth, yearMonth)
          )
        )

      const inspectedSet = new Set(inspectionsThisMonth.map((i) => i.deviceId))
      const missing = devicesList.filter((d) => !inspectedSet.has(d.id))
      if (missing.length === 0) continue
      missingDevices += missing.length

      const users = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.tenantId, org.id))

      const recipients = users.filter(
        (u) => isTenantAdminRole(u.role) || u.role === "INSPECTOR"
      )

      const subject = `[AED 미점검] ${yearMonth} ${missing.length}대 미완료`

      for (const user of recipients) {
        try {
          await email.send({
            to: user.email,
            subject,
            react: MissedInspectionEmail({
              organizationName: org.name,
              userName: user.name,
              yearMonth,
              devices: missing.map((d) => ({
                location: d.location,
                serial: d.serial,
                model: d.model
              }))
            })
          })
          await db.insert(schema.notifications).values({
            tenantId: org.id,
            type: "MISSED_INSPECTION",
            recipient: user.email,
            subject,
            payload: {
              yearMonth,
              missingDeviceIds: missing.map((d) => d.id)
            },
            status: "SENT",
            sentAt: new Date()
          })
          sent += 1
        } catch (error) {
          console.error("[cron] missed-inspection send failed", {
            tenantId: org.id,
            userId: user.id,
            error
          })
          await db.insert(schema.notifications).values({
            tenantId: org.id,
            type: "MISSED_INSPECTION",
            recipient: user.email,
            subject,
            payload: { yearMonth },
            status: "FAILED",
            error: error instanceof Error ? error.message : "unknown"
          })
          failed += 1
        }
      }
    }
  } catch (error) {
    console.error("[cron] missed-inspection batch failed", { error })
  }

  return { sent, failed, missingDevices }
}
