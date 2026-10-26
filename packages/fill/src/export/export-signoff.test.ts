import { describe, expect, it } from "vitest"
import {
  EXPORT_SIGNOFF_REVIEW_SOURCE,
  isExportSignoffConfirmed,
  resolveExportDownloadGate,
} from "./export-signoff"

function review(
  overrides: Partial<{
    source: string | null
    status: string
    decisionNote: string | null
    resolution: Record<string, unknown> | null
    createdAt: string
  }> = {}
) {
  return {
    source: EXPORT_SIGNOFF_REVIEW_SOURCE as string | null,
    status: "pending",
    decisionNote: null as string | null,
    resolution: {} as Record<string, unknown> | null,
    createdAt: "2026-01-15T12:00:00.000Z",
    ...overrides,
  }
}

describe("isExportSignoffConfirmed", () => {
  it("requires resolved + resolution.decision approved", () => {
    expect(
      isExportSignoffConfirmed(
        review({ status: "resolved", resolution: { decision: "approved" } })
      )
    ).toBe(true)
    expect(
      isExportSignoffConfirmed(review({ status: "resolved", resolution: {} }))
    ).toBe(false)
    expect(
      isExportSignoffConfirmed(
        review({
          source: "margin-floor",
          status: "resolved",
          resolution: { decision: "approved" },
        })
      )
    ).toBe(false)
  })
})

describe("resolveExportDownloadGate", () => {
  it("blocks when no artifact", () => {
    expect(resolveExportDownloadGate([], null)).toEqual({
      unlocked: false,
      filledFileUrl: null,
      blockedReason: null,
    })
  })

  it("blocks artifact without sign-off review", () => {
    expect(
      resolveExportDownloadGate([], "https://blob.example/filled.xlsx")
    ).toEqual({
      unlocked: false,
      filledFileUrl: null,
      blockedReason: "Awaiting final export sign-off",
    })
  })

  it("blocks while pending", () => {
    expect(
      resolveExportDownloadGate([review()], "https://blob.example/filled.xlsx")
    ).toEqual({
      unlocked: false,
      filledFileUrl: null,
      blockedReason: "Awaiting final export sign-off",
    })
  })

  it("blocks reject with reason", () => {
    expect(
      resolveExportDownloadGate(
        [
          review({
            status: "rejected",
            decisionNote: "rates look wrong",
            createdAt: "2026-01-16T12:00:00.000Z",
          }),
        ],
        "https://blob.example/filled.xlsx"
      )
    ).toEqual({
      unlocked: false,
      filledFileUrl: null,
      blockedReason: "Sign-off rejected: rates look wrong",
    })
  })

  it("unlocks only after Confirm on latest sign-off", () => {
    const url = "https://blob.example/filled.xlsx"
    expect(
      resolveExportDownloadGate(
        [
          review({
            status: "resolved",
            resolution: { decision: "approved" },
            createdAt: "2026-01-16T12:00:00.000Z",
          }),
          review({
            status: "pending",
            createdAt: "2026-01-17T12:00:00.000Z",
          }),
        ],
        url
      )
    ).toEqual({
      unlocked: false,
      filledFileUrl: null,
      blockedReason: "Awaiting final export sign-off",
    })

    expect(
      resolveExportDownloadGate(
        [
          review({
            status: "resolved",
            resolution: { decision: "approved" },
            createdAt: "2026-01-17T12:00:00.000Z",
          }),
        ],
        url
      )
    ).toEqual({
      unlocked: true,
      filledFileUrl: url,
      blockedReason: null,
    })
  })
})
