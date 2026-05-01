// Console email adapter — DEMO mode stub. Logs the email to stdout instead of sending.
import { render } from "@react-email/render"
import type { EmailAdapter } from "./index"

export const consoleAdapter: EmailAdapter = {
  async send(opts) {
    const { to, subject, react, attachments } = opts
    let preview = ""
    try {
      const text = await render(react, { plainText: true })
      preview = text.split("\n").slice(0, 8).join("\n")
    } catch {
      preview = "(render preview failed)"
    }

    const id = `console-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    console.log("\n" + "═".repeat(72))
    console.log("[email/console] DEMO mode — email not sent, logged only")
    console.log(`  to:      ${Array.isArray(to) ? to.join(", ") : to}`)
    console.log(`  subject: ${subject}`)
    if (attachments && attachments.length > 0) {
      console.log(`  attachments: ${attachments.map((a) => `${a.filename} (${a.content.byteLength}b)`).join(", ")}`)
    }
    console.log("─".repeat(72))
    console.log(preview)
    console.log("═".repeat(72) + "\n")

    return { id }
  }
}
