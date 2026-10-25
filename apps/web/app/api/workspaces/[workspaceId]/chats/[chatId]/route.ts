import { NextResponse } from "next/server"
import { requireOrgSession } from "@/lib/auth/session"
import { jsonDomainError } from "@/lib/domain/http"
import { mergeWorkspaceFiles } from "@/lib/workspace-fs"
import {
  bindChatSession,
  deleteWorkspaceChat,
  getWorkspace,
  isValidWorkspaceId,
  renameWorkspaceChat,
} from "@/lib/workspace-registry"

export async function PATCH(
  request: Request,
  context: {
    readonly params: Promise<{
      readonly workspaceId: string
      readonly chatId: string
    }>
  }
) {
  try {
    const { organizationId } = await requireOrgSession()
    const { workspaceId, chatId } = await context.params
    if (
      !isValidWorkspaceId(workspaceId) ||
      !(await getWorkspace(workspaceId, organizationId))
    ) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      )
    }

    const body = (await request.json()) as {
      sessionId?: unknown
      title?: unknown
    }

    if (typeof body.sessionId === "string") {
      const chat = await bindChatSession(
        organizationId,
        workspaceId,
        chatId,
        body.sessionId
      )
      await mergeWorkspaceFiles(body.sessionId, workspaceId)
      return NextResponse.json(chat)
    }
    if (typeof body.title === "string") {
      await renameWorkspaceChat(organizationId, workspaceId, chatId, body.title)
      return NextResponse.json({ ok: true })
    }
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
  } catch (error) {
    return jsonDomainError(error, "Update failed")
  }
}

export async function DELETE(
  _request: Request,
  context: {
    readonly params: Promise<{
      readonly workspaceId: string
      readonly chatId: string
    }>
  }
) {
  try {
    const { organizationId } = await requireOrgSession()
    const { workspaceId, chatId } = await context.params
    if (
      !isValidWorkspaceId(workspaceId) ||
      !(await getWorkspace(workspaceId, organizationId))
    ) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      )
    }

    await deleteWorkspaceChat(organizationId, workspaceId, chatId)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return jsonDomainError(error, "Delete failed")
  }
}
