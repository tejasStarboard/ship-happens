export {
  DomainError,
  domainErrorMessage,
  domainErrorStatus,
  isDomainError,
  type DomainErrorCode,
} from "./errors"

export type {
  BlobStore,
  BlobUploadResult,
  EnsureRfpWorkspaceInput,
  WorkspaceHost,
} from "./ports"

export {
  FILL_PROGRESS_STEPS,
  FillPipelineManager,
  isProgressStepKey,
  PROGRESS_WAIT_DETAIL,
  type LogLevel,
  type ProgressStatus,
  type ProgressStepKey,
  type RfpRunStatus,
} from "./pipeline/fill-pipeline.manager"

export { RfpRepository, type AppDb } from "./rfp/rfp.repository"
export {
  asRfpStatus,
  RFP_STATUS_LABEL,
  type RfpDetailView,
  type RfpFillReportView,
  type RfpListItem,
  type RfpLogView,
  type RfpPendingReviewView,
  type RfpProgressStepView,
  type RfpSourceFileView,
  type RfpStatus,
} from "./rfp/rfp.types"

export {
  IntakeService,
  type SpreadsheetUploadInput,
  type TemplateUploadInput,
} from "./intake/intake.service"

export { ReviewItemRepository } from "./review/review-item.repository"
export {
  normalizeDecideInput,
  ReviewItemService,
} from "./review/review-item.service"
export {
  RESOLVABLE_REVIEW_STATUSES,
  REVIEW_ITEM_STATUSES,
  type CreateReviewItemInput,
  type DecideReviewItemInput,
  type NormalizedDecidePatch,
  type ResolvableReviewStatus,
  type ReviewItemStatus,
  type ReviewItemView,
  type UpdateReviewItemInput,
} from "./review/review-item.types"

export {
  ALLOWED_SPREADSHEET_MIME_TYPES,
  extensionForMime,
  MAX_SPREADSHEET_BYTES,
  sanitizeFileName,
  type AllowedSpreadsheetMime,
} from "./spreadsheet-constants"

export { checksumSha256, discoverWorkbookSheets } from "./workbook-parse"

export {
  MappedLaneSchema,
  MappingDocumentSchema,
  parseMappingDocument,
  parseMappingJson,
  SMOKE_MAPPING_FIXTURE,
  type MappedLane,
  type MappingDocument,
} from "./rates/mapped-lane"
export {
  mappedLaneToSearchInput,
  pickResolvedCandidate,
} from "./rates/lane-to-search-input"
export {
  FillReportRepository,
  type FillCellOutcome,
  type LaneCellRow,
  type UpsertLaneCellInput,
} from "./rates/fill-report.repository"
export {
  buildRateAuditMetadata,
  lanePriceAuditFromMetadata,
  toFillReportCellView,
  withOverlayAuditMetadata,
  type FillAuditCellOutcome,
  type FillReportCellView,
  type FillReportView,
  type LaneOverlayAudit,
  type LaneOverlayMode,
  type LanePriceAudit,
  type LaneStarboardAudit,
  type StarboardRateChannel,
} from "./rates/lane-price-audit"
export {
  RateResolutionService,
  type ResolveMappedLanesResult,
} from "./rates/rate-resolution.service"
export type {
  MappingStore,
  RateResolveSearchInput,
  ResolvedRateCandidate,
  ResolvedSurchargeCandidate,
  StarboardRatesPort,
} from "./rates/rate-ports"

export { matchOverlayRule } from "./overlay/match-overlay-rule"
export { matchMarginFloorRule } from "./overlay/match-margin-floor"
export {
  applyMarkup,
  checkFloor,
  parseMoney,
  type FloorBreach,
  type FloorCheckInput,
  type FloorCheckResult,
} from "./overlay/margin-math"
export { OverlayRuleRepository } from "./overlay/overlay-rule.repository"
export { OverlayRuleService } from "./overlay/overlay-rule.service"
export { MarginFloorRuleRepository } from "./overlay/margin-floor.repository"
export { MarginFloorRuleService } from "./overlay/margin-floor.service"
export {
  OverlayApplicationService,
  type ApplyOverlaysResult,
} from "./overlay/overlay-application.service"
export {
  OVERLAY_RULE_MODES,
  type CreateOverlayRuleInput,
  type MatchedOverlayRule,
  type OverlayLaneContext,
  type OverlayRuleMode,
  type OverlayRuleView,
  type UpdateOverlayRuleInput,
} from "./overlay/overlay.types"
export {
  MARGIN_FLOOR_REVIEW_SOURCE,
  type CreateMarginFloorRuleInput,
  type MarginFloorRuleView,
  type MatchedMarginFloorRule,
  type UpdateMarginFloorRuleInput,
} from "./overlay/margin-floor.types"
