"use server"

import { requireOrgSession } from "@/lib/auth/session"
import { createAppContext } from "@/lib/di/create-app-context"
import { DomainError } from "@/lib/domain/errors"

export async function listEmailIntegrations() {
  const { organizationId } = await requireOrgSession()
  const ctx = createAppContext()
  return ctx.emailIntake.listIntegrations(organizationId)
}

export async function disconnectEmailIntegration(
  provider: "gmail" | "outlook"
) {
  const { organizationId } = await requireOrgSession()
  if (provider !== "gmail" && provider !== "outlook") {
    throw new DomainError("Unknown provider", "VALIDATION")
  }
  const ctx = createAppContext()
  await ctx.emailIntake.disconnect(organizationId, provider)
  return { ok: true as const }
}
