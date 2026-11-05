"use server"

import type { DecideReviewItemInput } from "@ship-happens/fill"
import { requireOrgSession } from "@/lib/auth/session"
import { createAppContext } from "@/lib/di/create-app-context"

/**
 * Thin server-action adapters. Business logic lives in ReviewItemService.
 */
export async function decideReviewItem(
  fillId: string,
  reviewId: string,
  input: DecideReviewItemInput
) {
  const { organizationId, session } = await requireOrgSession()
  const ctx = createAppContext()
  return ctx.reviews.decide(
    organizationId,
    fillId,
    reviewId,
    input,
    session.user.id
  )
}

export async function decideReviewItemsBulk(
  fillId: string,
  input: {
    decision: "approved" | "rejected"
    decisionNote?: string
    ids?: string[]
    stepKey?: string | null
  }
) {
  const { organizationId, session } = await requireOrgSession()
  const ctx = createAppContext()
  return ctx.reviews.decideMany(organizationId, fillId, input, session.user.id)
}
