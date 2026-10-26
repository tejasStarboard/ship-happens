"use server"

import type {
  FillOrgSettingsView,
  UnexpectedFeeMode,
  UpdateFillOrgSettingsInput,
} from "@ship-happens/fill/browser"
import {
  DomainError,
  domainErrorMessage,
  domainErrorStatus,
  isUnexpectedFeeMode,
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

export async function getFillOrgSettings(): Promise<
  { ok: true; settings: FillOrgSettingsView } | { ok: false; error: string }
> {
  try {
    const { organizationId } = await requireOrgSession()
    const settings =
      await createAppContext().fillOrgSettings.get(organizationId)
    return { ok: true, settings }
  } catch (error) {
    return actionError(error)
  }
}

export async function updateFillOrgSettings(
  input: UpdateFillOrgSettingsInput
): Promise<
  { ok: true; settings: FillOrgSettingsView } | { ok: false; error: string }
> {
  try {
    const { organizationId } = await requireOrgSession()
    if (!isUnexpectedFeeMode(input.unexpectedFeeMode)) {
      throw new DomainError(
        "unexpectedFeeMode must be soft_warn or hard_block",
        "VALIDATION"
      )
    }
    const settings = await createAppContext().fillOrgSettings.update(
      organizationId,
      { unexpectedFeeMode: input.unexpectedFeeMode as UnexpectedFeeMode }
    )
    return { ok: true, settings }
  } catch (error) {
    return actionError(error)
  }
}
