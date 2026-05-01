// Cloudflare R2 storage adapter (S3-compatible).
//
// Required dependencies (add via `pnpm add`):
//   - @aws-sdk/client-s3
//   - @aws-sdk/s3-request-presigner
//
// DO NOT auto-install — left for the user. This file imports them as if present.

import { Buffer } from "node:buffer"
import { createHash } from "node:crypto"
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import type { StorageAdapter } from "./index"

// ─────────────────────────────────────────
// Environment validation (lazy — verified on first use, not at module load)
// ─────────────────────────────────────────
function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Environment variable ${name} is required for R2 storage adapter`)
  }
  return value
}

interface R2Config {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  bucket: string
  publicUrl: string | null
  endpoint: string
  client: S3Client
}

let _config: R2Config | null = null

function config(): R2Config {
  if (_config) return _config
  const accountId = requireEnv("R2_ACCOUNT_ID")
  const accessKeyId = requireEnv("R2_ACCESS_KEY_ID")
  const secretAccessKey = requireEnv("R2_SECRET_ACCESS_KEY")
  const bucket = requireEnv("R2_BUCKET")
  const publicUrl = process.env.R2_PUBLIC_URL ?? null
  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`
  const client = new S3Client({
    region: "auto",
    endpoint,
    credentials: { accessKeyId, secretAccessKey }
  })
  _config = { accountId, accessKeyId, secretAccessKey, bucket, publicUrl, endpoint, client }
  return _config
}

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────
async function toBuffer(body: Buffer | Blob): Promise<Buffer> {
  if (Buffer.isBuffer(body)) return body
  const arrayBuffer = await body.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

function sha256Hex(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex")
}

function publicUrlFor(key: string): string {
  const c = config()
  if (c.publicUrl) {
    return `${c.publicUrl.replace(/\/+$/, "")}/${key}`
  }
  return `${c.endpoint}/${c.bucket}/${key}`
}

// ─────────────────────────────────────────
// Adapter
// ─────────────────────────────────────────
export const r2Adapter: StorageAdapter = {
  async upload(key, body, opts) {
    const c = config()
    try {
      const buffer = await toBuffer(body)
      const sha256 = sha256Hex(buffer)
      await c.client.send(
        new PutObjectCommand({
          Bucket: c.bucket,
          Key: key,
          Body: buffer,
          ContentType: opts?.contentType,
          ChecksumSHA256: undefined,
          Metadata: { sha256 }
        })
      )
      return { url: publicUrlFor(key), sha256 }
    } catch (error) {
      console.error("[r2] upload failed", { key, error })
      throw new Error(`R2 upload failed for key '${key}'`)
    }
  },

  async getSignedUrl(key, expiresInSec) {
    const c = config()
    try {
      const command = new GetObjectCommand({ Bucket: c.bucket, Key: key })
      return await getSignedUrl(c.client, command, { expiresIn: expiresInSec })
    } catch (error) {
      console.error("[r2] getSignedUrl failed", { key, error })
      throw new Error(`R2 signed URL generation failed for key '${key}'`)
    }
  },

  async delete(key) {
    const c = config()
    try {
      await c.client.send(new DeleteObjectCommand({ Bucket: c.bucket, Key: key }))
    } catch (error) {
      console.error("[r2] delete failed", { key, error })
      throw new Error(`R2 delete failed for key '${key}'`)
    }
  }
}
