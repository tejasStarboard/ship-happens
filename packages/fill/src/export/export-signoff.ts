/**
 * Final export sign-off (Phase 4 / SB-6671).
 * Phase 2b review item; download unlocks only after Confirm.
 */

export const EXPORT_SIGNOFF_REVIEW_SOURCE = "export-signoff" as const

export const EXPORT_SIGNOFF_TITLE = "Final export sign-off" as const

type SignoffReviewLike = {
  source: string | null
  status: string
  decisionNote: string | null
  resolution: Record<string, unknown> | null
  createdAt: Date | string
}

export function isExportSignoffConfirmed(review: SignoffReviewLike): boolean {
  if (review.source !== EXPORT_SIGNOFF_REVIEW_SOURCE) return false
  if (review.status !== "resolved") return false
  const decision = review.resolution?.decision
  return decision === "approved"
}

export type ExportDownloadGate = {
  unlocked: boolean
  /** Blob URL only when Confirm unlocked download; otherwise null. */
  filledFileUrl: string | null
  /** Human-facing block reason when artifact exists but download is gated. */
  blockedReason: string | null
}

/**
 * Confirm-only unlock. Latest export-signoff row wins.
 * Reject / Edit / pending keep download blocked.
 */
export function resolveExportDownloadGate(
  reviews: SignoffReviewLike[],
  filledFileUrl: string | null
): ExportDownloadGate {
  if (!filledFileUrl) {
    return { unlocked: false, filledFileUrl: null, blockedReason: null }
  }

  const signoffs = reviews
    .filter((row) => row.source === EXPORT_SIGNOFF_REVIEW_SOURCE)
    .slice()
    .sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime()
      const bTime = new Date(b.createdAt).getTime()
      return bTime - aTime
    })

  const latest = signoffs[0]
  if (!latest) {
    return {
      unlocked: false,
      filledFileUrl: null,
      blockedReason: "Awaiting final export sign-off",
    }
  }

  if (isExportSignoffConfirmed(latest)) {
    return { unlocked: true, filledFileUrl, blockedReason: null }
  }

  if (latest.status === "rejected") {
    const note = latest.decisionNote?.trim()
    return {
      unlocked: false,
      filledFileUrl: null,
      blockedReason: note ? `Sign-off rejected: ${note}` : "Sign-off rejected",
    }
  }

  return {
    unlocked: false,
    filledFileUrl: null,
    blockedReason: "Awaiting final export sign-off",
  }
}
