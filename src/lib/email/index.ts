import type { ReactElement } from "react"
import { resendAdapter } from "./resend"

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

export { resendAdapter }

export const email: EmailAdapter = resendAdapter
