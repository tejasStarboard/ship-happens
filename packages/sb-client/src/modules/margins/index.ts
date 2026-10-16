/**
 * Margin helpers for Ship Happens floor guardrails / sell markup.
 * Simple buy→sell math (not the full QGS dial engine). Use for overlays and checks.
 */

export type ApplyMarginInput = {
  buy: number
  /** Percent markup, e.g. 5 → sell = buy * 1.05 */
  pct?: number
  /** Absolute markup in same currency as buy */
  amount?: number
}

export type ApplyMarginResult = {
  buy: number
  sell: number
  margin: number
  margin_pct: number
}

export function applyMargin(input: ApplyMarginInput): ApplyMarginResult {
  const buy = input.buy
  if (!Number.isFinite(buy)) {
    throw new Error("buy must be a finite number")
  }
  let sell = buy
  if (input.pct != null) {
    if (!Number.isFinite(input.pct)) throw new Error("pct must be finite")
    sell = buy * (1 + input.pct / 100)
  }
  if (input.amount != null) {
    if (!Number.isFinite(input.amount)) throw new Error("amount must be finite")
    sell = sell + input.amount
  }
  // Round money to 2dp HALF_UP-ish via cents
  sell = Math.round(sell * 100) / 100
  const margin = Math.round((sell - buy) * 100) / 100
  const margin_pct = buy === 0 ? 0 : Math.round((margin / buy) * 10000) / 100
  return { buy, sell, margin, margin_pct }
}

export type FloorCheckInput = {
  buy: number
  sell: number
  /** Minimum absolute margin (e.g. 150 for +$150/FEU) */
  min_amount?: number
  /** Minimum gross margin percent (e.g. 5) */
  min_pct?: number
}

export type FloorCheckResult = {
  ok: boolean
  buy: number
  sell: number
  margin: number
  margin_pct: number
  breaches: Array<{
    rule: "min_amount" | "min_pct"
    required: number
    actual: number
  }>
}

export function checkFloor(input: FloorCheckInput): FloorCheckResult {
  const buy = input.buy
  const sell = input.sell
  if (!Number.isFinite(buy) || !Number.isFinite(sell)) {
    throw new Error("buy and sell must be finite numbers")
  }
  const margin = Math.round((sell - buy) * 100) / 100
  const margin_pct = buy === 0 ? 0 : Math.round((margin / buy) * 10000) / 100
  const breaches: FloorCheckResult["breaches"] = []
  if (input.min_amount != null && margin < input.min_amount) {
    breaches.push({
      rule: "min_amount",
      required: input.min_amount,
      actual: margin,
    })
  }
  if (input.min_pct != null && margin_pct < input.min_pct) {
    breaches.push({
      rule: "min_pct",
      required: input.min_pct,
      actual: margin_pct,
    })
  }
  return { ok: breaches.length === 0, buy, sell, margin, margin_pct, breaches }
}

export class MarginsModule {
  apply(input: ApplyMarginInput): ApplyMarginResult {
    return applyMargin(input)
  }

  checkFloor(input: FloorCheckInput): FloorCheckResult {
    return checkFloor(input)
  }
}
