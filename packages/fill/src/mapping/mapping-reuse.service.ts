import { DomainError } from "../errors"
import type { FillPipelineManager } from "../pipeline/fill-pipeline.manager"
import type { ReviewItemService } from "../review/review-item.service"
import type { FillMappingService } from "../rates/fill-mapping.service"
import type { MappedLane } from "../rates/mapped-lane"
import type { RfpRepository } from "../rfp/rfp.repository"
import {
  classifyMappingReuse,
  fingerprintFromSource,
  MAPPING_REUSE_SOURCE,
  summarizeMappingReuse,
  type ClassifiedMappingLane,
  type MappingReuseClassification,
  type MappingReuseContext,
  type MappingReuseSummary,
} from "./mapping-reuse"

export type ApplyMappingReuseInput = {
  organizationId: string
  parentFillId: string
  fillId: string
  fingerprint?: MappingReuseContext
}

export type MappingReuseProposeResult = {
  fillId: string
  parentRfpId: string
  classification: MappingReuseClassification
  summary: MappingReuseSummary
}

export type MappingReuseApplyResult = MappingReuseSummary & {
  fillId: string
  mapConfirmed: boolean
  reusedLaneIds: string[]
  reviewIds: string[]
}

/**
 * Copy a confirmed mapping onto a later workbook round.
 * Nearby column/row anchors are upserted. Larger header or coordinate moves
 * become pending map reviews and do not complete the map step.
 */
export class MappingReuseService {
  constructor(
    private readonly rfps: RfpRepository,
    private readonly mapping: FillMappingService,
    private readonly reviews: ReviewItemService,
    private readonly pipeline: FillPipelineManager
  ) {}

  async proposeFromParent(
    input: ApplyMappingReuseInput
  ): Promise<MappingReuseProposeResult> {
    const { classified, parentFillId } = await this.classify(input)
    return {
      fillId: input.fillId,
      parentRfpId: parentFillId,
      classification: classified,
      summary: summarizeMappingReuse(parentFillId, classified),
    }
  }

  async applyFromParent(
    input: ApplyMappingReuseInput
  ): Promise<MappingReuseApplyResult> {
    const { classified, parentFillId } = await this.classify(input)
    const summary = summarizeMappingReuse(parentFillId, classified)
    const reviewIds: string[] = []

    for (const item of classified.drifted) {
      const review = await this.reviews.create(
        input.organizationId,
        input.fillId,
        {
          title: driftTitle(item.parent),
          stepKey: "map",
          source: MAPPING_REUSE_SOURCE,
          proposal: driftProposal(item, parentFillId),
          sourceMetadata: {
            parentRfpId: parentFillId,
            parentLaneId: item.parent.laneId,
            reason: item.reason,
          },
        }
      )
      reviewIds.push(review.id)
    }

    const reusedLanes = classified.reused
      .map((item) => item.lane)
      .filter((lane): lane is MappedLane => lane != null)
    const mapConfirmed =
      reusedLanes.length > 0 && classified.drifted.length === 0

    if (reusedLanes.length > 0) {
      await this.mapping.upsertLanes(
        input.organizationId,
        input.fillId,
        reusedLanes,
        { confirmMap: mapConfirmed }
      )
    }

    const message = reuseLogMessage(summary)
    await this.pipeline.appendLog({
      rfpId: input.fillId,
      stepKey: "map",
      source: MAPPING_REUSE_SOURCE,
      level: summary.drifted > 0 || summary.removed > 0 ? "warn" : "info",
      message,
      metadata: { ...summary },
    })

    await this.pipeline.appendPipelineEvent({
      rfpId: input.fillId,
      organizationId: input.organizationId,
      type: "mapping.reused",
      stepKey: "map",
      payload: { ...summary },
    })

    if (summary.drifted > 0 || summary.removed > 0) {
      await this.pipeline.appendPipelineEvent({
        rfpId: input.fillId,
        organizationId: input.organizationId,
        type: "mapping.drift_detected",
        stepKey: "map",
        payload: {
          parentRfpId: parentFillId,
          drifted: summary.drifted,
          removed: summary.removed,
          feeDrift: summary.feeDrift,
        },
      })
    }

    await this.rfps.mergeMetadata(input.fillId, {
      mappingReuseSummary: summary,
    })

    return {
      ...summary,
      fillId: input.fillId,
      mapConfirmed,
      reusedLaneIds: reusedLanes.map((lane) => lane.laneId),
      reviewIds,
    }
  }

  private async classify(input: ApplyMappingReuseInput): Promise<{
    parentFillId: string
    classified: MappingReuseClassification
  }> {
    if (input.parentFillId === input.fillId) {
      throw new DomainError(
        "Mapping reuse parent and target must be different fills",
        "VALIDATION"
      )
    }

    const parent = await this.rfps.findByIdForOrganization(
      input.organizationId,
      input.parentFillId
    )
    if (!parent) {
      throw new DomainError(
        `Fill not found: ${input.parentFillId}`,
        "NOT_FOUND"
      )
    }
    const fill = await this.rfps.findByIdForOrganization(
      input.organizationId,
      input.fillId
    )
    if (!fill) {
      throw new DomainError(`Fill not found: ${input.fillId}`, "NOT_FOUND")
    }

    const listed = await this.mapping.list(
      input.organizationId,
      input.parentFillId
    )
    const fingerprint =
      input.fingerprint ?? (await this.fingerprintForFill(input.fillId))
    return {
      parentFillId: input.parentFillId,
      classified: classifyMappingReuse(listed.lanes, fingerprint),
    }
  }

  private async fingerprintForFill(
    fillId: string
  ): Promise<MappingReuseContext> {
    const files = await this.rfps.listSourceFiles(fillId)
    const latest = files[0]
    if (!latest) return {}
    const sheetNames = Array.isArray(latest.sheetNames)
      ? latest.sheetNames.filter(
          (name): name is string => typeof name === "string"
        )
      : []
    const parseMetadata =
      latest.parseMetadata &&
      typeof latest.parseMetadata === "object" &&
      !Array.isArray(latest.parseMetadata)
        ? (latest.parseMetadata as Record<string, unknown>)
        : {}
    return fingerprintFromSource({ sheetNames, parseMetadata })
  }
}

function driftTitle(lane: MappedLane): string {
  return `Mapping drift: ${lane.originLocode} → ${lane.destLocode} ${lane.equipmentType}`
}

function driftProposal(
  item: ClassifiedMappingLane,
  parentRfpId: string
): Record<string, unknown> {
  const parent = item.parent
  const suggested = item.suggested
  const proposal: Record<string, unknown> = {
    kind: "mapping-reuse",
    reason: item.reason,
    parentRfpId,
    laneId: parent.laneId,
    originLocode: parent.originLocode,
    destLocode: parent.destLocode,
    equipmentType: parent.equipmentType,
    parentAnchors: {
      sheetName: parent.sheetName ?? null,
      columnKey: parent.columnKey ?? null,
      cellRef: parent.cellRef ?? null,
      rowIndex: parent.rowIndex ?? null,
    },
    suggestedAnchors: suggested ?? null,
  }
  if (parent.serviceType) proposal.serviceType = parent.serviceType
  const sheetName = suggested?.sheetName ?? parent.sheetName
  const columnKey = suggested?.columnKey ?? parent.columnKey
  const cellRef = suggested?.cellRef ?? parent.cellRef
  const rowIndex = suggested?.rowIndex ?? parent.rowIndex
  if (sheetName) proposal.sheetName = sheetName
  if (columnKey) proposal.columnKey = columnKey
  if (cellRef) proposal.cellRef = cellRef
  if (rowIndex != null) proposal.rowIndex = rowIndex
  if (parent.surchargeSlots && parent.surchargeSlots.length > 0) {
    proposal.surchargeSlots = parent.surchargeSlots
  }
  return proposal
}

function reuseLogMessage(summary: MappingReuseSummary): string {
  const fee =
    summary.feeDrift > 0
      ? `; fee slots drifted on ${summary.feeDrift} reused lane(s) (parent bindings kept)`
      : ""
  return `Mapping reuse from ${summary.parentRfpId}: reused ${summary.reused}, drifted ${summary.drifted}, removed ${summary.removed}${fee}`
}
