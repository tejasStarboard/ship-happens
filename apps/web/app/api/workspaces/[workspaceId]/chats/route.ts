import { NextResponse } from "next/server"
import { requireOrgSession } from "@/lib/auth/session"
import { jsonDomainError } from "@/lib/domain/http"
import {
  addWorkspaceChat,
  getWorkspace,
  isValidWorkspaceId,
} from "@/lib/workspace-registry"

export async function POST(
  request: Request,
  context: { readonly params: Promise<{ readonly workspaceId: string }> }
) {
  try {
    const { organizationId } = await requireOrgSession()
    const { workspaceId } = await context.params
    if (
      !isValidWorkspaceId(workspaceId) ||
      !(await getWorkspace(workspaceId, organizationId))
    ) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      )
    }

    let title: string | undefined
    try {
      const body = (await request.json()) as { title?: unknown }
      if (typeof body.title === "string") title = body.title
    } catch {
      // optional body
    }

    const chat = await addWorkspaceChat(organizationId, workspaceId, title)
    return NextResponse.json(chat)
  } catch (error) {
    return jsonDomainError(error, "Unauthorized")
  }
}
