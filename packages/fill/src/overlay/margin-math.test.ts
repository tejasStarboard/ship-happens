import { describe, expect, it } from "vitest"
import { applyMarkup, parseMoney } from "./margin-math"

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

describe("parseMoney", () => {
  it("parses strings and numbers", () => {
    expect(parseMoney("12.5")).toBe(12.5)
    expect(parseMoney(3)).toBe(3)
    expect(parseMoney("")).toBeNull()
    expect(parseMoney("x")).toBeNull()
  })
})
