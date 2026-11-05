/**
 * PRD answer column bindings (M3 T2/T3).
 * Maps BCO columns to answer ids filled from contract resolve facts.
 */

import type { MappedLane } from "./mapped-lane"
import type { ResolvedRateCandidate } from "./rate-ports"
import type { LaneFeeAllocation } from "./fee-bindings"

/** Known PRD answer ids Ship Happens can write from contract resolve. */
export const CONTRACT_ANSWER_IDS = [
  "carrier_name",
  "carrier_scac",
  "transit_days",
  "free_time.origin_days",
  "free_time.dest_days",
  "currency",
  "validity_from",
  "validity_to",
  "service_name",
  "all_in",
] as const

export type ContractAnswerId = (typeof CONTRACT_ANSWER_IDS)[number]

export type AnswerBinding = {
  answerId: string
  cellRef?: string
  sheetName?: string
  columnKey?: string
  confidence?: number
}

export type AnswerCellEmit = {
  binding: AnswerBinding
  outcome: "filled" | "skipped"
  value: string | null
  reason: string | null
}

export function isContractAnswerId(id: string): id is ContractAnswerId {
  return (CONTRACT_ANSWER_IDS as readonly string[]).includes(id)
}

export function normalizeAnswerBindings(lane: MappedLane): AnswerBinding[] {
  const raw = lane.answerBindings ?? []
  const out: AnswerBinding[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    const binding = normalizeOneAnswerBinding(item)
    if (!binding) continue
    const key = `${binding.answerId}|${binding.columnKey ?? ""}|${binding.cellRef ?? ""}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(binding)
  }
  return out
}

export function normalizeOneAnswerBinding(
  raw: AnswerBinding | null | undefined
): AnswerBinding | null {
  if (!raw || typeof raw !== "object") return null
  const answerId = String(raw.answerId ?? "").trim()
  if (!answerId) return null
  const binding: AnswerBinding = { answerId }
  if (raw.columnKey?.trim()) binding.columnKey = raw.columnKey.trim()
  if (raw.cellRef?.trim()) binding.cellRef = raw.cellRef.trim()
  if (raw.sheetName?.trim()) binding.sheetName = raw.sheetName.trim()
  if (typeof raw.confidence === "number" && Number.isFinite(raw.confidence)) {
    binding.confidence = raw.confidence
  }
  return binding
}

/**
 * Derive fill-report value for one answer binding from a priced candidate.
 * Never invents — missing → skipped with reason.
 */
export function resolveAnswerValue(input: {
  answerId: string
  candidate: ResolvedRateCandidate | null
  allocation?: LaneFeeAllocation | null
}): { value: string | null; reason: string | null } {
  const { answerId, candidate, allocation } = input
  if (!candidate) {
    return { value: null, reason: "No Starboard candidate for answer binding" }
  }

  switch (answerId) {
    case "carrier_name": {
      const name = candidate.carrier_name?.trim()
      return name
        ? { value: name, reason: null }
        : { value: null, reason: "Starboard hit has no carrier_name" }
    }
    case "carrier_scac": {
      const scac = candidate.carrier_scac?.trim()
      return scac
        ? { value: scac, reason: null }
        : {
            value: null,
            reason: "Carrier SCAC unavailable (no vocab match)",
          }
    }
    case "transit_days": {
      const days = candidate.transit_time_days
      return days != null && Number.isFinite(days)
        ? { value: String(days), reason: null }
        : { value: null, reason: "Starboard hit has no transit_time" }
    }
    case "free_time.origin_days": {
      const days = candidate.free_time?.originDays
      return days != null && Number.isFinite(days)
        ? { value: String(days), reason: null }
        : { value: null, reason: "Starboard hit has no origin free time" }
    }
    case "free_time.dest_days": {
      const days = candidate.free_time?.destDays
      return days != null && Number.isFinite(days)
        ? { value: String(days), reason: null }
        : { value: null, reason: "Starboard hit has no destination free time" }
    }
    case "currency": {
      const currency = candidate.resolved_currency?.trim()
      return currency
        ? { value: currency, reason: null }
        : { value: null, reason: "Starboard hit has no currency" }
    }
    case "validity_from": {
      const from = candidate.effective_from?.trim()
      return from
        ? { value: from, reason: null }
        : { value: null, reason: "Starboard hit has no effective_from" }
    }
    case "validity_to": {
      const to = candidate.expires_on?.trim()
      return to
        ? { value: to, reason: null }
        : { value: null, reason: "Starboard hit has no expires_on" }
    }
    case "service_name": {
      const service = candidate.service_name?.trim()
      return service
        ? { value: service, reason: null }
        : { value: null, reason: "Starboard hit has no service_name" }
    }
    case "all_in": {
      const allIn = deriveAllInAmount(candidate, allocation ?? null)
      return allIn != null
        ? { value: String(allIn), reason: null }
        : {
            value: null,
            reason: "Cannot derive all_in (no buy total)",
          }
    }
    default:
      return {
        value: null,
        reason: `Unsupported answer id “${answerId}”`,
      }
  }
}

/**
 * All-in at rates step = buy total (already includes matched globals) when no
 * fee peel; if fee columns peeled base, all_in = base + allocated fee sum.
 * Overlay sell may replace later — rates step documents buy-side all-in.
 */
export function deriveAllInAmount(
  candidate: ResolvedRateCandidate,
  allocation: LaneFeeAllocation | null
): number | null {
  if (allocation && allocation.feeCells.length > 0) {
    const base = allocation.baseAmount
    const feeSum = allocation.feeCells.reduce((s, f) => s + f.amount, 0)
    if (base != null && Number.isFinite(base)) {
      return Math.round((base + feeSum) * 100) / 100
    }
  }
  const buy = candidate.resolved_buy_total
  if (buy != null && Number.isFinite(buy)) {
    return Math.round(buy * 100) / 100
  }
  return null
}

export function emitAnswerCells(input: {
  lane: MappedLane
  candidate: ResolvedRateCandidate | null
  allocation?: LaneFeeAllocation | null
}): AnswerCellEmit[] {
  const bindings = normalizeAnswerBindings(input.lane)
  return bindings.map((binding) => {
    const resolved = resolveAnswerValue({
      answerId: binding.answerId,
      candidate: input.candidate,
      allocation: input.allocation,
    })
    if (resolved.value != null) {
      return {
        binding,
        outcome: "filled" as const,
        value: resolved.value,
        reason: null,
      }
    }
    return {
      binding,
      outcome: "skipped" as const,
      value: null,
      reason: resolved.reason,
    }
  })
}
