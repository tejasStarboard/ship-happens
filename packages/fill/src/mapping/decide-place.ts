import { MAP_LOW_CONFIDENCE_THRESHOLD } from "../rates/proposal-to-mapped-lane"
import type {
  GeoCandidate,
  PlaceCandidateChip,
  PlaceResolveResult,
} from "./geo-ports"

export const GEO_NONE_KEY = "NONE"
export const GEO_MAX_CHIPS = 3

export type JevPlaceChoice = {
  choice: string
  confidence: number
  probabilities: Record<string, number>
}

/**
 * Pure decide: Jev choice + candidate pool → PlaceResolveResult.
 * Product threshold is MAP_LOW_CONFIDENCE_THRESHOLD (0.9), not geo_v4 CERTAIN_P.
 */
export function decidePlaceFromChoice(
  label: string,
  pool: GeoCandidate[],
  answer: JevPlaceChoice,
  threshold = MAP_LOW_CONFIDENCE_THRESHOLD
): PlaceResolveResult {
  const byCode = new Map(pool.map((c) => [c.locode, c]))
  const ranked = [...pool]
    .map((c) => ({
      candidate: c,
      probability: answer.probabilities[c.locode] ?? 0,
    }))
    .sort((a, b) => b.probability - a.probability)

  const noneP = answer.probabilities[GEO_NONE_KEY] ?? 0
  const chips: PlaceCandidateChip[] = ranked
    .slice(0, GEO_MAX_CHIPS)
    .map((r) => ({
      locode: r.candidate.locode,
      label: r.candidate.label,
      probability: r.probability,
    }))

  if (pool.length === 0) {
    return {
      label,
      locode: null,
      confidence: 0,
      certain: false,
      candidates: [],
      blocked: "no_candidates",
    }
  }

  if (answer.choice === GEO_NONE_KEY || !byCode.has(answer.choice)) {
    return {
      label,
      locode: ranked[0]?.candidate.locode ?? null,
      confidence: Math.min(1, Math.max(0, noneP || answer.confidence || 0)),
      certain: false,
      candidates: chips,
      blocked: "none",
    }
  }

  const lead = byCode.get(answer.choice)!
  const leadP =
    answer.probabilities[answer.choice] ??
    (typeof answer.confidence === "number" ? answer.confidence : 0)
  const confidence = clamp01(leadP)
  const certain = confidence >= threshold

  return {
    label,
    locode: lead.locode,
    confidence,
    certain,
    candidates: chips,
    blocked: certain ? undefined : "low_p",
  }
}

/** When Jev is unavailable: surface search best with confidence 0 → HITL. */
export function decidePlaceWithoutJev(
  label: string,
  pool: GeoCandidate[]
): PlaceResolveResult {
  if (pool.length === 0) {
    return {
      label,
      locode: null,
      confidence: 0,
      certain: false,
      candidates: [],
      blocked: "no_candidates",
    }
  }
  const chips: PlaceCandidateChip[] = pool.slice(0, GEO_MAX_CHIPS).map((c) => ({
    locode: c.locode,
    label: c.label,
    probability: 0,
  }))
  return {
    label,
    locode: pool[0]!.locode,
    confidence: 0,
    certain: false,
    candidates: chips,
    blocked: "error",
  }
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.min(1, Math.max(0, n))
}
