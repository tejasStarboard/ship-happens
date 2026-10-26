import {
  asRfpStatus,
  type RfpDetailView,
  type RfpListItem,
} from "@/lib/domain/rfp/rfp.types"
import type { RfpRepository } from "@/lib/domain/rfp/rfp.repository"
import type { FillPipelineManager } from "@/lib/domain/pipeline/fill-pipeline.manager"
import type {
  FillReportRepository,
  ReviewItemService,
  RfpBidOutcome,
} from "@ship-happens/fill"
import {
  domainErrorMessage,
  isDomainError,
  isRfpBidOutcome,
  mappingReuseSummaryFromMetadata,
  resolveEffectiveBidOutcome,
  resolveExportDownloadGate,
  toFillReportCellViewsWithBidPriority,
  type MappingStore,
} from "@ship-happens/fill"

function asStoredBidOutcome(
  value: string | null | undefined
): RfpBidOutcome | null {
  return isRfpBidOutcome(value) ? value : null
}

function bidFieldsFromRow(row: {
  dueAt: Date | null
  bidOutcome: string | null
  decidedAt?: Date | null
}) {
  const bidOutcome = asStoredBidOutcome(row.bidOutcome)
  const dueAt = row.dueAt?.toISOString() ?? null
  const effective = resolveEffectiveBidOutcome({
    bidOutcome,
    dueAt: row.dueAt,
  })
  return {
    dueAt,
    bidOutcome,
    effectiveBidOutcome: effective.outcome,
    bidOutcomeDerived: effective.derived,
    decidedAt: row.decidedAt?.toISOString() ?? null,
  }
}

export class RfpService {
  constructor(
    private readonly repo: RfpRepository,
    private readonly pipeline: FillPipelineManager,
    private readonly reviews: ReviewItemService,
    private readonly fillReports: FillReportRepository,
    private readonly mappingStore: MappingStore
  ) {}

  async list(
    organizationId: string,
    ownerDisplayName: string
  ): Promise<RfpListItem[]> {
    const rows = await this.repo.listByOrganization(organizationId)
    return rows.map((row) => {
      const meta = (row.metadata ?? {}) as {
        templateName?: string
        intakeSource?: string
        email?: RfpListItem["emailRef"]
      }
      return {
        id: row.id,
        name: row.name,
        customer: row.customer ?? "—",
        status: asRfpStatus(row.status),
        templateName: row.templateName ?? meta.templateName ?? "—",
        updatedAt: row.updatedAt.toISOString(),
        owner: ownerDisplayName || row.ownerName,
        emailRef:
          meta.intakeSource === "email" && meta.email ? meta.email : null,
        ...bidFieldsFromRow(row),
        parentRfpId: row.parentRfpId ?? null,
        roundNumber: row.roundNumber ?? 1,
      }
    })
  }

  async getDetail(
    organizationId: string,
    id: string,
    ownerDisplayName: string
  ): Promise<RfpDetailView | null> {
    const row = await this.repo.findByIdForOrganization(organizationId, id)
    if (!row) return null

    const meta = (row.metadata ?? {}) as {
      templateName?: string
      intakeSource?: string
      email?: RfpListItem["emailRef"]
    }
    const [progressSteps, logs, sourceFileRows, allReviews, report, mapping] =
      await Promise.all([
        this.pipeline.listSteps(row.id),
        this.pipeline.listLogs(row.id),
        this.repo.listSourceFiles(row.id),
        this.reviews.list(organizationId, row.id),
        this.fillReports.getReport(row.id),
        this.readMappedLanes(row.id),
      ])

    const pendingReviews = allReviews.filter(
      (item) => item.status === "pending"
    )
    const downloadGate = resolveExportDownloadGate(
      allReviews,
      row.filledFileUrl
    )

    const blockedKeys = new Set(
      pendingReviews
        .map((item) => item.stepKey)
        .filter((key): key is string => key != null && key.length > 0)
    )

    return {
      id: row.id,
      name: row.name,
      customer: row.customer ?? "—",
      status: asRfpStatus(row.status),
      templateName: row.templateName ?? meta.templateName ?? "—",
      updatedAt: row.updatedAt.toISOString(),
      owner: ownerDisplayName || row.ownerName,
      emailRef: meta.intakeSource === "email" && meta.email ? meta.email : null,
      ...bidFieldsFromRow(row),
      parentRfpId: row.parentRfpId ?? null,
      roundNumber: row.roundNumber ?? 1,
      mappingReuseSummary: mappingReuseSummaryFromMetadata(row.metadata),
      filledFileUrl: downloadGate.filledFileUrl,
      exportDownloadBlockedReason: downloadGate.blockedReason,
      progressSteps: progressSteps.map((step) => ({
        id: step.id,
        key: step.key,
        label: step.label,
        status: step.status,
        detail: step.detail,
        sortOrder: step.sortOrder,
        startedAt: step.startedAt?.toISOString() ?? null,
        completedAt: step.completedAt?.toISOString() ?? null,
        blockedByReview: blockedKeys.has(step.key),
      })),
      logs: logs.map((log) => ({
        id: log.id,
        level: log.level,
        message: log.message,
        stepKey: log.stepKey,
        source: log.source,
        createdAt: log.createdAt.toISOString(),
      })),
      sourceFiles: sourceFileRows.map((file) => ({
        id: file.id,
        fileName: file.fileName,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
        fileUrl: file.fileUrl,
        sheetNames: (file.sheetNames as string[] | null) ?? [],
        createdAt: file.createdAt.toISOString(),
      })),
      pendingReviews: pendingReviews.map((item) => ({
        id: item.id,
        stepKey: item.stepKey,
        title: item.title,
        proposal: item.proposal,
        confidence: item.confidence,
        source: item.source,
        sourceMetadata: item.sourceMetadata,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      })),
      fillReport: report
        ? {
            summary: report.summary,
            filledCount: report.filledCount,
            skippedCount: report.skippedCount,
            needsHumanCount: report.needsHumanCount,
            errorCount: report.errorCount,
            cells: toFillReportCellViewsWithBidPriority(
              report.cells,
              pendingReviews
            ),
          }
        : null,
      mappedLanes: mapping.lanes,
      mappingError: mapping.error,
    }
  }

  private async readMappedLanes(fillId: string): Promise<{
    lanes: RfpDetailView["mappedLanes"]
    error: string | null
  }> {
    try {
      const lanes = await this.mappingStore.readMappedLanes(fillId)
      return {
        lanes: lanes.map((lane) => ({
          laneId: lane.laneId,
          originLocode: lane.originLocode,
          destLocode: lane.destLocode,
          equipmentType: lane.equipmentType,
          serviceType: lane.serviceType ?? null,
          sheetName: lane.sheetName ?? null,
          rowIndex: lane.rowIndex ?? null,
          columnKey: lane.columnKey ?? null,
          cellRef: lane.cellRef ?? null,
          surchargeSlots: lane.surchargeSlots ?? [],
          feeBindings: (lane.feeBindings ?? []).map((b) => ({
            heading: b.heading,
            columnKey: b.columnKey ?? null,
            cellRef: b.cellRef ?? null,
            sheetName: b.sheetName ?? null,
            confidence: b.confidence ?? null,
          })),
        })),
        error: null,
      }
    } catch (error) {
      const message = isDomainError(error)
        ? domainErrorMessage(error)
        : error instanceof Error
          ? error.message
          : "Failed to load mapping"
      return { lanes: [], error: message }
    }
  }
}
