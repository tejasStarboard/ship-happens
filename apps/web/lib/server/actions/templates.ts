"use server"

import {
  domainErrorMessage,
  domainErrorStatus,
} from "@ship-happens/fill/browser"
import { requireOrgSession } from "@/lib/auth/session"
import { createAppContext } from "@/lib/di/create-app-context"
import type { TemplateListItem } from "@/lib/domain/templates/template.types"

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

function displayName(session: {
  user: { name?: string | null; email?: string | null }
}) {
  return session.user.name?.trim() || session.user.email || "You"
}

export async function updateTemplateIdentity(
  templateId: string,
  input: { name?: string; customer?: string | null }
): Promise<
  { ok: true; template: TemplateListItem } | { ok: false; error: string }
> {
  try {
    const { organizationId, session } = await requireOrgSession()
    const template = await createAppContext().templates.updateIdentity(
      organizationId,
      templateId,
      input,
      displayName(session)
    )
    return { ok: true, template }
  } catch (error) {
    return actionError(error)
  }
}

export async function deleteTemplate(
  templateId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { organizationId } = await requireOrgSession()
    await createAppContext().templates.delete(organizationId, templateId)
    return { ok: true }
  } catch (error) {
    return actionError(error)
  }
}
