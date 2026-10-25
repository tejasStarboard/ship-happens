import { NextResponse } from "next/server"
import { requireOrgSession } from "@/lib/auth/session"
import { jsonDomainError } from "@/lib/domain/http"
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
    const { organizationId } = await requireOrgSession()
    const { workspaceId } = await context.params
    if (!isValidWorkspaceId(workspaceId)) {
      return NextResponse.json(
        { error: "Invalid workspace id" },
        { status: 400 }
      )
    }

    const workspace = await getWorkspace(workspaceId, organizationId)
    if (!workspace) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    await reconcileWorkspaceFiles(organizationId, workspaceId)

    return NextResponse.json(workspace)
  } catch (error) {
    return jsonDomainError(error, "Unauthorized")
  }
}

export async function DELETE(
  _request: Request,
  context: { readonly params: Promise<{ readonly workspaceId: string }> }
) {
  try {
    const { organizationId } = await requireOrgSession()
    const { workspaceId } = await context.params
    if (!isValidWorkspaceId(workspaceId)) {
      return NextResponse.json(
        { error: "Invalid workspace id" },
        { status: 400 }
      )
    }

    await deleteWorkspace(organizationId, workspaceId)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return jsonDomainError(error, "Failed to delete")
  }
}
