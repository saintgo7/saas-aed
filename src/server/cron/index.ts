/**
 * Cron worker — runs as a separate Docker service.
 * Replaces Vercel Cron with self-hosted node-cron.
 *
 * Schedules (Asia/Seoul):
 * - Monthly reminder      : 0 9 1 * *      (every 1st of month, 09:00)
 * - Missed inspection chk : 0 9 5 * *      (every 5th of month, 09:00)
 * - Pad expiry sweep      : 0 9 * * *      (every day, 09:00)
 * - Device expiry sweep   : 5 9 * * *      (every day, 09:05)
 * - Backup trigger        : 0 2 * * *      (every day, 02:00)
 */
import cron from "node-cron"
import { sendMonthlyReminders } from "./handlers/monthly-reminder"
import { checkMissedInspections } from "./handlers/missed-inspection"
import { padExpirySweep } from "./handlers/pad-expiry"
import { deviceExpirySweep } from "./handlers/device-expiry"

const tz = process.env.CRON_TIMEZONE ?? "Asia/Seoul"
const enabled = process.env.CRON_ENABLED === "true"

if (!enabled) {
  console.warn("[cron] CRON_ENABLED is not 'true' — exiting")
  process.exit(0)
}

console.log(`[cron] starting (timezone=${tz})`)

cron.schedule("0 9 1 * *", async () => {
  console.log("[cron] monthly reminder triggered")
  try {
    const result = await sendMonthlyReminders()
    console.log("[cron] monthly reminder done", result)
  } catch (error) {
    console.error("[cron] monthly reminder failed", error)
  }
}, { timezone: tz })

cron.schedule("0 9 5 * *", async () => {
  console.log("[cron] missed inspection check triggered")
  try {
    const result = await checkMissedInspections()
    console.log("[cron] missed inspection check done", result)
  } catch (error) {
    console.error("[cron] missed inspection check failed", error)
  }
}, { timezone: tz })

cron.schedule("0 9 * * *", async () => {
  console.log("[cron] pad expiry sweep triggered")
  try {
    const result = await padExpirySweep()
    console.log("[cron] pad expiry sweep done", result)
  } catch (error) {
    console.error("[cron] pad expiry sweep failed", error)
  }
}, { timezone: tz })

cron.schedule("5 9 * * *", async () => {
  console.log("[cron] device expiry sweep triggered")
  try {
    const result = await deviceExpirySweep()
    console.log("[cron] device expiry sweep done", result)
  } catch (error) {
    console.error("[cron] device expiry sweep failed", error)
  }
}, { timezone: tz })

console.log("[cron] all schedules registered — staying alive")

process.on("SIGTERM", () => {
  console.log("[cron] SIGTERM received — shutting down")
  process.exit(0)
})
