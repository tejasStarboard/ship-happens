"use server"

import type {
  CreateMarginFloorRuleInput,
  MarginFloorRuleView,
  UpdateMarginFloorRuleInput,
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

export async function listMarginFloorRules(): Promise<
  { ok: true; rules: MarginFloorRuleView[] } | { ok: false; error: string }
> {
  try {
    const { organizationId } = await requireOrgSession()
    const rules = await createAppContext().marginFloors.list(organizationId)
    return { ok: true, rules }
  } catch (error) {
    return actionError(error)
  }
}

export async function createMarginFloorRule(
  input: CreateMarginFloorRuleInput
): Promise<
  { ok: true; rule: MarginFloorRuleView } | { ok: false; error: string }
> {
  try {
    const { organizationId, session } = await requireOrgSession()
    const rule = await createAppContext().marginFloors.create(
      organizationId,
      session.user.id,
      input
    )
    return { ok: true, rule }
  } catch (error) {
    return actionError(error)
  }
}

export async function updateMarginFloorRule(
  id: string,
  input: UpdateMarginFloorRuleInput
): Promise<
  { ok: true; rule: MarginFloorRuleView } | { ok: false; error: string }
> {
  try {
    const { organizationId } = await requireOrgSession()
    if (!id.trim()) {
      throw new DomainError("Floor rule id is required", "VALIDATION")
    }
    const rule = await createAppContext().marginFloors.update(
      organizationId,
      id,
      input
    )
    return { ok: true, rule }
  } catch (error) {
    return actionError(error)
  }
}

export async function deleteMarginFloorRule(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { organizationId } = await requireOrgSession()
    if (!id.trim()) {
      throw new DomainError("Floor rule id is required", "VALIDATION")
    }
    await createAppContext().marginFloors.delete(organizationId, id)
    return { ok: true }
  } catch (error) {
    return actionError(error)
  }
}
