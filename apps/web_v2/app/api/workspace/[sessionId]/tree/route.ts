import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { isValidSessionId, listWorkspaceTree } from "@/lib/workspace-fs";
import { getWorkspace, reconcileWorkspaceFiles } from "@/lib/workspace-registry";

export async function GET(
  _request: Request,
  context: { readonly params: Promise<{ readonly sessionId: string }> },
) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId: workspaceId } = await context.params;
  if (!isValidSessionId(workspaceId)) {
    return NextResponse.json({ error: "Invalid session id" }, { status: 400 });
  }

  if (getWorkspace(workspaceId)) {
    await reconcileWorkspaceFiles(workspaceId);
  }

  const tree = await listWorkspaceTree(workspaceId);
  return NextResponse.json({ tree });
}
