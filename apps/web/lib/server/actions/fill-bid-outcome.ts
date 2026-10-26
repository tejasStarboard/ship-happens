"use server"

import type {
  DecideFillBidOutcomeInput,
  SetFillDueAtInput,
} from "@ship-happens/fill"
import { requireOrgSession } from "@/lib/auth/session"
import { createAppContext } from "@/lib/di/create-app-context"

/** Thin adapters — business logic in FillBidOutcomeService. */
export async function setFillDueAt(fillId: string, input: SetFillDueAtInput) {
  const { organizationId } = await requireOrgSession()
  const ctx = createAppContext()
  return ctx.fillBidOutcomes.setDueAt(organizationId, fillId, input)
}

export async function decideFillBidOutcome(
  fillId: string,
  input: DecideFillBidOutcomeInput
) {
  const { organizationId, session } = await requireOrgSession()
  const ctx = createAppContext()
  return ctx.fillBidOutcomes.decide(
    organizationId,
    fillId,
    input,
    session.user.id
  )
}

export async function clearFillBidOutcome(fillId: string) {
  const { organizationId } = await requireOrgSession()
  const ctx = createAppContext()
  return ctx.fillBidOutcomes.clearOutcome(organizationId, fillId)
}
