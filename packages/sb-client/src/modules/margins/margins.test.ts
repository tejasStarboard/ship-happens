import { describe, expect, it } from "vitest"
import { applyMargin, checkFloor } from "./index.js"

describe("applyMargin", () => {
  it("applies percent markup", () => {
    expect(applyMargin({ buy: 1000, pct: 5 })).toEqual({
      buy: 1000,
      sell: 1050,
      margin: 50,
      margin_pct: 5,
    })
  })

  it("applies absolute markup", () => {
    expect(applyMargin({ buy: 1000, amount: 150 })).toMatchObject({
      sell: 1150,
      margin: 150,
    })
  })
})

describe("checkFloor", () => {
  it("passes when above floors", () => {
    const r = checkFloor({ buy: 1000, sell: 1200, min_amount: 150, min_pct: 5 })
    expect(r.ok).toBe(true)
    expect(r.breaches).toHaveLength(0)
  })

  it("fails below min amount", () => {
    const r = checkFloor({ buy: 1000, sell: 1100, min_amount: 150 })
    expect(r.ok).toBe(false)
    expect(r.breaches[0].rule).toBe("min_amount")
  })
})
