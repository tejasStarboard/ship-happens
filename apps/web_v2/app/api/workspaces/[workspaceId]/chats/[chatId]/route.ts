import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { mergeWorkspaceFiles } from "@/lib/workspace-fs";
import {
  bindChatSession,
  deleteWorkspaceChat,
  getWorkspace,
  isValidWorkspaceId,
  renameWorkspaceChat,
} from "@/lib/workspace-registry";

export async function PATCH(
  request: Request,
  context: {
    readonly params: Promise<{ readonly workspaceId: string; readonly chatId: string }>;
  },
) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceId, chatId } = await context.params;
  if (!isValidWorkspaceId(workspaceId) || !getWorkspace(workspaceId)) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const body = (await request.json()) as { sessionId?: unknown; title?: unknown };

  try {
    if (typeof body.sessionId === "string") {
      const chat = bindChatSession(workspaceId, chatId, body.sessionId);
      // Session mirrors used before binding must land in the durable workspace folder.
      await mergeWorkspaceFiles(body.sessionId, workspaceId);
      return NextResponse.json(chat);
    }
    if (typeof body.title === "string") {
      renameWorkspaceChat(workspaceId, chatId, body.title);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Update failed" },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: {
    readonly params: Promise<{ readonly workspaceId: string; readonly chatId: string }>;
  },
) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceId, chatId } = await context.params;
  if (!isValidWorkspaceId(workspaceId) || !getWorkspace(workspaceId)) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  try {
    deleteWorkspaceChat(workspaceId, chatId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Delete failed" },
      { status: 400 },
    );
  }
}
