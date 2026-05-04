import { NextResponse, type NextRequest } from "next/server"
import { auth } from "@/lib/auth/auth"
import { ensureReportGenerated } from "@/server/actions/ensure-report"

export const dynamic = "force-dynamic"

interface RouteContext {
  readonly params: { id: string }
}

/**
 * GET /api/inspections/:id/report?fmt=docx|pdf
 *
 * Returns a redirect to the storage URL for the requested format.
 * Lazily generates the artifact if it does not yet exist (so users can
 * download even when they skipped the "send" step).
 *
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
    const result = await ensureReportGenerated(ctx.params.id, session.user.tenantId)
    const url = fmt === "pdf" ? result.pdfUrl : result.docxUrl

    // Send a Location header — browsers resolve relative paths against the
    // user's address bar (e.g. https://aed.abada.kr). Using NextResponse.redirect
    // with new URL(url, req.url) leaks the standalone server's internal
    // 0.0.0.0:3000 origin to the client. For absolute external URLs (real R2)
    // we pass through unchanged.
    if (url.startsWith("http")) {
      return NextResponse.redirect(url, 302)
    }
    return new NextResponse(null, { status: 302, headers: { Location: url } })
  } catch (error) {
    const message = error instanceof Error ? error.message : "INTERNAL_ERROR"
    if (message === "INSPECTION_NOT_FOUND") {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 })
    }
    console.error("[api] report fetch failed", { id: ctx.params.id, error })
    return NextResponse.json(
      { error: "REPORT_GENERATION_FAILED", message },
      { status: 500 }
    )
  }
}
