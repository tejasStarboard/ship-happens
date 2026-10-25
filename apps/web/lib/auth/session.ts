import { AsyncLocalStorage } from "node:async_hooks"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { DomainError } from "@/lib/domain/errors"

export type OrgSession = NonNullable<
  Awaited<ReturnType<typeof auth.api.getSession>>
>

export type OrgSessionContext = {
  headers: Headers
  session: OrgSession
  organizationId: string
}

/** Set by MCP handlers so domain helpers share the same org context. */
export const orgSessionStore = new AsyncLocalStorage<OrgSessionContext>()

async function getAuthHeaders() {
  return orgSessionStore.getStore()?.headers ?? (await headers())
}

/** Login-only session (no active-org requirement). Prefer requireOrgSession for data. */
export async function getSession() {
  const h = await getAuthHeaders()
  return auth.api.getSession({ headers: h })
}

/** @deprecated Prefer getSession from @/lib/auth/session */
export async function getServerSession() {
  return getSession()
}

export async function requireSession(): Promise<{
  headers: Headers
  session: OrgSession
}> {
  const stored = orgSessionStore.getStore()
  if (stored) return { headers: stored.headers, session: stored.session }

  const h = await headers()
  const session = await auth.api.getSession({ headers: h })
  if (!session) {
    throw new DomainError("Unauthorized", "UNAUTHORIZED")
  }
  return { headers: h, session }
}

export async function requireOrgSession(): Promise<OrgSessionContext> {
  const stored = orgSessionStore.getStore()
  if (stored) return stored

  const h = await headers()
  const session = await auth.api.getSession({ headers: h })
  if (!session) {
    throw new DomainError("Unauthorized", "UNAUTHORIZED")
  }
  const organizationId = session.session.activeOrganizationId
  if (!organizationId) {
    throw new DomainError("No active organization", "UNAUTHORIZED")
  }
  return { headers: h, session, organizationId }
}

/** For list endpoints that return [] when unauthenticated / no active org. */
export async function getOptionalOrgSession(): Promise<
  OrgSessionContext | { headers: Headers; session: null; organizationId: null }
> {
  const stored = orgSessionStore.getStore()
  if (stored) return stored

  const h = await headers()
  const session = await auth.api.getSession({ headers: h })
  const organizationId = session?.session.activeOrganizationId ?? null
  if (!session || !organizationId) {
    return { headers: h, session: null, organizationId: null }
  }
  return { headers: h, session, organizationId }
}

/**
 * Require an active org session and that the workspace belongs to that org.
 * Use on every `/api/workspace/*` and `/api/workspaces/*` data path.
 */
export async function requireOrgWorkspaceAccess(workspaceId: string) {
  const ctx = await requireOrgSession()
  const { assertOrgOwnsWorkspace } =
    await import("@/lib/domain/workspace/workspace.authorize")
  await assertOrgOwnsWorkspace(ctx.organizationId, workspaceId)
  return ctx
}

export async function getInvitation(invitationId: string) {
  const h = await getAuthHeaders()
  try {
    const invitation = await auth.api.getInvitation({
      headers: h,
      query: { id: invitationId },
    })
    return { invitation, error: null as string | null }
  } catch (error) {
    return {
      invitation: null,
      error: error instanceof Error ? error.message : "Invitation not found",
    }
  }
}

export async function listOrganizations() {
  const h = await getAuthHeaders()
  return auth.api.listOrganizations({ headers: h })
}

export async function listMembers() {
  const h = await getAuthHeaders()
  const organizationId = orgSessionStore.getStore()?.organizationId
  return auth.api.listMembers({
    headers: h,
    ...(organizationId ? { query: { organizationId } } : {}),
  })
}

const ORG_ADMIN_ROLES = new Set(["owner", "admin"])

function normalizeRoles(role: unknown): string[] {
  if (Array.isArray(role)) {
    return role.map(String)
  }
  if (typeof role === "string") {
    return role
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
  }
  return []
}

/** Active-org session restricted to organization owner or admin. */
export async function requireOrgAdminSession(): Promise<OrgSessionContext> {
  const ctx = await requireOrgSession()
  const member = await auth.api.getActiveMember({ headers: ctx.headers })
  const roles = normalizeRoles(member?.role)
  if (!roles.some((role) => ORG_ADMIN_ROLES.has(role))) {
    throw new DomainError("Organization admin required", "FORBIDDEN")
  }
  return ctx
}

export async function getOptionalOrgAdminSession(): Promise<OrgSessionContext | null> {
  try {
    return await requireOrgAdminSession()
  } catch {
    return null
  }
}
