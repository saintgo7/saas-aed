import { NextResponse, type NextRequest } from "next/server"
import { auth } from "@/lib/auth/auth"
import { withTenant } from "@/lib/tenant/with-tenant"

export const dynamic = "force-dynamic"

interface RouteContext {
  readonly params: { id: string }
}

/**
 * GET /api/inspections/:id/report?fmt=docx|pdf
 * Returns a redirect to the R2 signed URL for the requested format.
 * Tenant-scoped: only the inspection's tenant can download.
 */
export async function GET(req: NextRequest, ctx: RouteContext) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const fmt = searchParams.get("fmt") ?? "pdf"
  if (fmt !== "pdf" && fmt !== "docx") {
    return NextResponse.json({ error: "INVALID_FORMAT" }, { status: 400 })
  }

  try {
    const [inspection] = await withTenant(session.user.tenantId)
      .inspections()
      .findById(ctx.params.id)

    if (!inspection) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 })
    }

    const url = fmt === "pdf" ? inspection.pdfUrl : inspection.docxUrl
    if (!url) {
      return NextResponse.json(
        { error: "REPORT_NOT_GENERATED" },
        { status: 404 }
      )
    }

    return NextResponse.redirect(url, 302)
  } catch (error) {
    console.error("[api] report fetch failed", { id: ctx.params.id, error })
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 })
  }
}
