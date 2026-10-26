"use server"

import type {
  CreateOverlayRuleInput,
  OverlayRuleView,
  UpdateOverlayRuleInput,
} from "@ship-happens/fill/browser"
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

export async function listOverlayRules(): Promise<
  { ok: true; rules: OverlayRuleView[] } | { ok: false; error: string }
> {
  try {
    const { organizationId } = await requireOrgSession()
    const rules = await createAppContext().overlayRules.list(organizationId)
    return { ok: true, rules }
  } catch (error) {
    return actionError(error)
  }
}

export async function createOverlayRule(
  input: CreateOverlayRuleInput
): Promise<{ ok: true; rule: OverlayRuleView } | { ok: false; error: string }> {
  try {
    const { organizationId, session } = await requireOrgSession()
    const rule = await createAppContext().overlayRules.create(
      organizationId,
      session.user.id,
      input
    )
    return { ok: true, rule }
  } catch (error) {
    return actionError(error)
  }
}

export async function updateOverlayRule(
  id: string,
  input: UpdateOverlayRuleInput
): Promise<{ ok: true; rule: OverlayRuleView } | { ok: false; error: string }> {
  try {
    const { organizationId } = await requireOrgSession()
    if (!id.trim()) {
      throw new DomainError("Overlay rule id is required", "VALIDATION")
    }
    const rule = await createAppContext().overlayRules.update(
      organizationId,
      id,
      input
    )
    return { ok: true, rule }
  } catch (error) {
    return actionError(error)
  }
}

export async function deleteOverlayRule(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { organizationId } = await requireOrgSession()
    if (!id.trim()) {
      throw new DomainError("Overlay rule id is required", "VALIDATION")
    }
    await createAppContext().overlayRules.delete(organizationId, id)
    return { ok: true }
  } catch (error) {
    return actionError(error)
  }
}
