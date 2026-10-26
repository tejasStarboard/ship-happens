"use server"

import {
  DomainError,
  domainErrorMessage,
  domainErrorStatus,
  type MappedLane,
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

/**
 * Persist confirmed Map lanes (replace-all). Rates resolve and Map read this store.
 */
export async function confirmFillMapping(
  fillId: string,
  lanes: MappedLane[]
): Promise<{ ok: true; laneCount: number } | { ok: false; error: string }> {
  try {
    const { organizationId } = await requireOrgSession()
    if (!fillId.trim()) {
      throw new DomainError("Fill id is required", "VALIDATION")
    }
    const result = await createAppContext().mapping.replaceFromDocument(
      organizationId,
      fillId,
      { version: 1, lanes }
    )
    return { ok: true, laneCount: result.laneCount }
  } catch (error) {
    return actionError(error)
  }
}
