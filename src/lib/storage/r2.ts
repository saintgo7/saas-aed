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
// Environment validation (fail fast at module load)
// ─────────────────────────────────────────
function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Environment variable ${name} is required for R2 storage adapter`)
  }
  return value
}

const R2_ACCOUNT_ID = requireEnv("R2_ACCOUNT_ID")
const R2_ACCESS_KEY_ID = requireEnv("R2_ACCESS_KEY_ID")
const R2_SECRET_ACCESS_KEY = requireEnv("R2_SECRET_ACCESS_KEY")
const R2_BUCKET = requireEnv("R2_BUCKET")
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL ?? null

const R2_ENDPOINT = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`

// ─────────────────────────────────────────
// S3 client (immutable singleton)
// ─────────────────────────────────────────
const client: S3Client = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY
  }
})

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
  if (R2_PUBLIC_URL) {
    return `${R2_PUBLIC_URL.replace(/\/+$/, "")}/${key}`
  }
  return `${R2_ENDPOINT}/${R2_BUCKET}/${key}`
}

// ─────────────────────────────────────────
// Adapter
// ─────────────────────────────────────────
export const r2Adapter: StorageAdapter = {
  async upload(key, body, opts) {
    try {
      const buffer = await toBuffer(body)
      const sha256 = sha256Hex(buffer)
      await client.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET,
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
    try {
      const command = new GetObjectCommand({ Bucket: R2_BUCKET, Key: key })
      return await getSignedUrl(client, command, { expiresIn: expiresInSec })
    } catch (error) {
      console.error("[r2] getSignedUrl failed", { key, error })
      throw new Error(`R2 signed URL generation failed for key '${key}'`)
    }
  },

  async delete(key) {
    try {
      await client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }))
    } catch (error) {
      console.error("[r2] delete failed", { key, error })
      throw new Error(`R2 delete failed for key '${key}'`)
    }
  }
}
