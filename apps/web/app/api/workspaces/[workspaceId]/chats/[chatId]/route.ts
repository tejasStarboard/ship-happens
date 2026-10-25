import { NextResponse } from "next/server"
import { requireOrgSession } from "@/lib/auth/session"
import { jsonDomainError } from "@/lib/domain/http"
import { mergeWorkspaceFiles } from "@/lib/workspace-fs"
import {
  bindChatSession,
  clearChatSession,
  getWorkspace,
  hideWorkspaceChat,
  isValidWorkspaceId,
  renameWorkspaceChat,
  saveChatEvents,
  showWorkspaceChat,
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
      hiddenFromTabs?: unknown
      events?: unknown
      priorMessages?: unknown
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
    if (body.sessionId === null) {
      const chat = await clearChatSession(organizationId, workspaceId, chatId)
      return NextResponse.json(chat)
    }
    if (typeof body.title === "string") {
      await renameWorkspaceChat(organizationId, workspaceId, chatId, body.title)
      return NextResponse.json({ ok: true })
    }
    if (typeof body.hiddenFromTabs === "boolean") {
      const chat = body.hiddenFromTabs
        ? await hideWorkspaceChat(organizationId, workspaceId, chatId)
        : await showWorkspaceChat(organizationId, workspaceId, chatId)
      return NextResponse.json(chat)
    }
    if (Array.isArray(body.events) || Array.isArray(body.priorMessages)) {
      const chat = await saveChatEvents(
        organizationId,
        workspaceId,
        chatId,
        Array.isArray(body.events) ? body.events : undefined,
        Array.isArray(body.priorMessages) ? body.priorMessages : undefined
      )
      return NextResponse.json(chat)
    }
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
  } catch (error) {
    return jsonDomainError(error, "Update failed")
  }
}

/** Soft-close the chat tab (eve session keeps running). */
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

    const chat = await hideWorkspaceChat(organizationId, workspaceId, chatId)
    return NextResponse.json(chat)
  } catch (error) {
    return jsonDomainError(error, "Hide failed")
  }
}
