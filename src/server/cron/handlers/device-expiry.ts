import { and, eq, gte, lte } from "drizzle-orm"
import { db, schema } from "@/lib/db"
import { tenantAdminRoleFilter } from "@/lib/auth/admin-roles"
import { email } from "@/lib/email"
import PadExpiryEmail from "@/lib/email/templates/pad-expiry"

interface DeviceExpiryResult {
  readonly sent: number
  readonly failed: number
  readonly devices: number
}

function startOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d.getTime())
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

/**
 * Daily sweep at 09:05 KST.
 * Sends DEVICE_EXPIRY_D90 emails to ADMINs whose devices reach
 * end-of-life exactly 90 days from today.
 *
 * Reuses the PadExpiryEmail template wording (severity: "D90") because
 * a dedicated device-expiry template is not yet in the design.
 */
export async function deviceExpirySweep(): Promise<DeviceExpiryResult> {
  const today = startOfDay(new Date())
  const dayStart = addDays(today, 90)
  const dayEnd = addDays(dayStart, 1)

  let sent = 0
  let failed = 0
  let deviceCount = 0

  try {
    const candidates = await db
      .select()
      .from(schema.devices)
      .where(
        and(
          gte(schema.devices.expiresAt, dayStart),
          lte(schema.devices.expiresAt, dayEnd)
        )
      )

    deviceCount = candidates.length

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

      const subject = `[AED 본체 만료 임박 D-90] ${device.location}`

      for (const admin of admins) {
        try {
          await email.send({
            to: admin.email,
            subject,
            react: PadExpiryEmail({
              userName: admin.name,
              deviceLocation: device.location,
              deviceSerial: device.serial,
              padReplaceAt: device.expiresAt,
              severity: "D90"
            })
          })
          await db.insert(schema.notifications).values({
            tenantId: device.tenantId,
            type: "DEVICE_EXPIRY_D90",
            recipient: admin.email,
            subject,
            payload: { deviceId: device.id },
            status: "SENT",
            sentAt: new Date()
          })
          sent += 1
        } catch (error) {
          console.error("[cron] device-expiry send failed", {
            deviceId: device.id,
            error
          })
          await db.insert(schema.notifications).values({
            tenantId: device.tenantId,
            type: "DEVICE_EXPIRY_D90",
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
    console.error("[cron] device-expiry sweep failed", { error })
  }

  return { sent, failed, devices: deviceCount }
}
