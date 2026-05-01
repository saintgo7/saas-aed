import { r2Adapter } from "./r2"

/**
 * Object storage abstraction. Concrete implementation defaults to Cloudflare R2.
 * Replace `storage` with a different adapter to switch providers without
 * touching call sites (signature upload, document upload, etc.).
 */
export interface StorageAdapter {
  upload(
    key: string,
    body: Buffer | Blob,
    opts?: { contentType?: string }
  ): Promise<{ url: string; sha256: string }>
  getSignedUrl(key: string, expiresInSec: number): Promise<string>
  delete(key: string): Promise<void>
}

export { r2Adapter }

export const storage: StorageAdapter = r2Adapter
