/**
 * Client-safe surface — no Node builtins, no `@ship-happens/db` / `pg`.
 * Use from Next.js Client Components. Server code may use `@ship-happens/fill`.
 */

export {
  DomainError,
  domainErrorMessage,
  domainErrorStatus,
  isDomainError,
  type DomainErrorCode,
} from "./errors"

export {
  asRfpStatus,
  RFP_STATUS_LABEL,
  type RfpDetailView,
  type RfpEmailRef,
  type RfpFillReportView,
  type RfpListItem,
  type RfpLogView,
  type RfpFeeBindingView,
  type RfpMappedLaneView,
  type RfpPendingReviewView,
  type RfpProgressStepView,
  type RfpSourceFileView,
  type RfpStatus,
} from "./rfp/rfp.types"

export {
  isBidOverdue,
  isRfpBidOutcome,
  resolveEffectiveBidOutcome,
  RFP_BID_OUTCOME_HINT,
  RFP_BID_OUTCOME_LABEL,
  RFP_BID_OUTCOMES,
  type RfpBidOutcome,
} from "./rfp/fill-bid-outcome"

export type {
  FeeBindingDoc,
  MappedLane,
  MappingDocument,
} from "./rates/mapped-lane"
export {
  isLowConfidenceMapping,
  MAP_LOW_CONFIDENCE_THRESHOLD,
  mappedLaneFromProposal,
} from "./rates/proposal-to-mapped-lane"
export {
  DEFAULT_UNEXPECTED_FEE_MODE,
  isUnexpectedFeeMode,
  proposeFeeBindingsFromLabels,
  UNEXPECTED_FEE_REVIEW_SOURCE,
  UNEXPECTED_FEE_SETTINGS_PATH,
  type FeeBinding,
  type UnexpectedFeeMode,
} from "./rates/fee-bindings"
export {
  parseUnexpectedFeeSoftWarn,
  type UnexpectedFeeWarningPayload,
} from "./rates/unexpected-fee-gate"
export type {
  FillOrgSettingsView,
  UpdateFillOrgSettingsInput,
} from "./settings/fill-org-settings.types"

export {
  lanePriceAuditFromMetadata,
  toFillReportCellView,
  type FillAuditCellOutcome,
  type FillReportCellView,
  type LaneOverlayAudit,
  type LaneOverlayMode,
  type LanePickConfidenceAudit,
  type LanePriceAudit,
  type LaneStarboardAudit,
  type StarboardRateChannel,
} from "./rates/lane-price-audit"
export {
  isLowConfidenceRatePick,
  RATE_PICK_LOW_CONFIDENCE_THRESHOLD,
  RATE_PICK_REVIEW_SOURCE,
  type RatePickConfidenceReason,
} from "./rates/rate-pick-confidence"

export {
  ALLOWED_SPREADSHEET_MIME_TYPES,
  extensionForMime,
  MAX_SPREADSHEET_BYTES,
  sanitizeFileName,
  type AllowedSpreadsheetMime,
} from "./spreadsheet-constants"

export {
  OVERLAY_RULE_MODES,
  type CreateOverlayRuleInput,
  type OverlayRuleMode,
  type OverlayRuleView,
  type UpdateOverlayRuleInput,
} from "./overlay/overlay.types"

export {
  MARGIN_FLOOR_REVIEW_SOURCE,
  type CreateMarginFloorRuleInput,
  type MarginFloorRuleView,
  type UpdateMarginFloorRuleInput,
} from "./overlay/margin-floor.types"

export {
  EXPORT_SIGNOFF_REVIEW_SOURCE,
  EXPORT_SIGNOFF_TITLE,
  isExportSignoffConfirmed,
  resolveExportDownloadGate,
  type ExportDownloadGate,
} from "./export/export-signoff"

export {
  FILL_PIPELINE_EVENT_TYPES,
  type FillPipelineEventType,
} from "./analytics/fill-pipeline-events"
export {
  OPS_ANALYTICS_DEFAULT_WINDOW_DAYS,
  type OpsAnalyticsAgingBucket,
  type OpsAnalyticsBidConversion,
  type OpsAnalyticsFailureReason,
  type OpsAnalyticsMappingQuality,
  type OpsAnalyticsMarginImpact,
  type OpsAnalyticsMilestoneCount,
  type OpsAnalyticsNamedCount,
  type OpsAnalyticsRateCoverage,
  type OpsAnalyticsStatusBucket,
  type OpsAnalyticsView,
} from "./analytics/ops-analytics.types"
