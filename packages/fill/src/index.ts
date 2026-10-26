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
  SourceBytesFetcher,
  WorkbookCellWrite,
  WorkbookWritePort,
  WorkspaceHost,
} from "./ports"

export {
  selectExportCells,
  type ExportCellPlan,
} from "./export/select-export-cells"
export {
  EXPORT_SIGNOFF_REVIEW_SOURCE,
  EXPORT_SIGNOFF_TITLE,
  isExportSignoffConfirmed,
  resolveExportDownloadGate,
  type ExportDownloadGate,
} from "./export/export-signoff"
export {
  WorkbookExportService,
  type ExportWorkbookResult,
} from "./export/workbook-export.service"

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

export {
  FILL_PIPELINE_EVENT_TYPES,
  STEP_DONE_PIPELINE_EVENT,
  pipelineEventForStepDone,
  type FillPipelineEventType,
} from "./analytics/fill-pipeline-events"
export { OpsAnalyticsService } from "./analytics/ops-analytics.service"
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

export { RfpRepository, type AppDb } from "./rfp/rfp.repository"
export {
  isBidOverdue,
  isRfpBidOutcome,
  resolveEffectiveBidOutcome,
  RFP_BID_OUTCOME_HINT,
  RFP_BID_OUTCOME_LABEL,
  RFP_BID_OUTCOMES,
  type RfpBidOutcome,
} from "./rfp/fill-bid-outcome"
export {
  FillBidOutcomeService,
  type DecideFillBidOutcomeInput,
  type SetFillDueAtInput,
} from "./rfp/fill-bid-outcome.service"
export {
  asRfpStatus,
  RFP_STATUS_LABEL,
  type RfpDetailView,
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
  IntakeService,
  type CreateFillRevisionInput,
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
  FeeBindingSchema,
  MappedLaneSchema,
  MappingDocumentSchema,
  parseMappingDocument,
  parseMappingJson,
  SMOKE_MAPPING_FIXTURE,
  type FeeBindingDoc,
  type MappedLane,
  type MappingDocument,
} from "./rates/mapped-lane"
export {
  allocateLaneFees,
  DEFAULT_UNEXPECTED_FEE_MODE,
  feeBindingsForPersist,
  isUnexpectedFeeMode,
  normalizeFeeBindings,
  proposeFeeBindingsFromLabels,
  UNEXPECTED_FEE_REVIEW_SOURCE,
  UNEXPECTED_FEE_SETTINGS_PATH,
  type FeeBinding,
  type FeeCellAllocation,
  type LaneFeeAllocation,
  type UnexpectedFeeLine,
  type UnexpectedFeeMode,
} from "./rates/fee-bindings"
export {
  encodeUnexpectedFeeSoftWarn,
  parseUnexpectedFeeSoftWarn,
  type UnexpectedFeeWarningPayload,
} from "./rates/unexpected-fee-gate"
export {
  classifySurchargeName,
  DEFAULT_HEADING_BUCKETS,
  normalizeChargeToken,
  rollupCharges,
} from "./rates/charge-ontology"
export { FillOrgSettingsRepository } from "./settings/fill-org-settings.repository"
export { FillOrgSettingsService } from "./settings/fill-org-settings.service"
export type {
  FillOrgSettingsView,
  UpdateFillOrgSettingsInput,
} from "./settings/fill-org-settings.types"
export {
  isLowConfidenceMapping,
  MAP_LOW_CONFIDENCE_THRESHOLD,
  mappedLaneFromProposal,
} from "./rates/proposal-to-mapped-lane"
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
export { FillMappingRepository } from "./rates/fill-mapping.repository"
export {
  FillMappingService,
  type ReplaceMappedLanesResult,
} from "./rates/fill-mapping.service"
export { createDbMappingStore } from "./rates/db-mapping-store"
export {
  decidePlaceFromChoice,
  decidePlaceWithoutJev,
  GEO_MAX_CHIPS,
  GEO_NONE_KEY,
  type JevPlaceChoice,
} from "./mapping/decide-place"
export type {
  CrmMatchPort,
  CrmMatchResult,
  GeoCandidate,
  GeoResolvePort,
  PlaceCandidateChip,
  PlaceResolveResult,
} from "./mapping/geo-ports"
export { PlaceMappingService } from "./mapping/place-mapping.service"
export {
  classifyMappingReuse,
  columnLetterFromCellRef,
  fingerprintFromSource,
  MAPPING_REUSE_ROW_TOLERANCE,
  MAPPING_REUSE_SOURCE,
  mappingReuseSummaryFromMetadata,
  summarizeMappingReuse,
  type ClassifiedMappingLane,
  type MappingReuseAnchor,
  type MappingReuseClassification,
  type MappingReuseContext,
  type MappingReuseCoordinate,
  type MappingReuseSummary,
} from "./mapping/mapping-reuse"
export {
  MappingReuseService,
  type ApplyMappingReuseInput,
  type MappingReuseApplyResult,
  type MappingReuseProposeResult,
} from "./mapping/mapping-reuse.service"
export type {
  LanePlaceInput,
  LanePlaceProposal,
  MapReviewProposal,
  ProposeLanesInput,
  ProposeLanesResult,
} from "./mapping/place-mapping.types"
export {
  buildRateAuditMetadata,
  lanePriceAuditFromMetadata,
  toFillReportCellView,
  withOverlayAuditMetadata,
  withPickConfidenceMetadata,
  type FillAuditCellOutcome,
  type FillReportCellView,
  type FillReportView,
  type LaneOverlayAudit,
  type LaneOverlayMode,
  type LanePickConfidenceAudit,
  type LanePriceAudit,
  type LaneStarboardAudit,
  type StarboardRateChannel,
} from "./rates/lane-price-audit"
export {
  isLowConfidenceRatePick,
  rankPricedBuys,
  RATE_PICK_LOW_CONFIDENCE_THRESHOLD,
  RATE_PICK_REVIEW_SOURCE,
  scoreContractPick,
  scoreOverlayPick,
  type RatePickConfidence,
  type RatePickConfidenceReason,
} from "./rates/rate-pick-confidence"
export {
  collectPendingBidPriorityLanes,
  compareLaneBidPriorityDesc,
  LANE_BID_PRIORITY_ATTENTION_SCORE,
  LANE_BID_PRIORITY_CRITICAL_SCORE,
  LANE_BID_PRIORITY_FACTOR_LABEL,
  LANE_BID_PRIORITY_TIER_LABEL,
  laneKeyFromAudit,
  scoreLaneBidPriority,
  toFillReportCellViewsWithBidPriority,
  type LaneBidPriority,
  type LaneBidPriorityFactor,
  type LaneBidPriorityTier,
} from "./rates/lane-bid-priority"
export {
  RateResolutionService,
  type ResolveMappedLanesResult,
} from "./rates/rate-resolution.service"
export type {
  MappingFileReader,
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
