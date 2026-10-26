/**
 * Commercial bid outcome for a fill (SB-7090).
 * Distinct from cell `fill_cell_outcome` (pricing result).
 */

export const RFP_BID_OUTCOMES = ["won", "lost", "closed", "expired"] as const

export type RfpBidOutcome = (typeof RFP_BID_OUTCOMES)[number]

export const RFP_BID_OUTCOME_LABEL: Record<RfpBidOutcome, string> = {
  won: "Won",
  lost: "Lost",
  closed: "Closed",
  expired: "Expired",
}

/** Short hint for empty / decide UX. */
export const RFP_BID_OUTCOME_HINT: Record<RfpBidOutcome, string> = {
  won: "Bid awarded",
  lost: "Competed and lost",
  closed: "Withdrawn / no-bid",
  expired: "Past due without a decision",
}

export function isRfpBidOutcome(value: unknown): value is RfpBidOutcome {
  return (
    typeof value === "string" &&
    (RFP_BID_OUTCOMES as readonly string[]).includes(value)
  )
}

/**
 * Effective outcome for display / aging:
 * stored outcome wins; otherwise past-due undecided → derived expired.
 */
export function resolveEffectiveBidOutcome(input: {
  bidOutcome: RfpBidOutcome | null
  dueAt: Date | string | null
  now?: Date
}): { outcome: RfpBidOutcome | null; derived: boolean } {
  if (input.bidOutcome != null) {
    return { outcome: input.bidOutcome, derived: false }
  }
  if (input.dueAt == null) {
    return { outcome: null, derived: false }
  }
  const due =
    typeof input.dueAt === "string" ? new Date(input.dueAt) : input.dueAt
  if (Number.isNaN(due.getTime())) {
    return { outcome: null, derived: false }
  }
  const now = input.now ?? new Date()
  if (due.getTime() < now.getTime()) {
    return { outcome: "expired", derived: true }
  }
  return { outcome: null, derived: false }
}

export function isBidOverdue(input: {
  bidOutcome: RfpBidOutcome | null
  dueAt: Date | string | null
  now?: Date
}): boolean {
  if (input.bidOutcome != null) return false
  if (input.dueAt == null) return false
  const due =
    typeof input.dueAt === "string" ? new Date(input.dueAt) : input.dueAt
  if (Number.isNaN(due.getTime())) return false
  const now = input.now ?? new Date()
  return due.getTime() < now.getTime()
}
