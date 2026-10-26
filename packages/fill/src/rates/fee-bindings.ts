/**
 * BCO fee / accessorial column bindings (SB-7088).
 * Maps sheet fee columns to Starboard charge codes / ontology headings and
 * allocates resolve+globals amounts into those cells.
 */

import {
  classifySurchargeName,
  DEFAULT_HEADING_BUCKETS,
  normalizeChargeToken,
  rollupCharges,
  type ChargeBucket,
} from "./charge-ontology"
import type { MappedLane } from "./mapped-lane"
import type { ResolvedSurchargeCandidate } from "./rate-ports"

export const UNEXPECTED_FEE_REVIEW_SOURCE = "unexpected-fee" as const

export const UNEXPECTED_FEE_SETTINGS_PATH = "/settings/fill-export" as const

export type UnexpectedFeeMode = "soft_warn" | "hard_block"

export const DEFAULT_UNEXPECTED_FEE_MODE: UnexpectedFeeMode = "soft_warn"

export type FeeBinding = {
  /** Charge code or ontology heading (BAF, destination_fees, AMS, …). */
  heading: string
  columnKey?: string
  cellRef?: string
  sheetName?: string
  /** 0–1 when auto-proposed; omit when user-edited. */
  confidence?: number
}

export type FeeCellAllocation = {
  binding: FeeBinding
  amount: number
  currency: string | null
  constituents: Array<{ name: string; amount: number; bucket: ChargeBucket }>
  match: "code" | "heading_bucket" | "empty"
}

export type UnexpectedFeeLine = {
  name: string
  amount: number
  currency: string | null
  source?: string
  bucket: ChargeBucket
}

export type LaneFeeAllocation = {
  bindings: FeeBinding[]
  /** Base / ocean column amount when fee columns are present. */
  baseAmount: number | null
  baseCurrency: string | null
  feeCells: FeeCellAllocation[]
  unexpected: UnexpectedFeeLine[]
}

export function isUnexpectedFeeMode(
  value: unknown
): value is UnexpectedFeeMode {
  return value === "soft_warn" || value === "hard_block"
}

/** Normalize legacy `surchargeSlots: string[]` and structured feeBindings. */
export function normalizeFeeBindings(lane: MappedLane): FeeBinding[] {
  const fromStructured = (lane.feeBindings ?? [])
    .map((b) => normalizeOneBinding(b))
    .filter((b): b is FeeBinding => b != null)

  const fromSlots = (lane.surchargeSlots ?? [])
    .map((slot) => {
      if (typeof slot === "string") {
        const heading = slot.trim()
        if (!heading) return null
        return { heading } satisfies FeeBinding
      }
      return normalizeOneBinding(slot as FeeBinding)
    })
    .filter((b): b is FeeBinding => b != null)

  const merged = [...fromStructured, ...fromSlots]
  const seen = new Set<string>()
  const out: FeeBinding[] = []
  for (const b of merged) {
    const key = `${normalizeChargeToken(b.heading)}|${b.columnKey ?? ""}|${b.cellRef ?? ""}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(b)
  }
  return out
}

function normalizeOneBinding(
  raw: FeeBinding | null | undefined
): FeeBinding | null {
  if (!raw || typeof raw !== "object") return null
  const heading = String(raw.heading ?? "").trim()
  if (!heading) return null
  const binding: FeeBinding = { heading }
  if (raw.columnKey?.trim()) binding.columnKey = raw.columnKey.trim()
  if (raw.cellRef?.trim()) binding.cellRef = raw.cellRef.trim()
  if (raw.sheetName?.trim()) binding.sheetName = raw.sheetName.trim()
  if (typeof raw.confidence === "number" && Number.isFinite(raw.confidence)) {
    binding.confidence = raw.confidence
  }
  return binding
}

/** Persist shape: structured bindings; keep surchargeSlots as heading list. */
export function feeBindingsForPersist(bindings: FeeBinding[]): {
  feeBindings: FeeBinding[]
  surchargeSlots: string[]
} {
  const feeBindings = bindings
    .map((b) => normalizeOneBinding(b))
    .filter((b): b is FeeBinding => b != null)
  return {
    feeBindings,
    surchargeSlots: feeBindings.map((b) => b.heading),
  }
}

/**
 * Auto-propose fee bindings from free-text labels (column headers / slots).
 * Uses classifySurchargeName; skips base_freight (that is the main lane column).
 */
export function proposeFeeBindingsFromLabels(labels: string[]): FeeBinding[] {
  const out: FeeBinding[] = []
  const seen = new Set<string>()
  for (const label of labels) {
    const trimmed = label.trim()
    if (!trimmed) continue
    const cls = classifySurchargeName(trimmed)
    if (cls.bucket === "base_freight") continue
    const heading =
      cls.normalized_code?.toLowerCase() ||
      (cls.bucket !== "unknown" ? bucketToHeading(cls.bucket) : trimmed)
    const key = normalizeChargeToken(heading)
    if (seen.has(key)) continue
    seen.add(key)
    const confidence =
      cls.normalized_code || cls.bucket !== "unknown" ? 0.85 : 0.45
    out.push({
      heading,
      columnKey: trimmed,
      confidence,
    })
  }
  return out
}

function bucketToHeading(bucket: ChargeBucket): string {
  switch (bucket) {
    case "freight_surcharge":
      return "baf"
    case "origin":
      return "origin_fees"
    case "destination":
      return "destination_fees"
    case "documentation":
      return "documentation"
    case "inland":
      return "inland"
    case "globals":
      return "globals"
    default:
      return bucket
  }
}

function pricedCharges(surcharges: ResolvedSurchargeCandidate[]): Array<{
  name: string
  amount: number
  currency: string | null
  source?: string
  index: number
}> {
  const out: Array<{
    name: string
    amount: number
    currency: string | null
    source?: string
    index: number
  }> = []
  surcharges.forEach((s, index) => {
    if (s.amount == null || !Number.isFinite(s.amount)) return
    out.push({
      name: s.name,
      amount: s.amount,
      currency: s.currency,
      source: s.source,
      index,
    })
  })
  return out
}

/**
 * Allocate resolve surcharges into confirmed fee bindings.
 * Exact code/name match wins; otherwise ontology heading buckets via rollup.
 */
export function allocateLaneFees(input: {
  lane: MappedLane
  resolvedBuyTotal: number | null
  resolvedCurrency: string | null
  resolvedSurcharges: ResolvedSurchargeCandidate[]
}): LaneFeeAllocation {
  const bindings = normalizeFeeBindings(input.lane)
  const priced = pricedCharges(input.resolvedSurcharges)

  if (bindings.length === 0) {
    return {
      bindings: [],
      baseAmount: input.resolvedBuyTotal,
      baseCurrency: input.resolvedCurrency,
      feeCells: [],
      unexpected: [],
    }
  }

  const used = new Set<number>()
  const feeCells: FeeCellAllocation[] = []

  for (const binding of bindings) {
    const token = normalizeChargeToken(binding.heading)
    const codeHits = priced
      .map((c, i) => ({ c, i }))
      .filter(
        ({ c }) =>
          !used.has(c.index) &&
          (normalizeChargeToken(c.name) === token ||
            classifySurchargeName(c.name).normalized_code === token)
      )

    if (codeHits.length > 0) {
      for (const { c } of codeHits) used.add(c.index)
      const amount = codeHits.reduce((s, { c }) => s + c.amount, 0)
      feeCells.push({
        binding,
        amount: Math.round(amount * 100) / 100,
        currency: codeHits[0]?.c.currency ?? input.resolvedCurrency,
        constituents: codeHits.map(({ c }) => ({
          name: c.name,
          amount: c.amount,
          bucket: classifySurchargeName(c.name).bucket,
        })),
        match: "code",
      })
      continue
    }

    const headingKey = binding.heading.trim().toLowerCase()
    const buckets = DEFAULT_HEADING_BUCKETS[headingKey]
    if (buckets && buckets.length > 0) {
      const remaining = priced.filter((c) => !used.has(c.index))
      const { headings } = rollupCharges({
        charges: remaining.map((c) => ({
          name: c.name,
          amount: c.amount,
          currency: c.currency,
        })),
        headings: [headingKey],
        heading_buckets: { [headingKey]: buckets },
      })
      const rolled = headings[0]
      if (rolled && rolled.constituents.length > 0) {
        for (const part of rolled.constituents) {
          const hit = remaining.find(
            (c) =>
              c.name === part.name &&
              c.amount === part.amount &&
              !used.has(c.index)
          )
          if (hit) used.add(hit.index)
        }
        feeCells.push({
          binding,
          amount: rolled.amount,
          currency: rolled.currency ?? input.resolvedCurrency,
          constituents: rolled.constituents,
          match: "heading_bucket",
        })
        continue
      }
    }

    feeCells.push({
      binding,
      amount: 0,
      currency: input.resolvedCurrency,
      constituents: [],
      match: "empty",
    })
  }

  const unexpected: UnexpectedFeeLine[] = priced
    .filter((c) => !used.has(c.index))
    .map((c) => {
      const cls = classifySurchargeName(c.name)
      return {
        name: c.name,
        amount: c.amount,
        currency: c.currency,
        source: c.source,
        bucket: cls.bucket,
      }
    })
    .filter((c) => c.bucket !== "base_freight")

  const baseFromCharges = priced
    .filter((c) => classifySurchargeName(c.name).bucket === "base_freight")
    .reduce((s, c) => s + c.amount, 0)

  const feeSum = feeCells.reduce((s, f) => s + f.amount, 0)
  let baseAmount: number | null = input.resolvedBuyTotal
  if (baseFromCharges > 0) {
    baseAmount = Math.round(baseFromCharges * 100) / 100
  } else if (
    input.resolvedBuyTotal != null &&
    Number.isFinite(input.resolvedBuyTotal) &&
    feeSum > 0
  ) {
    // Buy total often includes itemized carrier lines; peel matched fees.
    baseAmount = Math.round((input.resolvedBuyTotal - feeSum) * 100) / 100
  }

  return {
    bindings,
    baseAmount,
    baseCurrency: input.resolvedCurrency,
    feeCells,
    unexpected,
  }
}
