import { and, eq, gte, lte } from "drizzle-orm"
import { db, schema } from "@/lib/db"
import { tenantAdminRoleFilter } from "@/lib/auth/admin-roles"
import { email } from "@/lib/email"
import PadExpiryEmail from "@/lib/email/templates/pad-expiry"

interface PadExpiryResult {
  readonly sent: number
  readonly failed: number
  readonly d30: number
  readonly d7: number
}

function startOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d.getTime())
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

type Severity = "D30" | "D7"

/**
 * Daily sweep at 09:00 KST.
 * Sends PAD_EXPIRY_D30 / PAD_EXPIRY_D7 emails to ADMINs whose devices
 * have a pad replacement scheduled exactly 30 or 7 days from today.
 */
export async function padExpirySweep(): Promise<PadExpiryResult> {
  const today = startOfDay(new Date())
  let sent = 0
  let failed = 0
  let d30 = 0
  let d7 = 0

  for (const severity of ["D30", "D7"] as readonly Severity[]) {
    const offset = severity === "D30" ? 30 : 7
    const dayStart = addDays(today, offset)
    const dayEnd = addDays(dayStart, 1)

    try {
      const candidates = await db
        .select()
        .from(schema.devices)
        .where(
          and(
            gte(schema.devices.padReplaceAt, dayStart),
            lte(schema.devices.padReplaceAt, dayEnd)
          )
        )

      if (severity === "D30") d30 = candidates.length
      else d7 = candidates.length

      for (const device of candidates) {
        const admins = await db
          .select()
          .from(schema.users)
          .where(
            and(
              eq(schema.users.tenantId, device.tenantId),
              tenantAdminRoleFilter()
            )
          )

        const subject =
          severity === "D7"
            ? `[AED 패드 교체 임박 D-7] ${device.location}`
            : `[AED 패드 교체 안내 D-30] ${device.location}`

        for (const admin of admins) {
          try {
            await email.send({
              to: admin.email,
              subject,
              react: PadExpiryEmail({
                userName: admin.name,
                deviceLocation: device.location,
                deviceSerial: device.serial,
                padReplaceAt: device.padReplaceAt,
                severity
              })
            })
            await db.insert(schema.notifications).values({
              tenantId: device.tenantId,
              type: severity === "D7" ? "PAD_EXPIRY_D7" : "PAD_EXPIRY_D30",
              recipient: admin.email,
              subject,
              payload: { deviceId: device.id },
              status: "SENT",
              sentAt: new Date()
            })
            sent += 1
          } catch (error) {
            console.error("[cron] pad-expiry send failed", {
              deviceId: device.id,
              severity,
              error
            })
            await db.insert(schema.notifications).values({
              tenantId: device.tenantId,
              type: severity === "D7" ? "PAD_EXPIRY_D7" : "PAD_EXPIRY_D30",
              recipient: admin.email,
              subject,
              payload: { deviceId: device.id },
              status: "FAILED",
              error: error instanceof Error ? error.message : "unknown"
            })
            failed += 1
          }
        }
      }
    } catch (error) {
      console.error("[cron] pad-expiry sweep failed", { severity, error })
    }
  }

  return { sent, failed, d30, d7 }
}
