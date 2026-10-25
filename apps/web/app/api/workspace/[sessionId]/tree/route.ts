import { NextResponse } from "next/server"
import { requireOrgWorkspaceAccess } from "@/lib/auth/session"
import { jsonDomainError } from "@/lib/domain/http"
import { isValidSessionId, listWorkspaceTree } from "@/lib/workspace-fs"
import { getWorkspace, reconcileWorkspaceFiles } from "@/lib/workspace-registry"

export async function GET(
  _request: Request,
  context: { readonly params: Promise<{ readonly sessionId: string }> }
) {
  try {
    const { sessionId: workspaceId } = await context.params
    if (!isValidSessionId(workspaceId)) {
      return NextResponse.json({ error: "Invalid session id" }, { status: 400 })
    }

    const { organizationId } = await requireOrgWorkspaceAccess(workspaceId)

    if (await getWorkspace(workspaceId, organizationId)) {
      await reconcileWorkspaceFiles(organizationId, workspaceId)
    }

    const tree = await listWorkspaceTree(workspaceId)
    return NextResponse.json({ tree })
  } catch (error) {
    return jsonDomainError(error, "Unauthorized")
  }
}
