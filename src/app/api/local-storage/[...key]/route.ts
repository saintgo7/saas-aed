import { NextResponse } from "next/server"
import { readLocalObject } from "@/lib/storage/local"

// Serves objects written by the local storage adapter. Demo/dev only.
// Production should never hit this — storage switches to R2 when configured.
export async function GET(
  _req: Request,
  context: { params: { key: string[] } }
) {
  const key = context.params.key.join("/")
  const obj = await readLocalObject(key)
  if (!obj) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 })
  }
  return new NextResponse(obj.buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": obj.contentType ?? "application/octet-stream",
      "Cache-Control": "private, max-age=300"
    }
  })
}

export const dynamic = "force-dynamic"
