import { NextResponse } from "next/server"
import { requireOrgSession } from "@/lib/server/session"
import {
  deleteWorkspace,
  getWorkspace,
  isValidWorkspaceId,
  reconcileWorkspaceFiles,
} from "@/lib/workspace-registry"

export async function GET(
  _request: Request,
  context: { readonly params: Promise<{ readonly workspaceId: string }> }
) {
  try {
    await requireOrgSession()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { workspaceId } = await context.params
  if (!isValidWorkspaceId(workspaceId)) {
    return NextResponse.json({ error: "Invalid workspace id" }, { status: 400 })
  }

  const workspace = await getWorkspace(workspaceId)
  if (!workspace) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await reconcileWorkspaceFiles(workspaceId)

  return NextResponse.json(workspace)
}

export async function DELETE(
  _request: Request,
  context: { readonly params: Promise<{ readonly workspaceId: string }> }
) {
  try {
    await requireOrgSession()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { workspaceId } = await context.params
  if (!isValidWorkspaceId(workspaceId)) {
    return NextResponse.json({ error: "Invalid workspace id" }, { status: 400 })
  }

  try {
    await deleteWorkspace(workspaceId)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete" },
      { status: 404 }
    )
  }
}
