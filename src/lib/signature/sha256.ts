import crypto from "node:crypto"
import { Buffer } from "node:buffer"

const PNG_DATA_URL_PREFIX = "data:image/png;base64,"

/**
 * Computes the SHA-256 digest (hex) of a Buffer.
 * Pure function — does not mutate input.
 */
export function sha256OfBuffer(buf: Buffer): string {
  return crypto.createHash("sha256").update(buf).digest("hex")
}

/**
 * Decodes a base64 PNG data URL and returns its raw Buffer + SHA-256 digest.
 * Expected format: "data:image/png;base64,<base64>".
 *
 * Throws when the prefix is missing or the payload is empty so callers can
 * surface a clear validation error instead of corrupting storage.
 */
export function sha256OfBase64Png(dataUrl: string): { buffer: Buffer; sha256: string } {
  if (!dataUrl.startsWith(PNG_DATA_URL_PREFIX)) {
    throw new Error("Invalid signature data URL: expected 'data:image/png;base64,' prefix")
  }
  const base64 = dataUrl.slice(PNG_DATA_URL_PREFIX.length)
  if (base64.length === 0) {
    throw new Error("Invalid signature data URL: empty payload")
  }
  const buffer = Buffer.from(base64, "base64")
  if (buffer.length === 0) {
    throw new Error("Invalid signature data URL: decoded buffer is empty")
  }
  return { buffer, sha256: sha256OfBuffer(buffer) }
}
