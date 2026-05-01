import { r2Adapter } from "./r2"
import { localAdapter } from "./local"

/**
 * Object storage abstraction. Concrete implementation defaults to Cloudflare R2,
 * but switches to a local filesystem adapter when DEMO_MODE=true so signature
 * uploads and document storage work without R2 credentials.
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

export { r2Adapter, localAdapter }

const useLocal =
  process.env.DEMO_MODE === "true" ||
  process.env.STORAGE_DRIVER === "local" ||
  !process.env.R2_ACCOUNT_ID

export const storage: StorageAdapter = useLocal ? localAdapter : r2Adapter
