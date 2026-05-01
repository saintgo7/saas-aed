// Local filesystem storage adapter — used in DEMO mode and local dev.
// Writes to /tmp/aed-storage/ and serves via /api/local-storage/[...key].

import { mkdir, writeFile, readFile, unlink } from "node:fs/promises"
import { existsSync } from "node:fs"
import { dirname, join } from "node:path"
import { Buffer } from "node:buffer"
import { createHash } from "node:crypto"
import type { StorageAdapter } from "./index"

const ROOT = "/tmp/aed-storage"

async function toBuffer(body: Buffer | Blob): Promise<Buffer> {
  if (Buffer.isBuffer(body)) return body
  const ab = await body.arrayBuffer()
  return Buffer.from(ab)
}

function sha256Hex(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex")
}

export const localAdapter: StorageAdapter = {
  async upload(key, body, opts) {
    const buffer = await toBuffer(body)
    const sha256 = sha256Hex(buffer)
    const target = join(ROOT, key)
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, buffer)
    if (opts?.contentType) {
      await writeFile(`${target}.contenttype`, opts.contentType)
    }
    const baseUrl = process.env.APP_URL ?? "http://localhost:3000"
    return { url: `${baseUrl}/api/local-storage/${key}`, sha256 }
  },

  async getSignedUrl(key, _expiresInSec) {
    const baseUrl = process.env.APP_URL ?? "http://localhost:3000"
    return `${baseUrl}/api/local-storage/${key}`
  },

  async delete(key) {
    const target = join(ROOT, key)
    if (existsSync(target)) await unlink(target)
  }
}

export async function readLocalObject(key: string): Promise<{ buffer: Buffer; contentType?: string } | null> {
  const target = join(ROOT, key)
  if (!existsSync(target)) return null
  const buffer = await readFile(target)
  let contentType: string | undefined
  const ctPath = `${target}.contenttype`
  if (existsSync(ctPath)) {
    contentType = (await readFile(ctPath, "utf-8")).trim()
  }
  return { buffer, contentType }
}
