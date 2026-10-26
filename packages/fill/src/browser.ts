/**
 * Client-safe surface — no Node builtins, no `@workspace/db` / `pg`.
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
  type RfpFillReportView,
  type RfpListItem,
  type RfpLogView,
  type RfpMappedLaneView,
  type RfpPendingReviewView,
  type RfpProgressStepView,
  type RfpSourceFileView,
  type RfpStatus,
} from "./rfp/rfp.types"

export {
  lanePriceAuditFromMetadata,
  toFillReportCellView,
  type FillAuditCellOutcome,
  type FillReportCellView,
  type LaneOverlayAudit,
  type LaneOverlayMode,
  type LanePriceAudit,
  type LaneStarboardAudit,
  type StarboardRateChannel,
} from "./rates/lane-price-audit"

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
