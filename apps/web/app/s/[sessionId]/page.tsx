import { redirect } from "next/navigation"
import { requireOrgSession } from "@/lib/auth/session"
import {
  createWorkspace,
  findWorkspaceIdByChatOrSession,
  getWorkspace,
} from "@/lib/workspace-registry"

/** Legacy session URLs: send the user to the owning workspace when possible. */
export default async function SessionPage({
  params,
}: {
  readonly params: Promise<{ readonly sessionId: string }>
}) {
  let organizationId: string
  let userId: string
  try {
    const ctx = await requireOrgSession()
    organizationId = ctx.organizationId
    userId = ctx.session.user.id
  } catch {
    redirect("/sign-in")
  }

  const { sessionId } = await params
  const existing = await findWorkspaceIdByChatOrSession(
    sessionId,
    organizationId
  )
  if (existing && (await getWorkspace(existing, organizationId))) {
    redirect(`/w/${encodeURIComponent(existing)}`)
  }

  const workspace = await createWorkspace(organizationId, userId)
  redirect(`/w/${encodeURIComponent(workspace.id)}`)
}
