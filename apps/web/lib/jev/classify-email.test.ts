import { describe, expect, it } from "vitest"
import {
  EMAIL_RELEVANCE_CONFIDENCE_THRESHOLD,
  gateEmailRelevance,
} from "./classify-email"

describe("gateEmailRelevance", () => {
  it("accepts relevant with confidence at threshold", () => {
    expect(
      gateEmailRelevance("relevant", EMAIL_RELEVANCE_CONFIDENCE_THRESHOLD)
    ).toBe(true)
  })

  it("rejects relevant below threshold", () => {
    expect(gateEmailRelevance("relevant", 0.5)).toBe(false)
  })

  it("rejects not_relevant even with high confidence", () => {
    expect(gateEmailRelevance("not_relevant", 0.99)).toBe(false)
  })
})
