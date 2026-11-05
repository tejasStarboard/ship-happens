import { NextResponse } from "next/server"
import path from "node:path"
import JSZip from "jszip"
import { requireOrgWorkspaceAccess } from "@/lib/auth/session"
import { jsonDomainError } from "@/lib/domain/http"
import {
  assertUserReadableWorkspacePath,
  collectSyncFiles,
  isAgentPrivateWorkspacePath,
  isValidSessionId,
  toUserFacingWorkspacePath,
} from "@/lib/workspace-fs"

export async function GET(
  request: Request,
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

    const prefixRaw = new URL(request.url).searchParams.get("path")
    const prefix = prefixRaw
      ? prefixRaw.replaceAll("\\", "/").replace(/^\/+|\/+$/g, "")
      : ""
    if (prefix) {
      try {
        assertUserReadableWorkspacePath(prefix)
      } catch {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    await requireOrgWorkspaceAccess(workspaceId)

    const files = await collectSyncFiles(workspaceId)
    const zip = new JSZip()
    for (const file of files) {
      if (isAgentPrivateWorkspacePath(file.path)) continue
      const facing = toUserFacingWorkspacePath(file.path)
      if (prefix && facing !== prefix && !facing.startsWith(`${prefix}/`)) {
        continue
      }
      // Keep folder-relative paths inside the zip when downloading a subdir.
      const zipPath = prefix
        ? facing === prefix
          ? path.posix.basename(facing)
          : facing.slice(prefix.length + 1)
        : facing
      zip.file(zipPath, file.bytes)
    }
    const bytes = await zip.generateAsync({
      type: "uint8array",
      compression: "DEFLATE",
    })
    const filename = prefix
      ? `${path.posix.basename(prefix) || "folder"}.zip`
      : `${workspaceId}.zip`
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "content-type": "application/zip",
        "content-disposition": `attachment; filename="${filename.replace(/"/g, "")}"`,
        "content-length": String(bytes.byteLength),
      },
    })
  } catch (error) {
    return jsonDomainError(error, "Failed to zip workspace")
  }
}
