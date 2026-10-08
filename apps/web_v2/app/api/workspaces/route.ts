import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import {
  adoptOrphanSessionFolders,
  createWorkspace,
  listWorkspaces,
  pruneMissingWorkspaceFolders,
} from "@/lib/workspace-registry";

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Keep the home list aligned with disk: drop DB rows for deleted folders,
  // and re-adopt leftover session mirrors that still have files.
  await pruneMissingWorkspaceFolders();
  await adoptOrphanSessionFolders();
  return NextResponse.json({ workspaces: listWorkspaces() });
}

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let title = "Workspace";
  try {
    const body = (await request.json()) as { title?: unknown };
    if (typeof body.title === "string" && body.title.trim()) {
      title = body.title.trim().slice(0, 80);
    }
  } catch {
    // optional body
  }

  const workspace = createWorkspace(title);
  return NextResponse.json(workspace);
}
