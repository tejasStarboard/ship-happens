import { DomainError } from "../errors"
import type { FillPipelineManager } from "../pipeline/fill-pipeline.manager"
import type { ReviewItemService } from "../review/review-item.service"
import type { ReviewItemView } from "../review/review-item.types"
import type { RfpRepository } from "../rfp/rfp.repository"
import { isLowConfidenceMapping } from "../rates/proposal-to-mapped-lane"
import type { FillMappingService } from "../rates/fill-mapping.service"
import type { MappedLane } from "../rates/mapped-lane"
import type {
  CrmMatchPort,
  GeoResolvePort,
  PlaceResolveResult,
} from "./geo-ports"
import type {
  LanePlaceInput,
  LanePlaceProposal,
  MapReviewProposal,
  ProposeLanesInput,
  ProposeLanesResult,
} from "./place-mapping.types"

const MAPPER_SOURCE = "jev-geo"

export class PlaceMappingService {
  constructor(
    private readonly rfps: RfpRepository,
    private readonly mapping: FillMappingService,
    private readonly reviews: ReviewItemService,
    private readonly geo: GeoResolvePort,
    private readonly crm?: CrmMatchPort,
    private readonly pipeline?: FillPipelineManager
  ) {}

  /**
   * Resolve O-D labels via Jev geo, upsert high-confidence lanes, open map
   * reviews for the rest. Optional CRM match fails open.
   */
  async proposeLanes(
    organizationId: string,
    fillId: string,
    input: ProposeLanesInput
  ): Promise<ProposeLanesResult> {
    const fill = await this.rfps.findByIdForOrganization(organizationId, fillId)
    if (!fill) {
      throw new DomainError(`Fill not found: ${fillId}`, "NOT_FOUND")
    }
    if (!Array.isArray(input.lanes) || input.lanes.length === 0) {
      throw new DomainError("lanes must be a non-empty array", "VALIDATION")
    }

    await this.pipeline?.startStep(fillId, "map").catch(() => undefined)
    await this.pipeline?.appendLog({
      rfpId: fillId,
      stepKey: "map",
      source: MAPPER_SOURCE,
      message: `Jev geo propose for ${input.lanes.length} lane(s)`,
    })

    const customerMatch = await this.tryCustomerMatch(
      organizationId,
      fillId,
      fill.customer,
      input.customerLabel
    )

    const proposals: LanePlaceProposal[] = []
    const reviewViews: ReviewItemView[] = []
    const toUpsert: MappedLane[] = []

    for (const laneInput of input.lanes) {
      const { proposal, review } = await this.proposeOneLane(
        organizationId,
        fillId,
        laneInput
      )
      proposals.push(proposal)
      if (proposal.action === "upserted" && proposal.lane) {
        toUpsert.push(proposal.lane)
      }
      if (review) reviewViews.push(review)
    }

    if (toUpsert.length > 0) {
      await this.mapping.upsertLanes(organizationId, fillId, toUpsert)
    }

    const upsertedCount = proposals.filter(
      (p) => p.action === "upserted"
    ).length
    const reviewCount = proposals.filter((p) => p.action === "review").length

    await this.pipeline?.appendLog({
      rfpId: fillId,
      stepKey: "map",
      source: MAPPER_SOURCE,
      level: "info",
      message: `Jev geo: upserted ${upsertedCount}, opened ${reviewCount} map review(s)`,
    })

    return {
      fillId,
      upsertedCount,
      reviewCount,
      customerMatch,
      lanes: proposals,
      reviews: reviewViews,
    }
  }

  private async proposeOneLane(
    organizationId: string,
    fillId: string,
    laneInput: LanePlaceInput
  ): Promise<{ proposal: LanePlaceProposal; review: ReviewItemView | null }> {
    const laneId = laneInput.laneId?.trim()
    const originLabel = laneInput.originLabel?.trim()
    const destLabel = laneInput.destLabel?.trim()
    const equipmentType = laneInput.equipmentType?.trim()
    if (!laneId || !originLabel || !destLabel || !equipmentType) {
      throw new DomainError(
        "Each lane requires laneId, originLabel, destLabel, equipmentType",
        "VALIDATION"
      )
    }

    const [origin, destination] = await Promise.all([
      this.geo.resolvePlace(originLabel),
      this.geo.resolvePlace(destLabel),
    ])

    const confidence = laneConfidence(origin, destination)
    const bothCertain =
      origin.certain &&
      destination.certain &&
      Boolean(origin.locode) &&
      Boolean(destination.locode)

    const lane = buildLane(laneInput, origin.locode, destination.locode)

    if (bothCertain && lane && !isLowConfidenceMapping(confidence)) {
      return {
        proposal: {
          laneId,
          action: "upserted",
          confidence,
          origin,
          destination,
          lane,
          reviewId: null,
        },
        review: null,
      }
    }

    const proposalBody = buildReviewProposal(
      laneInput,
      origin,
      destination,
      lane
    )
    const review = await this.reviews.create(organizationId, fillId, {
      title: `Map lane ${laneId}: ${originLabel} → ${destLabel}`,
      stepKey: "map",
      proposal: proposalBody as unknown as Record<string, unknown>,
      confidence,
      source: MAPPER_SOURCE,
      sourceMetadata: {
        laneId,
        originLabel,
        destLabel,
        originBlocked: origin.blocked ?? null,
        destBlocked: destination.blocked ?? null,
      },
    })

    return {
      proposal: {
        laneId,
        action: "review",
        confidence,
        origin,
        destination,
        lane,
        reviewId: review.id,
      },
      review,
    }
  }

  private async tryCustomerMatch(
    organizationId: string,
    fillId: string,
    existingCustomer: string | null,
    customerLabel: string | null | undefined
  ): Promise<ProposeLanesResult["customerMatch"]> {
    const label = customerLabel?.trim()
    if (!label || !this.crm) return null
    try {
      const match = await this.crm.matchCustomer(label)
      if (!match) return null
      let applied = false
      if (!existingCustomer?.trim()) {
        await this.rfps.updateCustomer(fillId, match.displayName)
        applied = true
      }
      void organizationId
      return {
        displayName: match.displayName,
        confidence: match.confidence,
        applied,
      }
    } catch {
      return null
    }
  }
}

function laneConfidence(
  origin: PlaceResolveResult,
  destination: PlaceResolveResult
): number {
  if (!origin.locode || !destination.locode) return 0
  return Math.min(origin.confidence, destination.confidence)
}

function buildLane(
  input: LanePlaceInput,
  originLocode: string | null,
  destLocode: string | null
): MappedLane | null {
  if (!originLocode || !destLocode) return null
  const lane: MappedLane = {
    laneId: input.laneId.trim(),
    originLocode,
    destLocode,
    equipmentType: input.equipmentType.trim(),
  }
  if (input.validFrom) lane.validFrom = input.validFrom
  if (input.validTo) lane.validTo = input.validTo
  if (input.serviceType) lane.serviceType = input.serviceType
  if (input.sheetName) lane.sheetName = input.sheetName
  if (input.rowIndex !== undefined) lane.rowIndex = input.rowIndex
  if (input.columnKey) lane.columnKey = input.columnKey
  if (input.cellRef) lane.cellRef = input.cellRef
  if (input.surchargeSlots) lane.surchargeSlots = input.surchargeSlots
  return lane
}

function buildReviewProposal(
  input: LanePlaceInput,
  origin: PlaceResolveResult,
  destination: PlaceResolveResult,
  lane: MappedLane | null
): MapReviewProposal {
  return {
    laneId: input.laneId.trim(),
    originLocode:
      lane?.originLocode ?? origin.locode ?? origin.candidates[0]?.locode ?? "",
    destLocode:
      lane?.destLocode ??
      destination.locode ??
      destination.candidates[0]?.locode ??
      "",
    equipmentType: input.equipmentType.trim(),
    originLabel: input.originLabel.trim(),
    destLabel: input.destLabel.trim(),
    originCandidates: origin.candidates,
    destCandidates: destination.candidates,
    ...(input.validFrom ? { validFrom: input.validFrom } : {}),
    ...(input.validTo ? { validTo: input.validTo } : {}),
    ...(input.serviceType ? { serviceType: input.serviceType } : {}),
    ...(input.sheetName ? { sheetName: input.sheetName } : {}),
    ...(input.rowIndex !== undefined ? { rowIndex: input.rowIndex } : {}),
    ...(input.columnKey ? { columnKey: input.columnKey } : {}),
    ...(input.cellRef ? { cellRef: input.cellRef } : {}),
    ...(input.surchargeSlots ? { surchargeSlots: input.surchargeSlots } : {}),
  }
}
