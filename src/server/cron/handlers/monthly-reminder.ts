import { eq } from "drizzle-orm"
import { db, schema } from "@/lib/db"
import { isTenantAdminRole } from "@/lib/auth/admin-roles"
import { email } from "@/lib/email"
import MonthlyReminderEmail from "@/lib/email/templates/monthly-reminder"

interface MonthlyReminderResult {
  readonly sent: number
  readonly failed: number
}

function currentYearMonth(now: Date = new Date()): string {
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, "0")
  return `${y}-${m}`
}

/**
 * Sends MONTHLY_REMINDER emails to every active INSPECTOR in every organization.
 * Runs on the 1st of each month at 09:00 KST.
 */
export async function sendMonthlyReminders(): Promise<MonthlyReminderResult> {
  const yearMonth = currentYearMonth()
  let sent = 0
  let failed = 0

  try {
    const orgs = await db.select().from(schema.organizations)

    for (const org of orgs) {
      const inspectors = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.tenantId, org.id))

      const targets = inspectors.filter(
        (u) => u.role === "INSPECTOR" || isTenantAdminRole(u.role)
      )

      for (const user of targets) {
        const subject = `[AED 점검 알림] ${yearMonth} 점검을 시작해 주세요`
        try {
          await email.send({
            to: user.email,
            subject,
            react: MonthlyReminderEmail({
              organizationName: org.name,
              userName: user.name,
              yearMonth
            })
          })
          await db.insert(schema.notifications).values({
            tenantId: org.id,
            type: "MONTHLY_REMINDER",
            recipient: user.email,
            subject,
            payload: { yearMonth, userId: user.id },
            status: "SENT",
            sentAt: new Date()
          })
          sent += 1
        } catch (error) {
          console.error("[cron] monthly reminder send failed", {
            tenantId: org.id,
            userId: user.id,
            error
          })
          await db.insert(schema.notifications).values({
            tenantId: org.id,
            type: "MONTHLY_REMINDER",
            recipient: user.email,
            subject,
            payload: { yearMonth, userId: user.id },
            status: "FAILED",
            error: error instanceof Error ? error.message : "unknown"
          })
          failed += 1
        }
      }
    }
  } catch (error) {
    console.error("[cron] monthly reminder batch failed", { error })
  }

  return { sent, failed }
}
