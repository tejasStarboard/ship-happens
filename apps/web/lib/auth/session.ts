import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { orgSessionStore } from "@/lib/server/session";

async function getAuthHeaders() {
  return orgSessionStore.getStore()?.headers ?? (await headers());
}

export async function getSession() {
  const h = await getAuthHeaders();
  return auth.api.getSession({ headers: h });
}

export async function getInvitation(invitationId: string) {
  const h = await getAuthHeaders();
  try {
    const invitation = await auth.api.getInvitation({
      headers: h,
      query: { id: invitationId },
    });
    return { invitation, error: null as string | null };
  } catch (error) {
    return {
      invitation: null,
      error: error instanceof Error ? error.message : "Invitation not found",
    };
  }
}

export async function listOrganizations() {
  const h = await getAuthHeaders();
  return auth.api.listOrganizations({ headers: h });
}

export async function listMembers() {
  const h = await getAuthHeaders();
  const organizationId = orgSessionStore.getStore()?.organizationId;
  return auth.api.listMembers({
    headers: h,
    ...(organizationId ? { query: { organizationId } } : {}),
  });
}
