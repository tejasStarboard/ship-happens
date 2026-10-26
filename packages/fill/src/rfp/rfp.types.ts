import type { FillReportCellView } from "../rates/lane-price-audit"

export type RfpStatus =
  "queued" | "running" | "needs_review" | "done" | "failed"

export const RFP_STATUS_LABEL: Record<RfpStatus, string> = {
  queued: "Queued",
  running: "Running",
  needs_review: "Needs review",
  done: "Done",
  failed: "Failed",
}

export type RfpListItem = {
  id: string
  name: string
  customer: string
  status: RfpStatus
  templateName: string
  updatedAt: string
  owner: string
}

export type RfpProgressStepView = {
  id: string
  key: string
  label: string
  status: string
  detail: string | null
  sortOrder: number
  startedAt: string | null
  completedAt: string | null
  /** True when at least one `pending` review wait targets this step. */
  blockedByReview?: boolean
}

export type RfpLogView = {
  id: string
  level: string
  message: string
  stepKey: string | null
  source: string | null
  createdAt: string
}

export type RfpSourceFileView = {
  id: string
  fileName: string
  mimeType: string
  sizeBytes: number
  fileUrl: string
  sheetNames: string[]
  createdAt: string
}

/** Pending HITL review card for Overview “Waiting on you” (ISO dates). */
export type RfpPendingReviewView = {
  id: string
  stepKey: string | null
  title: string
  proposal: Record<string, unknown>
  confidence: string | null
  source: string | null
  sourceMetadata: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

/** Aggregate fill-report counts + per-row pricing audit (Review / CLI). */
export type RfpFillReportView = {
  summary: string | null
  filledCount: number
  skippedCount: number
  needsHumanCount: number
  errorCount: number
  cells: FillReportCellView[]
}

export type RfpDetailView = RfpListItem & {
  progressSteps: RfpProgressStepView[]
  logs: RfpLogView[]
  sourceFiles: RfpSourceFileView[]
  /**
   * Filled workbook URL only when final export sign-off is Confirmed.
   * Null while gated (pending / rejected / edited) even if Blob exists.
   */
  filledFileUrl: string | null
  /** Why download is gated when an export artifact exists but is locked. */
  exportDownloadBlockedReason: string | null
  pendingReviews: RfpPendingReviewView[]
  fillReport: RfpFillReportView | null
}

export function asRfpStatus(value: string): RfpStatus {
  switch (value) {
    case "queued":
    case "running":
    case "needs_review":
    case "done":
    case "failed":
      return value
    case "cancelled":
      return "failed"
    default:
      return "queued"
  }
}
