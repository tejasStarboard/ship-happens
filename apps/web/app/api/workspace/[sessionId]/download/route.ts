import { NextResponse } from "next/server"
import path from "node:path"
import { requireOrgWorkspaceAccess } from "@/lib/auth/session"
import { jsonDomainError } from "@/lib/domain/http"
import {
  assertUserReadableWorkspacePath,
  isValidSessionId,
  readWorkspaceFile,
} from "@/lib/workspace-fs"

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
    try {
      assertUserReadableWorkspacePath(filePath)
    } catch {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
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
        "content-type": "application/octet-stream",
        "content-disposition": `attachment; filename="${filename.replace(/"/g, "")}"`,
        "content-length": String(bytes.byteLength),
      },
    })
  } catch (error) {
    return jsonDomainError(error, "Failed to download")
  }
}
