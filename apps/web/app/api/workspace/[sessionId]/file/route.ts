import { NextResponse } from "next/server"
import { requireOrgWorkspaceAccess } from "@/lib/auth/session"
import { jsonDomainError } from "@/lib/domain/http"
import { resolveWorkspacePublicFileUrl } from "@/lib/server/workspace-public-url"
import {
  assertUserReadableWorkspacePath,
  deleteWorkspacePath,
  isTextPath,
  isValidSessionId,
  readWorkspaceFile,
  renameWorkspacePath,
  writeWorkspaceFile,
} from "@/lib/workspace-fs"

function pathFromRequest(request: Request): string | null {
  const url = new URL(request.url)
  const filePath = url.searchParams.get("path")
  return filePath && filePath.length > 0 ? filePath : null
}

export async function GET(
  request: Request,
  context: { readonly params: Promise<{ readonly sessionId: string }> }
) {
  try {
    const { sessionId } = await context.params
    const filePath = pathFromRequest(request)
    if (!isValidSessionId(sessionId) || !filePath) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    try {
      assertUserReadableWorkspacePath(filePath)
    } catch {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await requireOrgWorkspaceAccess(sessionId)

    const [file, publicUrl] = await Promise.all([
      readWorkspaceFile(sessionId, filePath),
      resolveWorkspacePublicFileUrl(sessionId, filePath),
    ])
    if (file.encoding === "utf-8") {
      return NextResponse.json({
        path: filePath,
        encoding: "utf-8",
        content: file.content,
        size: file.size,
        editable: isTextPath(filePath),
        publicUrl,
      })
    }
    return NextResponse.json({
      path: filePath,
      encoding: "binary",
      content: null,
      size: file.size,
      editable: false,
      publicUrl,
    })
  } catch (error) {
    const status =
      error instanceof Error && error.message.includes("not found")
        ? 404
        : undefined
    if (status === 404) {
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "Failed to read file",
        },
        { status: 404 }
      )
    }
    return jsonDomainError(error, "Failed to read file")
  }
}

export async function PUT(
  request: Request,
  context: { readonly params: Promise<{ readonly sessionId: string }> }
) {
  try {
    const { sessionId } = await context.params
    if (!isValidSessionId(sessionId)) {
      return NextResponse.json({ error: "Invalid session id" }, { status: 400 })
    }

    await requireOrgWorkspaceAccess(sessionId)

    const body = (await request.json()) as { path?: unknown; content?: unknown }
    if (typeof body.path !== "string" || typeof body.content !== "string") {
      return NextResponse.json(
        { error: "path and content required" },
        { status: 400 }
      )
    }
    try {
      assertUserReadableWorkspacePath(body.path)
    } catch {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    if (!isTextPath(body.path)) {
      return NextResponse.json(
        { error: "Only text files can be edited" },
        { status: 400 }
      )
    }

    await writeWorkspaceFile(sessionId, body.path, body.content)
    return NextResponse.json({ ok: true, path: body.path })
  } catch (error) {
    return jsonDomainError(error, "Failed to write file")
  }
}

export async function PATCH(
  request: Request,
  context: { readonly params: Promise<{ readonly sessionId: string }> }
) {
  try {
    const { sessionId } = await context.params
    if (!isValidSessionId(sessionId)) {
      return NextResponse.json({ error: "Invalid session id" }, { status: 400 })
    }

    await requireOrgWorkspaceAccess(sessionId)

    const body = (await request.json()) as { from?: unknown; to?: unknown }
    if (typeof body.from !== "string" || typeof body.to !== "string") {
      return NextResponse.json(
        { error: "from and to required" },
        { status: 400 }
      )
    }
    try {
      assertUserReadableWorkspacePath(body.from)
      assertUserReadableWorkspacePath(body.to)
    } catch {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await renameWorkspacePath(sessionId, body.from, body.to)
    return NextResponse.json({ ok: true, from: body.from, to: body.to })
  } catch (error) {
    return jsonDomainError(error, "Failed to rename")
  }
}

export async function DELETE(
  request: Request,
  context: { readonly params: Promise<{ readonly sessionId: string }> }
) {
  try {
    const { sessionId } = await context.params
    const filePath = pathFromRequest(request)
    if (!isValidSessionId(sessionId) || !filePath) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }
    try {
      assertUserReadableWorkspacePath(filePath)
    } catch {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await requireOrgWorkspaceAccess(sessionId)
    await deleteWorkspacePath(sessionId, filePath)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return jsonDomainError(error, "Failed to delete")
  }
}
