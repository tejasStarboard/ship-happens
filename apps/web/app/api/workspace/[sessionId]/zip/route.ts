import { NextResponse } from "next/server"
import JSZip from "jszip"
import { requireOrgWorkspaceAccess } from "@/lib/auth/session"
import { jsonDomainError } from "@/lib/domain/http"
import {
  collectSyncFiles,
  isAgentPrivateWorkspacePath,
  isValidSessionId,
  toUserFacingWorkspacePath,
} from "@/lib/workspace-fs"

export async function GET(
  _request: Request,
  context: { readonly params: Promise<{ readonly sessionId: string }> }
) {
  try {
    const { sessionId: workspaceId } = await context.params
    if (!isValidSessionId(workspaceId)) {
      return NextResponse.json(
        { error: "Invalid workspace id" },
        { status: 400 }
      )
    }

    await requireOrgWorkspaceAccess(workspaceId)

    const files = await collectSyncFiles(workspaceId)
    const zip = new JSZip()
    for (const file of files) {
      if (isAgentPrivateWorkspacePath(file.path)) continue
      zip.file(toUserFacingWorkspacePath(file.path), file.bytes)
    }
    const bytes = await zip.generateAsync({
      type: "uint8array",
      compression: "DEFLATE",
    })
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "content-type": "application/zip",
        "content-disposition": `attachment; filename="${workspaceId}.zip"`,
        "content-length": String(bytes.byteLength),
      },
    })
  } catch (error) {
    return jsonDomainError(error, "Failed to zip workspace")
  }
}
