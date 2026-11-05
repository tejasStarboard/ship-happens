"use server"

import {
  DomainError,
  domainErrorMessage,
  domainErrorStatus,
} from "@ship-happens/fill/browser"
import { requireOrgSession } from "@/lib/auth/session"
import { createAppContext } from "@/lib/di/create-app-context"

function actionError(error: unknown): { ok: false; error: string } {
  const status = domainErrorStatus(error)
  return {
    ok: false,
    error:
      status === 500
        ? "Request failed"
        : domainErrorMessage(error, "Request failed"),
  }
}

export async function updateFillIdentity(
  fillId: string,
  input: { name?: string; customer?: string | null }
): Promise<
  | { ok: true; name: string; customer: string | null }
  | { ok: false; error: string }
> {
  try {
    const { organizationId } = await requireOrgSession()
    return await createAppContext().fillDeskOps.updateIdentity(
      organizationId,
      fillId,
      input
    )
  } catch (error) {
    return actionError(error)
  }
}

export async function setFillStatus(
  fillId: string,
  status: string
): Promise<{ ok: true; status: string } | { ok: false; error: string }> {
  try {
    const { organizationId, session } = await requireOrgSession()
    return await createAppContext().fillDeskOps.setStatus(
      organizationId,
      fillId,
      status,
      session.user.id
    )
  } catch (error) {
    return actionError(error)
  }
}

export async function deleteFill(
  fillId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { organizationId } = await requireOrgSession()
    const ctx = createAppContext()
    const fill = await ctx.repos.rfps.findByIdForOrganization(
      organizationId,
      fillId
    )
    if (!fill) {
      throw new DomainError(`Fill not found: ${fillId}`, "NOT_FOUND")
    }
    await ctx.workspaces.delete(organizationId, fillId)
    return { ok: true }
  } catch (error) {
    return actionError(error)
  }
}

export type FillResetMode = "agent" | "sheet" | "both"

/**
 * Reset fill agent chat and/or restore workbook `source/` from durable Blob.
 */
export async function resetFillWorkspace(
  fillId: string,
  mode: FillResetMode
): Promise<
  | { ok: true; agentCleared: number; sheetFiles: number }
  | { ok: false; error: string }
> {
  try {
    const { organizationId } = await requireOrgSession()
    const ctx = createAppContext()
    const fill = await ctx.repos.rfps.findByIdForOrganization(
      organizationId,
      fillId
    )
    if (!fill) {
      throw new DomainError(`Fill not found: ${fillId}`, "NOT_FOUND")
    }

    const {
      resetWorkspaceAgentChats,
      restoreWorkspaceSheetFromSources,
    } = await import("@/lib/workspace-registry")

    let agentCleared = 0
    let sheetFiles = 0

    if (mode === "agent" || mode === "both") {
      agentCleared = await resetWorkspaceAgentChats(organizationId, fillId)
    }
    if (mode === "sheet" || mode === "both") {
      sheetFiles = await restoreWorkspaceSheetFromSources(fillId)
    }

    return { ok: true, agentCleared, sheetFiles }
  } catch (error) {
    return actionError(error)
  }
}
