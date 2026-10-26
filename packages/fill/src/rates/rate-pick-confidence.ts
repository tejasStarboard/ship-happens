/**
 * Rate-pick confidence (SB-7084).
 *
 * Scores contract resolve + overlay outcomes so Review audit can show a
 * documented confidence (or explicit n/a) and weak picks can open HITL
 * Waiting-on-you items alongside floor-margin reviews.
 *
 * Threshold is a code constant (not Settings) — same pattern as map’s 0.9.
 */

/** Below this → open a rate-pick review. Miss/error use null (n/a) and do not queue. */
export const RATE_PICK_LOW_CONFIDENCE_THRESHOLD = 0.75

/** Stable source tag for Phase 2b reviews opened by weak rate picks. */
export const RATE_PICK_REVIEW_SOURCE = "rate-pick" as const

export type RatePickConfidenceReason =
  | "only_option"
  | "cheapest_of_many"
  | "near_tie"
  | "projected_overlay"
  | "markup_overlay"
  | "n/a"

export type RatePickConfidence = {
  /** 0–1 score, or null when the cell is a miss/error (explicit n/a). */
  confidence: number | null
  reason: RatePickConfidenceReason
  /** Priced Starboard candidates considered for the pick (0 for overlay-only). */
  candidateCount: number
}

const NEAR_TIE_PCT = 0.02

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.min(1, Math.max(0, n))
}

/**
 * Score a Starboard contract pick after cheapest-of-priced selection.
 * Near-tie: second-cheapest within 2% of the chosen buy → weaker score.
 */
export function scoreContractPick(input: {
  pricedCount: number
  chosenBuy: number | null
  secondBuy?: number | null
}): RatePickConfidence {
  const pricedCount = Math.max(0, Math.floor(input.pricedCount))
  if (input.chosenBuy == null || pricedCount === 0) {
    return { confidence: null, reason: "n/a", candidateCount: pricedCount }
  }

  if (pricedCount === 1) {
    return {
      confidence: 0.95,
      reason: "only_option",
      candidateCount: 1,
    }
  }

  const second = input.secondBuy
  if (
    second != null &&
    Number.isFinite(second) &&
    input.chosenBuy > 0 &&
    (second - input.chosenBuy) / input.chosenBuy <= NEAR_TIE_PCT
  ) {
    return {
      confidence: 0.7,
      reason: "near_tie",
      candidateCount: pricedCount,
    }
  }

  return {
    confidence: 0.85,
    reason: "cheapest_of_many",
    candidateCount: pricedCount,
  }
}

/**
 * Score after overlay apply. Projected (no buy) is intentionally weak so it
 * always queues at the default threshold. Markup inherits buy confidence.
 */
export function scoreOverlayPick(input: {
  mode: "projected" | "markup"
  buyConfidence: number | null
}): RatePickConfidence {
  if (input.mode === "projected") {
    return {
      confidence: 0.6,
      reason: "projected_overlay",
      candidateCount: 0,
    }
  }
  const buy = input.buyConfidence
  const confidence = buy == null ? 0.85 : clamp01(Math.min(buy, 0.9))
  return {
    confidence,
    reason: "markup_overlay",
    candidateCount: 0,
  }
}

export function isLowConfidenceRatePick(
  confidence: number | null | undefined
): boolean {
  if (confidence == null) return false
  return confidence < RATE_PICK_LOW_CONFIDENCE_THRESHOLD
}

/** Rank priced candidates: chosen (cheapest) + optional second for near-tie. */
export function rankPricedBuys(
  rates: Array<{ resolved_buy_total: number | null }>
): {
  pricedCount: number
  chosenBuy: number | null
  secondBuy: number | null
} {
  const priced = rates
    .map((r) => r.resolved_buy_total)
    .filter((n): n is number => n != null && Number.isFinite(n))
    .sort((a, b) => a - b)
  return {
    pricedCount: priced.length,
    chosenBuy: priced[0] ?? null,
    secondBuy: priced[1] ?? null,
  }
}
