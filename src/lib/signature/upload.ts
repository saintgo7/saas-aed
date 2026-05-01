import { storage } from "@/lib/storage"
import { sha256OfBase64Png } from "./sha256"

interface UploadSignatureParams {
  readonly tenantId: string
  readonly inspectionId: string
  readonly dataUrl: string
}

interface UploadSignatureResult {
  readonly url: string
  readonly sha256: string
  readonly key: string
}

/**
 * Stores a signature canvas data URL in object storage and returns
 * the public URL and SHA-256 digest for audit trail recording.
 *
 * Key pattern: tenants/{tenantId}/inspections/{inspectionId}/signature.png
 */
export async function uploadSignature(
  params: UploadSignatureParams
): Promise<UploadSignatureResult> {
  const { tenantId, inspectionId, dataUrl } = params

  if (!tenantId) throw new Error("uploadSignature: tenantId is required")
  if (!inspectionId) throw new Error("uploadSignature: inspectionId is required")

  const { buffer, sha256 } = sha256OfBase64Png(dataUrl)
  const key = `tenants/${tenantId}/inspections/${inspectionId}/signature.png`

  try {
    const result = await storage.upload(key, buffer, { contentType: "image/png" })
    return { url: result.url, sha256, key }
  } catch (error) {
    console.error("[signature] upload failed", { tenantId, inspectionId, error })
    throw new Error("서명 이미지 업로드에 실패했습니다. 잠시 후 다시 시도해 주세요.")
  }
}
