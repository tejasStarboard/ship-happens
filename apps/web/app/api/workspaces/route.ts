import { NextResponse } from "next/server"
import { requireOrgSession } from "@/lib/auth/session"
import { jsonDomainError } from "@/lib/domain/http"
import {
  adoptOrphanSessionFolders,
  createWorkspace,
  listWorkspaces,
  pruneMissingWorkspaceFolders,
} from "@/lib/workspace-registry"

export async function GET() {
  try {
    const { organizationId } = await requireOrgSession()
    await pruneMissingWorkspaceFolders(organizationId)
    await adoptOrphanSessionFolders()
    return NextResponse.json({
      workspaces: await listWorkspaces(organizationId),
    })
  } catch (error) {
    return jsonDomainError(error, "Unauthorized")
  }
}

export async function POST(request: Request) {
  try {
    const { organizationId, session } = await requireOrgSession()

    let title = "Workspace"
    try {
      const body = (await request.json()) as { title?: unknown }
      if (typeof body.title === "string" && body.title.trim()) {
        title = body.title.trim().slice(0, 80)
      }
    } catch {
      // optional body
    }

    const workspace = await createWorkspace(
      organizationId,
      session.user.id,
      title
    )
    return NextResponse.json(workspace)
  } catch (error) {
    return jsonDomainError(error, "Unauthorized")
  }
}
