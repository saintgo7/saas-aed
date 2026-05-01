import type { ReactElement } from "react"
import { resendAdapter } from "./resend"
import { consoleAdapter } from "./console"

export interface EmailAttachment {
  readonly filename: string
  readonly content: Buffer
  readonly contentType?: string
}

export interface EmailSendOptions {
  readonly to: string | readonly string[]
  readonly subject: string
  readonly react: ReactElement
  readonly attachments?: readonly EmailAttachment[]
}

export interface EmailAdapter {
  send(opts: EmailSendOptions): Promise<{ id: string }>
}

export { resendAdapter, consoleAdapter }

const useConsole =
  process.env.DEMO_MODE === "true" ||
  process.env.EMAIL_DRIVER === "console" ||
  !process.env.RESEND_API_KEY ||
  process.env.RESEND_API_KEY.startsWith("re_dev")

export const email: EmailAdapter = useConsole ? consoleAdapter : resendAdapter
