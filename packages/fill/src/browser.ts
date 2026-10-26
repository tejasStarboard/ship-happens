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
  type RfpListItem,
  type RfpLogView,
  type RfpPendingReviewView,
  type RfpProgressStepView,
  type RfpSourceFileView,
  type RfpStatus,
} from "./rfp/rfp.types"

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
