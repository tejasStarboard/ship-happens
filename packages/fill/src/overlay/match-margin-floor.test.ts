import { describe, expect, it } from "vitest"
import { matchMarginFloorRule } from "./match-margin-floor"
import type { MarginFloorRuleView } from "./margin-floor.types"

function rule(
  partial: Partial<MarginFloorRuleView> &
    Pick<MarginFloorRuleView, "id" | "name">
): MarginFloorRuleView {
  return {
    organizationId: "org_1",
    customer: null,
    minAmount: "150",
    minPct: "5",
    currency: "USD",
    enabled: true,
    priority: 0,
    createdByUserId: "user_1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  }
}

describe("matchMarginFloorRule", () => {
  it("prefers customer-specific over org-wide", () => {
    const matched = matchMarginFloorRule({
      fillCustomer: "Acme",
      rules: [
        rule({ id: "org", name: "Org", minAmount: "100", priority: 10 }),
        rule({
          id: "cust",
          name: "Acme floor",
          customer: "acme",
          minAmount: "200",
          priority: 0,
        }),
      ],
    })
    expect(matched?.rule.id).toBe("cust")
  })

  it("falls back to org-wide when customer does not match", () => {
    const matched = matchMarginFloorRule({
      fillCustomer: "Other",
      rules: [
        rule({ id: "org", name: "Org", minAmount: "100" }),
        rule({
          id: "cust",
          name: "Acme floor",
          customer: "acme",
          minAmount: "200",
        }),
      ],
    })
    expect(matched?.rule.id).toBe("org")
  })

  it("ignores disabled rules", () => {
    const matched = matchMarginFloorRule({
      fillCustomer: null,
      rules: [rule({ id: "off", name: "Off", enabled: false })],
    })
    expect(matched).toBeNull()
  })
})
