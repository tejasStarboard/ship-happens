import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import {
  deleteWorkspace,
  getWorkspace,
  isValidWorkspaceId,
  reconcileWorkspaceFiles,
} from "@/lib/workspace-registry";

export async function GET(
  _request: Request,
  context: { readonly params: Promise<{ readonly workspaceId: string }> },
) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceId } = await context.params;
  if (!isValidWorkspaceId(workspaceId)) {
    return NextResponse.json({ error: "Invalid workspace id" }, { status: 400 });
  }

  const workspace = getWorkspace(workspaceId);
  if (!workspace) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Recover files that agent sync wrote under session ids before the chat was bound.
  await reconcileWorkspaceFiles(workspaceId);

  return NextResponse.json(workspace);
}

export async function DELETE(
  _request: Request,
  context: { readonly params: Promise<{ readonly workspaceId: string }> },
) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceId } = await context.params;
  if (!isValidWorkspaceId(workspaceId)) {
    return NextResponse.json({ error: "Invalid workspace id" }, { status: 400 });
  }

  try {
    await deleteWorkspace(workspaceId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete" },
      { status: 404 },
    );
  }
}
