import { describe, expect, it } from "vitest"
import { applyMarkup, checkFloor, parseMoney } from "./margin-math"

describe("applyMarkup", () => {
  it("applies percent and amount", () => {
    expect(applyMarkup({ buy: 1000, pct: 5, amount: 50 })).toEqual({
      buy: 1000,
      sell: 1100,
      margin: 100,
      marginPct: 10,
    })
  })
})

describe("checkFloor", () => {
  it("passes when both thresholds clear", () => {
    const r = checkFloor({
      buy: 1000,
      sell: 1200,
      minAmount: 150,
      minPct: 5,
    })
    expect(r.ok).toBe(true)
    expect(r.breaches).toEqual([])
  })

  it("ANDs min_amount and min_pct when both set", () => {
    const r = checkFloor({
      buy: 1000,
      sell: 1100,
      minAmount: 150,
      minPct: 5,
    })
    expect(r.ok).toBe(false)
    expect(r.breaches.map((b) => b.rule)).toEqual(["min_amount"])
  })

  it("reports both breaches when both fail", () => {
    const r = checkFloor({
      buy: 1000,
      sell: 1030,
      minAmount: 150,
      minPct: 5,
    })
    expect(r.ok).toBe(false)
    expect(r.breaches.map((b) => b.rule)).toEqual(["min_amount", "min_pct"])
  })
})

describe("parseMoney", () => {
  it("parses strings and numbers", () => {
    expect(parseMoney("12.5")).toBe(12.5)
    expect(parseMoney(3)).toBe(3)
    expect(parseMoney("")).toBeNull()
    expect(parseMoney("x")).toBeNull()
  })
})
