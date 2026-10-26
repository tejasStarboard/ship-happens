/**
 * Buy → sell markup helpers (mirrors `@starboard/sb-client` margins.apply).
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
