import { describe, expect, it } from "vitest"
import { DomainError } from "../errors"
import { normalizeDecideInput } from "./review-item.service"
import {
  RESOLVABLE_REVIEW_STATUSES,
  REVIEW_ITEM_STATUSES,
} from "./review-item.types"

describe("review item status machine", () => {
  it("exposes Phase 2b statuses", () => {
    expect(REVIEW_ITEM_STATUSES).toEqual([
      "pending",
      "approved",
      "edited",
      "rejected",
      "resolved",
    ])
  })

  it("only allows resolve after a human decision", () => {
    expect(RESOLVABLE_REVIEW_STATUSES).toEqual([
      "approved",
      "edited",
      "rejected",
    ])
    expect(RESOLVABLE_REVIEW_STATUSES).not.toContain("pending")
  })

  it("DomainError codes stay stable for CLI mapping", () => {
    const err = new DomainError(
      'Cannot resolve review item in status "pending"',
      "VALIDATION"
    )
    expect(err.code).toBe("VALIDATION")
  })
})

describe("normalizeDecideInput", () => {
  it("maps approved", () => {
    expect(normalizeDecideInput({ decision: "approved" })).toEqual({
      status: "approved",
      decisionNote: null,
    })
  })

  it("maps edited with resolution", () => {
    expect(
      normalizeDecideInput({
        decision: "edited",
        resolution: { value: "B" },
      })
    ).toEqual({
      status: "edited",
      decisionNote: null,
      resolution: { value: "B" },
    })
  })

  it("rejects edited without resolution keys", () => {
    expect(() =>
      normalizeDecideInput({ decision: "edited", resolution: {} })
    ).toThrow(DomainError)
  })

  it("maps rejected with trimmed note", () => {
    expect(
      normalizeDecideInput({
        decision: "rejected",
        decisionNote: "  wrong column  ",
      })
    ).toEqual({
      status: "rejected",
      decisionNote: "wrong column",
    })
  })

  it("rejects empty decisionNote", () => {
    expect(() =>
      normalizeDecideInput({ decision: "rejected", decisionNote: "   " })
    ).toThrow(DomainError)
  })
})
