import { AsyncLocalStorage } from "node:async_hooks";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export type OrgSession = NonNullable<
  Awaited<ReturnType<typeof auth.api.getSession>>
>;

export type OrgSessionContext = {
  headers: Headers;
  session: OrgSession;
  organizationId: string;
};

/** Set by MCP handlers so domain helpers share the same org context. */
export const orgSessionStore = new AsyncLocalStorage<OrgSessionContext>();

export async function requireOrgSession(): Promise<OrgSessionContext> {
  const stored = orgSessionStore.getStore();
  if (stored) return stored;

  const h = await headers();
  const session = await auth.api.getSession({ headers: h });
  if (!session) throw new Error("Unauthorized");
  const organizationId = session.session.activeOrganizationId;
  if (!organizationId) throw new Error("No active organization");
  return { headers: h, session, organizationId };
}

/** For list endpoints that return [] when unauthenticated / no active org. */
export async function getOptionalOrgSession(): Promise<
  OrgSessionContext | { headers: Headers; session: null; organizationId: null }
> {
  const stored = orgSessionStore.getStore();
  if (stored) return stored;

  const h = await headers();
  const session = await auth.api.getSession({ headers: h });
  const organizationId = session?.session.activeOrganizationId ?? null;
  if (!session || !organizationId) {
    return { headers: h, session: null, organizationId: null };
  }
  return { headers: h, session, organizationId };
}
