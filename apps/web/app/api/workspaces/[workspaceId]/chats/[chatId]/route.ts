import { NextResponse } from "next/server"
import { requireOrgSession } from "@/lib/server/session"
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
    await requireOrgSession()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { workspaceId, chatId } = await context.params
  if (!isValidWorkspaceId(workspaceId) || !(await getWorkspace(workspaceId))) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 })
  }

  const body = (await request.json()) as {
    sessionId?: unknown
    title?: unknown
  }

  try {
    if (typeof body.sessionId === "string") {
      const chat = await bindChatSession(workspaceId, chatId, body.sessionId)
      await mergeWorkspaceFiles(body.sessionId, workspaceId)
      return NextResponse.json(chat)
    }
    if (typeof body.title === "string") {
      await renameWorkspaceChat(workspaceId, chatId, body.title)
      return NextResponse.json({ ok: true })
    }
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Update failed" },
      { status: 400 }
    )
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
    await requireOrgSession()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { workspaceId, chatId } = await context.params
  if (!isValidWorkspaceId(workspaceId) || !(await getWorkspace(workspaceId))) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 })
  }

  try {
    await deleteWorkspaceChat(workspaceId, chatId)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Delete failed" },
      { status: 400 }
    )
  }
}
