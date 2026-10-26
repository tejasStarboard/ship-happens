import { describe, expect, it } from "vitest"
import { parseReviewCreatedFromBash } from "@/lib/agent/parse-review-created"

const reviewJson = JSON.stringify({
  id: "rev_abcdefghij",
  rfpId: "fill_0123456789abcdef0123",
  organizationId: "org_test",
  title: "Map column X",
  status: "pending",
  proposal: { col: "A" },
})

describe("parseReviewCreatedFromBash", () => {
  it("parses a successful sh-client reviews create", () => {
    expect(
      parseReviewCreatedFromBash(
        { command: "sh-client reviews create --body '{...}'" },
        { stdout: reviewJson, exitCode: 0 }
      )
    ).toEqual({
      id: "rev_abcdefghij",
      rfpId: "fill_0123456789abcdef0123",
      title: "Map column X",
    })
  })

  it("extracts JSON when stdout has a prefix", () => {
    expect(
      parseReviewCreatedFromBash(
        { command: "/workspace/.eve/bin/sh-client reviews create --body '{}'" },
        { stdout: `ok\n${reviewJson}\n`, exitCode: 0 }
      )?.id
    ).toBe("rev_abcdefghij")
  })

  it("returns null for non-create or failed commands", () => {
    expect(
      parseReviewCreatedFromBash(
        { command: "sh-client reviews list" },
        { stdout: reviewJson, exitCode: 0 }
      )
    ).toBeNull()
    expect(
      parseReviewCreatedFromBash(
        { command: "sh-client reviews create --body '{...}'" },
        { stdout: reviewJson, exitCode: 1 }
      )
    ).toBeNull()
    expect(
      parseReviewCreatedFromBash(
        { command: "sh-client reviews create --body '{...}'" },
        { stdout: reviewJson, exitCode: 0 },
        "boom"
      )
    ).toBeNull()
  })
})
