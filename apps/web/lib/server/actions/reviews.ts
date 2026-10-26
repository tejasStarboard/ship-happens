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
