import { NextResponse } from "next/server";
import { requireOrgSession } from "@/lib/server/session";
import { isValidSessionId, listWorkspaceTree } from "@/lib/workspace-fs";
import { getWorkspace, reconcileWorkspaceFiles } from "@/lib/workspace-registry";

export async function GET(
  _request: Request,
  context: { readonly params: Promise<{ readonly sessionId: string }> },
) {
  try {
    await requireOrgSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId: workspaceId } = await context.params;
  if (!isValidSessionId(workspaceId)) {
    return NextResponse.json({ error: "Invalid session id" }, { status: 400 });
  }

  if (await getWorkspace(workspaceId)) {
    await reconcileWorkspaceFiles(workspaceId);
  }

  const tree = await listWorkspaceTree(workspaceId);
  return NextResponse.json({ tree });
}
