/**
 * Buy → sell markup + floor helpers (mirrors `@starboard/sb-client` margins).
 * Kept local so `@ship-happens/fill` stays free of the Starboard client package.
 */

export type ApplyMarkupInput = {
  buy: number
  pct?: number
  amount?: number
}

export type ApplyMarkupResult = {
  buy: number
  sell: number
  margin: number
  marginPct: number
}

export function applyMarkup(input: ApplyMarkupInput): ApplyMarkupResult {
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
  sell = Math.round(sell * 100) / 100
  const margin = Math.round((sell - buy) * 100) / 100
  const marginPct = buy === 0 ? 0 : Math.round((margin / buy) * 10000) / 100
  return { buy, sell, margin, marginPct }
}

export type FloorCheckInput = {
  buy: number
  sell: number
  /** Minimum absolute margin (e.g. 150 for +$150/FEU) */
  minAmount?: number
  /** Minimum gross margin percent (e.g. 5) */
  minPct?: number
}

export type FloorBreach = {
  rule: "min_amount" | "min_pct"
  required: number
  actual: number
}

export type FloorCheckResult = {
  ok: boolean
  buy: number
  sell: number
  margin: number
  marginPct: number
  breaches: FloorBreach[]
}

/** AND semantics: every configured threshold must pass. */
export function checkFloor(input: FloorCheckInput): FloorCheckResult {
  const buy = input.buy
  const sell = input.sell
  if (!Number.isFinite(buy) || !Number.isFinite(sell)) {
    throw new Error("buy and sell must be finite numbers")
  }
  const margin = Math.round((sell - buy) * 100) / 100
  const marginPct = buy === 0 ? 0 : Math.round((margin / buy) * 10000) / 100
  const breaches: FloorBreach[] = []
  if (input.minAmount != null && margin < input.minAmount) {
    breaches.push({
      rule: "min_amount",
      required: input.minAmount,
      actual: margin,
    })
  }
  if (input.minPct != null && marginPct < input.minPct) {
    breaches.push({
      rule: "min_pct",
      required: input.minPct,
      actual: marginPct,
    })
  }
  return { ok: breaches.length === 0, buy, sell, margin, marginPct, breaches }
}

export function parseMoney(
  value: string | number | null | undefined
): number | null {
  if (value == null) return null
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null
  }
  const trimmed = value.trim()
  if (!trimmed) return null
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : null
}
