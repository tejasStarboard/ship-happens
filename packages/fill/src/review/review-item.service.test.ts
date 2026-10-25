import { describe, expect, it } from "vitest"
import { DomainError } from "../errors"
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
