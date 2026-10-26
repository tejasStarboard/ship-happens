import type { MappingReuseSummary } from "../mapping/mapping-reuse"
import type { FillReportCellView } from "../rates/lane-price-audit"
import type { RfpBidOutcome } from "./fill-bid-outcome"

export type RfpStatus =
  "queued" | "running" | "needs_review" | "done" | "failed"

export type { RfpBidOutcome }

export const RFP_STATUS_LABEL: Record<RfpStatus, string> = {
  queued: "Queued",
  running: "Running",
  needs_review: "Needs review",
  done: "Done",
  failed: "Failed",
}

/** Email provenance when the fill was created via mailbox intake. */
export type RfpEmailRef = {
  provider: "gmail" | "outlook"
  messageId: string
  threadId?: string
  from?: string
  subject?: string
  receivedAt?: string
}

export type RfpListItem = {
  id: string
  name: string
  customer: string
  status: RfpStatus
  templateName: string
  updatedAt: string
  owner: string
  /** Present when `metadata.intakeSource === "email"`. */
  emailRef?: RfpEmailRef | null
  /** Optional bid due date (ISO). */
  dueAt?: string | null
  /** Stored commercial outcome (null until decided). */
  bidOutcome?: RfpBidOutcome | null
  /** Effective outcome including derived expired when past due. */
  effectiveBidOutcome?: RfpBidOutcome | null
  /** True when effective outcome is derived (past due, undecided). */
  bidOutcomeDerived?: boolean
  decidedAt?: string | null
  /** Previous round in this lineage. Null on round 1. */
  parentRfpId?: string | null
  /** 1-based round. Absent on older payloads means round 1. */
  roundNumber?: number
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

/**
 * Read-only confirmed lane for Map tab (Postgres `rfp_mapped_lanes`).
 * `mapping.json` remains import/export only.
 */
export type RfpFeeBindingView = {
  heading: string
  columnKey: string | null
  cellRef: string | null
  sheetName: string | null
  confidence: number | null
}

export type RfpMappedLaneView = {
  laneId: string
  originLocode: string
  destLocode: string
  equipmentType: string
  serviceType: string | null
  sheetName: string | null
  rowIndex: number | null
  columnKey: string | null
  cellRef: string | null
  surchargeSlots: string[]
  feeBindings: RfpFeeBindingView[]
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
  /** Confirmed Map / rates lanes from Postgres (may be empty). */
  mappedLanes: RfpMappedLaneView[]
  /** Set when mapping load/import fails to parse. */
  mappingError: string | null
  dueAt: string | null
  bidOutcome: RfpBidOutcome | null
  effectiveBidOutcome: RfpBidOutcome | null
  bidOutcomeDerived: boolean
  decidedAt: string | null
  /** Counts from the last mapping reuse onto this fill, when one ran. */
  mappingReuseSummary?: MappingReuseSummary | null
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
