// Resend transactional email adapter.
//
// Required dependencies (already present in package.json):
//   - resend
//   - @react-email/render
//   - @react-email/components

import { Resend } from "resend"
import { render } from "@react-email/render"
import type { EmailAdapter } from "./index"

// ─────────────────────────────────────────
// Environment validation (fail fast at module load)
// ─────────────────────────────────────────
function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Environment variable ${name} is required for Resend email adapter`)
  }
  return value
}

interface ResendConfig {
  apiKey: string
  from: string
  client: Resend
}

let _config: ResendConfig | null = null

function config(): ResendConfig {
  if (_config) return _config
  const apiKey = requireEnv("RESEND_API_KEY")
  const from = requireEnv("RESEND_FROM")
  _config = { apiKey, from, client: new Resend(apiKey) }
  return _config
}

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────
function toAddressList(to: string | readonly string[]): string[] {
  return Array.isArray(to) ? [...to] : [to as string]
}

// ─────────────────────────────────────────
// Adapter
// ─────────────────────────────────────────
export const resendAdapter: EmailAdapter = {
  async send(opts) {
    const { to, subject, react, attachments } = opts
    const c = config()

    const html = await render(react)
    const text = await render(react, { plainText: true })

    try {
      const { data, error } = await c.client.emails.send({
        from: c.from,
        to: toAddressList(to),
        subject,
        html,
        text,
        attachments: attachments?.map((a) => ({
          filename: a.filename,
          content: a.content,
          contentType: a.contentType
        }))
      })

      if (error) {
        console.error("[resend] send failed", { subject, error })
        throw new Error(`Resend send failed: ${error.message ?? "unknown error"}`)
      }

      if (!data?.id) {
        throw new Error("Resend send returned no message id")
      }

      return { id: data.id }
    } catch (error) {
      if (error instanceof Error) throw error
      console.error("[resend] send threw non-Error", { error })
      throw new Error("Resend send failed: unknown error")
    }
  }
}
