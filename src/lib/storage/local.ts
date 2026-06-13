// Local filesystem storage adapter — used in DEMO mode and local dev.
// Writes to /tmp/aed-storage/ and serves via /api/local-storage/[...key].

import { mkdir, writeFile, readFile, unlink } from "node:fs/promises"
import { existsSync, realpathSync } from "node:fs"
import { dirname, resolve, sep } from "node:path"
import { Buffer } from "node:buffer"
import { createHash } from "node:crypto"
import type { StorageAdapter } from "./index"

const ROOT = "/tmp/aed-storage"

function isWithinRoot(absPath: string): boolean {
  const root = resolve(ROOT)
  return absPath === root || absPath.startsWith(root + sep)
}

/**
 * Resolve a storage key to an absolute path, refusing any key that escapes
 * ROOT (e.g. `../../etc/passwd`). The read path is reachable unauthenticated
 * via /api/local-storage/[...key], so traversal must be blocked here.
 * Returns null when the key would resolve outside ROOT (lexically).
 */
export function resolveWithinRoot(key: string): string | null {
  const target = resolve(ROOT, key)
  if (!isWithinRoot(target)) return null
  return target
}

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
    const target = resolveWithinRoot(key)
    if (!target) throw new Error("INVALID_STORAGE_KEY")
    const buffer = await toBuffer(body)
    const sha256 = sha256Hex(buffer)
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, buffer)
    if (opts?.contentType) {
      await writeFile(`${target}.contenttype`, opts.contentType)
    }
    // Relative URL — same-origin, port-agnostic. Browsers and Next.js
    // NextResponse.redirect both accept this.
    return { url: `/api/local-storage/${key}`, sha256 }
  },

  async getSignedUrl(key, _expiresInSec) {
    return `/api/local-storage/${key}`
  },

  async delete(key) {
    const target = resolveWithinRoot(key)
    if (!target) return
    if (existsSync(target)) await unlink(target)
  }
}

/**
 * Returns the symlink-resolved real path if it exists and stays within ROOT,
 * else null. Guards against symlinks planted under ROOT that point outside it.
 */
function realPathWithinRoot(target: string): string | null {
  if (!existsSync(target)) return null
  let real: string
  try {
    real = realpathSync(target)
  } catch {
    return null
  }
  return isWithinRoot(real) ? real : null
}

export async function readLocalObject(key: string): Promise<{ buffer: Buffer; contentType?: string } | null> {
  const target = resolveWithinRoot(key)
  if (!target) return null
  const real = realPathWithinRoot(target)
  if (!real) return null
  const buffer = await readFile(real)
  let contentType: string | undefined
  const ctReal = realPathWithinRoot(`${target}.contenttype`)
  if (ctReal) {
    contentType = (await readFile(ctReal, "utf-8")).trim()
  }
  return { buffer, contentType }
}
