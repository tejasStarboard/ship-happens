import { and, eq } from "drizzle-orm"
import { rfps } from "@ship-happens/db"
import { DomainError } from "@ship-happens/fill"
import { db } from "@/lib/db"
import { isValidSessionId } from "@/lib/workspace-fs"

export function isValidWorkspaceId(id: string): boolean {
  return isValidSessionId(id)
}

/**
 * Verify the workspace (RFP) belongs to the active organization.
 * Returns NOT_FOUND for both missing and cross-tenant ids (no existence leak).
 */
export async function assertOrgOwnsWorkspace(
  organizationId: string,
  workspaceId: string
): Promise<{ id: string; organizationId: string; name: string }> {
  if (!isValidWorkspaceId(workspaceId)) {
    throw new DomainError("Workspace not found", "NOT_FOUND")
  }

  const row = await db
    .select({
      id: rfps.id,
      organizationId: rfps.organizationId,
      name: rfps.name,
    })
    .from(rfps)
    .where(
      and(eq(rfps.id, workspaceId), eq(rfps.organizationId, organizationId))
    )
    .limit(1)
    .then((rows) => rows[0] ?? null)

  if (!row) {
    throw new DomainError("Workspace not found", "NOT_FOUND")
  }

  return row
}
