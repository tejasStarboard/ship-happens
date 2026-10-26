/**
 * HITL review-item status machine (system of record — not chat).
 *
 * Transitions:
 * - Agent create/update → `pending` (open wait; Waiting on you inbox)
 * - UI Confirm → `resolved` atomically (auto-resolve; no agent follow-up)
 * - UI Edit → `edited`; agent must apply then `resolve` → `resolved`
 * - UI Reject → `rejected`; agent must ack then `resolve` → `resolved`
 * - Agent `resolve` from `approved`|`edited`|`rejected` → `resolved`
 *   (`approved` kept for legacy rows; new Confirms never land on `approved`)
 * - `pending` → `resolved` is forbidden
 *
 * Open waits = rows with `status === "pending"` only.
 */
export const REVIEW_ITEM_STATUSES = [
  "pending",
  "approved",
  "edited",
  "rejected",
  "resolved",
] as const

export type ReviewItemStatus = (typeof REVIEW_ITEM_STATUSES)[number]

/**
 * Statuses from which the agent may mark a review item resolved.
 * Includes `approved` for legacy pre-auto-resolve rows; new Confirms
 * write `resolved` directly via UI decide.
 */
export const RESOLVABLE_REVIEW_STATUSES = [
  "approved",
  "edited",
  "rejected",
] as const satisfies readonly ReviewItemStatus[]

export type ResolvableReviewStatus = (typeof RESOLVABLE_REVIEW_STATUSES)[number]

export type ReviewItemView = {
  id: string
  rfpId: string
  organizationId: string
  stepKey: string | null
  title: string
  status: ReviewItemStatus
  proposal: Record<string, unknown>
  confidence: string | null
  source: string | null
  sourceMetadata: Record<string, unknown> | null
  decidedByUserId: string | null
  decidedAt: Date | null
  decisionNote: string | null
  resolution: Record<string, unknown> | null
  createdAt: Date
  updatedAt: Date
}

export type CreateReviewItemInput = {
  title: string
  stepKey?: string | null
  proposal?: Record<string, unknown>
  confidence?: string | number | null
  source?: string | null
  sourceMetadata?: Record<string, unknown>
}

export type UpdateReviewItemInput = {
  title?: string
  stepKey?: string | null
  proposal?: Record<string, unknown>
  confidence?: string | number | null
  source?: string | null
  sourceMetadata?: Record<string, unknown>
}

/** Human Confirm / Edit / Reject on a pending review item (UI). */
export type DecideReviewItemInput =
  | { decision: "approved" }
  | { decision: "edited"; resolution: Record<string, unknown> }
  | { decision: "rejected"; decisionNote: string }

export type NormalizedDecidePatch = {
  status: "approved" | "edited" | "rejected"
  decisionNote: string | null
  resolution?: Record<string, unknown>
}
