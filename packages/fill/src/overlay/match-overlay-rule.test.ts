import { describe, expect, it } from "vitest"
import { matchOverlayRule } from "./match-overlay-rule"
import type { OverlayRuleView } from "./overlay.types"

function rule(
  partial: Partial<OverlayRuleView> & Pick<OverlayRuleView, "id" | "mode">
): OverlayRuleView {
  return {
    organizationId: "org_1",
    name: partial.name ?? partial.id,
    customer: null,
    originLocode: null,
    destLocode: null,
    equipmentType: null,
    projectedAmount: "2000",
    markupPct: "5",
    markupAmount: null,
    currency: "USD",
    enabled: true,
    priority: 0,
    createdByUserId: "user_1",
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
    ...partial,
  }
}

const lane = {
  originLocode: "CNSHA",
  destLocode: "USLAX",
  equipmentType: "40HC",
  buyTotal: null as number | null,
}

describe("matchOverlayRule", () => {
  it("prefers customer-specific over org-wide", () => {
    const matched = matchOverlayRule({
      rules: [
        rule({ id: "org", mode: "projected", name: "Org", priority: 100 }),
        rule({
          id: "cust",
          mode: "projected",
          name: "Customer",
          customer: "Acme",
          priority: 0,
        }),
      ],
      fillCustomer: "acme",
      lane,
      mode: "projected",
    })
    expect(matched?.rule.id).toBe("cust")
  })

  it("uses null lane fields as wildcards and ranks specificity", () => {
    const matched = matchOverlayRule({
      rules: [
        rule({ id: "any", mode: "projected", name: "Any" }),
        rule({
          id: "lane",
          mode: "projected",
          name: "Lane",
          originLocode: "CNSHA",
          destLocode: "USLAX",
        }),
      ],
      fillCustomer: null,
      lane,
      mode: "projected",
    })
    expect(matched?.rule.id).toBe("lane")
  })

  it("ignores disabled and wrong-mode rules", () => {
    const matched = matchOverlayRule({
      rules: [
        rule({ id: "off", mode: "projected", enabled: false }),
        rule({ id: "markup", mode: "markup", markupPct: "10" }),
      ],
      fillCustomer: null,
      lane,
      mode: "projected",
    })
    expect(matched).toBeNull()
  })

  it("requires customer match when rule is customer-scoped", () => {
    const matched = matchOverlayRule({
      rules: [
        rule({
          id: "other",
          mode: "projected",
          customer: "Other",
        }),
      ],
      fillCustomer: "Acme",
      lane,
      mode: "projected",
    })
    expect(matched).toBeNull()
  })
})
