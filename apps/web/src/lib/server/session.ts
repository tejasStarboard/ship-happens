import { AsyncLocalStorage } from "node:async_hooks"
import { getRequestHeaders } from "@tanstack/react-start/server"
import { auth } from "@/lib/auth/server"

export type OrgSession = NonNullable<
  Awaited<ReturnType<typeof auth.api.getSession>>
>

export type OrgSessionContext = {
  headers: Headers
  session: OrgSession
  organizationId: string
}

/** Set by MCP handlers so domain `createServerFn`s share the same org context. */
export const orgSessionStore = new AsyncLocalStorage<OrgSessionContext>()

export async function requireOrgSession(): Promise<OrgSessionContext> {
  const stored = orgSessionStore.getStore()
  if (stored) return stored

  const headers = getRequestHeaders()
  const session = await auth.api.getSession({ headers })
  if (!session) throw new Error("Unauthorized")
  const organizationId = session.session.activeOrganizationId
  if (!organizationId) throw new Error("No active organization")
  return { headers, session, organizationId }
}

/** For list endpoints that return [] when unauthenticated / no active org. */
export async function getOptionalOrgSession(): Promise<
  OrgSessionContext | { headers: Headers; session: null; organizationId: null }
> {
  const stored = orgSessionStore.getStore()
  if (stored) return stored

  const headers = getRequestHeaders()
  const session = await auth.api.getSession({ headers })
  const organizationId = session?.session.activeOrganizationId ?? null
  if (!session || !organizationId) {
    return { headers, session: null, organizationId: null }
  }
  return { headers, session, organizationId }
}
