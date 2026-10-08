import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import {
  addWorkspaceChat,
  getWorkspace,
  isValidWorkspaceId,
} from "@/lib/workspace-registry";

export async function POST(
  request: Request,
  context: { readonly params: Promise<{ readonly workspaceId: string }> },
) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceId } = await context.params;
  if (!isValidWorkspaceId(workspaceId) || !getWorkspace(workspaceId)) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  let title: string | undefined;
  try {
    const body = (await request.json()) as { title?: unknown };
    if (typeof body.title === "string") title = body.title;
  } catch {
    // optional body
  }

  const chat = addWorkspaceChat(workspaceId, title);
  return NextResponse.json(chat);
}
