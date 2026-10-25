import { NextResponse } from "next/server"
import path from "node:path"
import { requireOrgWorkspaceAccess } from "@/lib/auth/session"
import { jsonDomainError } from "@/lib/domain/http"
import { isValidSessionId, readWorkspaceFile } from "@/lib/workspace-fs"
import { mimeTypeForPath } from "@/lib/workspace-types"

/** Inline file bytes for browser embeds (PDF, images, Office fetch). */
export async function GET(
  request: Request,
  context: { readonly params: Promise<{ readonly sessionId: string }> }
) {
  try {
    const { sessionId } = await context.params
    const filePath = new URL(request.url).searchParams.get("path")
    if (!isValidSessionId(sessionId) || !filePath) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    await requireOrgWorkspaceAccess(sessionId)

    const file = await readWorkspaceFile(sessionId, filePath)
    const bytes =
      file.encoding === "utf-8"
        ? Buffer.from(file.content, "utf8")
        : Buffer.from(file.content)
    const filename = path.basename(filePath)
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "content-type": mimeTypeForPath(filePath),
        "content-disposition": `inline; filename="${filename.replace(/"/g, "")}"`,
        "content-length": String(bytes.byteLength),
        "cache-control": "private, max-age=60",
      },
    })
  } catch (error) {
    return jsonDomainError(error, "Failed to preview")
  }
}
