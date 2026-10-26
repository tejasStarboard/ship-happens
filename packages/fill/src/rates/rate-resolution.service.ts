import { DomainError } from "../errors"
import type { FillPipelineManager } from "../pipeline/fill-pipeline.manager"
import type { RfpRepository } from "../rfp/rfp.repository"
import type { ReviewItemService } from "../review/review-item.service"
import type { ReviewItemView } from "../review/review-item.types"
import type {
  FillReportRepository,
  UpsertLaneCellInput,
} from "./fill-report.repository"
import { buildRateAuditMetadata } from "./lane-price-audit"
import {
  mappedLaneToSearchInput,
  pickResolvedCandidate,
} from "./lane-to-search-input"
import type { ReviewItemRepository } from "../review/review-item.repository"
import type { MappedLane } from "./mapped-lane"
import type { MappingStore, StarboardRatesPort } from "./rate-ports"
import {
  isLowConfidenceRatePick,
  rankPricedBuys,
  RATE_PICK_REVIEW_SOURCE,
  scoreContractPick,
} from "./rate-pick-confidence"

const DEFAULT_CONCURRENCY = 3
const MAP_STEP_KEY = "map"
const RATES_STEP_KEY = "rates"

export type ResolveMappedLanesResult = {
  fillId: string
  hitCount: number
  noHitCount: number
  errorCount: number
  weakPickCount: number
  detail: string
  cells: UpsertLaneCellInput[]
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let next = 0
  const runners = Array.from(
    { length: Math.min(concurrency, Math.max(items.length, 1)) },
    async () => {
      while (next < items.length) {
        const index = next++
        results[index] = await worker(items[index]!, index)
      }
    }
  )
  await Promise.all(runners)
  return results
}

function laneKeyForCell(cell: UpsertLaneCellInput): string {
  const laneId = cell.metadata?.laneId
  if (typeof laneId === "string" && laneId.trim()) return laneId.trim()
  return `${cell.sheetName}:${cell.cellRef}`
}

function pendingRatePickLaneKey(review: ReviewItemView): string | null {
  if (review.source !== RATE_PICK_REVIEW_SOURCE) return null
  if (review.status !== "pending") return null
  const key = review.sourceMetadata?.laneKey
  return typeof key === "string" && key.trim() ? key.trim() : null
}

export class RateResolutionService {
  constructor(
    private readonly rfps: RfpRepository,
    private readonly pipeline: FillPipelineManager,
    private readonly reports: FillReportRepository,
    private readonly mapping: MappingStore,
    private readonly starboard: StarboardRatesPort,
    private readonly reviewItems?: ReviewItemRepository,
    private readonly reviews?: ReviewItemService,
    private readonly concurrency = DEFAULT_CONCURRENCY
  ) {}

  async resolveMappedLanes(input: {
    organizationId: string
    fillId: string
  }): Promise<ResolveMappedLanesResult> {
    const fill = await this.rfps.findByIdForOrganization(
      input.organizationId,
      input.fillId
    )
    if (!fill) {
      throw new DomainError(`Fill not found: ${input.fillId}`, "NOT_FOUND")
    }

    if (this.reviewItems) {
      const pendingMap = await this.reviewItems.countPending(input.fillId, {
        stepKey: MAP_STEP_KEY,
      })
      if (pendingMap > 0) {
        const message = `Cannot resolve rates: ${pendingMap} pending map review${pendingMap === 1 ? "" : "s"}`
        await this.pipeline.failStep(input.fillId, "rates", message)
        throw new DomainError(message, "VALIDATION")
      }
    }

    let lanes: MappedLane[]
    try {
      lanes = await this.mapping.readMappedLanes(input.fillId)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load mapping"
      await this.pipeline.failStep(input.fillId, "rates", message)
      throw error instanceof DomainError
        ? error
        : new DomainError(message, "VALIDATION")
    }

    if (lanes.length === 0) {
      const message = "No mapped lanes"
      await this.pipeline.failStep(input.fillId, "rates", message)
      throw new DomainError(message, "VALIDATION")
    }

    await this.pipeline.startStep(
      input.fillId,
      "rates",
      `Resolving ${lanes.length} mapped lane(s)`
    )

    const cells = await mapPool(
      lanes,
      this.concurrency,
      async (lane): Promise<UpsertLaneCellInput> => {
        try {
          const search = mappedLaneToSearchInput(lane)
          const rates = await this.starboard.resolve(search)
          const chosen = pickResolvedCandidate(rates)
          const ranked = rankPricedBuys(rates)
          const pick = scoreContractPick(ranked)

          if (!chosen) {
            const reason =
              rates.length === 0
                ? "No Starboard contract hits"
                : "No priced Starboard candidate"
            await this.pipeline.appendLog({
              rfpId: input.fillId,
              stepKey: "rates",
              source: "rates",
              level: "warn",
              message: `Lane ${lane.laneId} (${lane.originLocode}→${lane.destLocode} ${lane.equipmentType}): ${reason}`,
              metadata: { laneId: lane.laneId, hitCount: rates.length },
            })
            return {
              sheetName: lane.sheetName ?? null,
              cellRef: lane.cellRef ?? null,
              rowIndex: lane.rowIndex ?? null,
              columnKey: lane.columnKey ?? lane.laneId,
              outcome: "skipped",
              value: null,
              reason,
              metadata: buildRateAuditMetadata(lane, null, reason, pick),
            }
          }

          const value = String(chosen.resolved_buy_total)
          await this.pipeline.appendLog({
            rfpId: input.fillId,
            stepKey: "rates",
            source: "rates",
            message:
              `Lane ${lane.laneId}: buy ${value} ${chosen.resolved_currency ?? ""}`.trim(),
            metadata: {
              laneId: lane.laneId,
              starboardHitId: chosen.id ?? null,
              carrier: chosen.carrier_name ?? null,
              resolvedBuyTotal: chosen.resolved_buy_total,
              pickConfidence: pick.confidence,
              pickConfidenceReason: pick.reason,
            },
          })
          return {
            sheetName: lane.sheetName ?? null,
            cellRef: lane.cellRef ?? null,
            rowIndex: lane.rowIndex ?? null,
            columnKey: lane.columnKey ?? lane.laneId,
            outcome: "filled",
            value,
            reason: null,
            metadata: buildRateAuditMetadata(lane, chosen, null, pick),
          }
        } catch (error) {
          const reason =
            error instanceof Error ? error.message : "Starboard resolve failed"
          await this.pipeline.appendLog({
            rfpId: input.fillId,
            stepKey: "rates",
            source: "rates",
            level: "error",
            message: `Lane ${lane.laneId}: ${reason}`,
            metadata: { laneId: lane.laneId },
          })
          return {
            sheetName: lane.sheetName ?? null,
            cellRef: lane.cellRef ?? null,
            rowIndex: lane.rowIndex ?? null,
            columnKey: lane.columnKey ?? lane.laneId,
            outcome: "error",
            value: null,
            reason,
            metadata: buildRateAuditMetadata(lane, null, reason),
          }
        }
      }
    )

    const hitCount = cells.filter((c) => c.outcome === "filled").length
    const noHitCount = cells.filter((c) => c.outcome === "skipped").length
    const errorCount = cells.filter((c) => c.outcome === "error").length
    let detail = `Resolved ${hitCount} hit / ${noHitCount} no-hit / ${errorCount} error`

    await this.reports.replaceLaneCells(input.fillId, cells, detail)

    const weakPickCount = await this.enforceWeakRatePicks({
      organizationId: input.organizationId,
      fillId: input.fillId,
      cells,
    })

    if (weakPickCount > 0) {
      detail = `${detail}; ${weakPickCount} weak rate-pick review(s) opened`
      await this.pipeline.appendLog({
        rfpId: input.fillId,
        stepKey: "rates",
        source: RATE_PICK_REVIEW_SOURCE,
        level: "warn",
        message: `Weak rate picks opened ${weakPickCount} Waiting on you review(s)`,
        metadata: { weakPickCount },
      })
      return {
        fillId: input.fillId,
        hitCount,
        noHitCount,
        errorCount,
        weakPickCount,
        detail,
        cells,
      }
    }

    try {
      await this.pipeline.completeStep(input.fillId, "rates", detail)
    } catch (error) {
      // Persist succeeded; surface review-block or other complete failures.
      await this.pipeline.appendLog({
        rfpId: input.fillId,
        stepKey: "rates",
        source: "rates",
        level: "warn",
        message:
          error instanceof Error
            ? `Rates persisted but step not completed: ${error.message}`
            : "Rates persisted but step not completed",
      })
      throw error
    }

    return {
      fillId: input.fillId,
      hitCount,
      noHitCount,
      errorCount,
      weakPickCount: 0,
      detail,
      cells,
    }
  }

  /**
   * Open Waiting-on-you items for filled cells below the pick-confidence
   * threshold. Miss/error (n/a) never queue. Strong rows stay unblocked.
   */
  private async enforceWeakRatePicks(input: {
    organizationId: string
    fillId: string
    cells: UpsertLaneCellInput[]
  }): Promise<number> {
    if (!this.reviews) return 0

    const existingReviews = await this.reviews.list(
      input.organizationId,
      input.fillId,
      { status: "pending" }
    )
    const pendingByLane = new Map<string, ReviewItemView>()
    for (const review of existingReviews) {
      const key = pendingRatePickLaneKey(review)
      if (key) pendingByLane.set(key, review)
    }

    let opened = 0
    for (const cell of input.cells) {
      if (cell.outcome !== "filled") continue
      const meta = cell.metadata ?? {}
      const confidence =
        typeof meta.pickConfidence === "number" ? meta.pickConfidence : null
      if (!isLowConfidenceRatePick(confidence)) continue

      const didOpen = await this.maybeOpenRatePickReview({
        organizationId: input.organizationId,
        fillId: input.fillId,
        cell,
        pendingByLane,
      })
      if (didOpen) opened++
    }
    return opened
  }

  private async maybeOpenRatePickReview(input: {
    organizationId: string
    fillId: string
    cell: UpsertLaneCellInput
    pendingByLane: Map<string, ReviewItemView>
  }): Promise<boolean> {
    if (!this.reviews) return false

    const meta = input.cell.metadata ?? {}
    const laneKey = laneKeyForCell(input.cell)
    const confidence =
      typeof meta.pickConfidence === "number" ? meta.pickConfidence : null
    const reason =
      typeof meta.pickConfidenceReason === "string"
        ? meta.pickConfidenceReason
        : "n/a"
    const candidateCount =
      typeof meta.pickCandidateCount === "number"
        ? meta.pickCandidateCount
        : null
    const buy =
      typeof meta.resolvedBuyTotal === "number" ? meta.resolvedBuyTotal : null
    const currency =
      typeof meta.resolvedCurrency === "string" ? meta.resolvedCurrency : null
    const origin =
      typeof meta.originLocode === "string" ? meta.originLocode : null
    const dest = typeof meta.destLocode === "string" ? meta.destLocode : null
    const equipment =
      typeof meta.equipmentType === "string" ? meta.equipmentType : null
    const laneLabel =
      origin && dest
        ? `${origin} → ${dest}${equipment ? ` · ${equipment}` : ""}`
        : laneKey

    const title = `Weak rate pick: ${laneLabel} (${confidence ?? "n/a"} · ${reason})`
    const proposal = {
      kind: RATE_PICK_REVIEW_SOURCE,
      summary: `Low-confidence contract pick for ${laneLabel}`,
      rationale: `Pick confidence ${confidence ?? "n/a"} (${reason}); threshold requires human Confirm/Edit/Reject.`,
      reason,
      confidence,
      candidateCount,
      value: input.cell.value,
      buy,
      currency,
      channel: "contract",
      laneKey,
      sheetName: input.cell.sheetName,
      cellRef: input.cell.cellRef,
      laneId: typeof meta.laneId === "string" ? meta.laneId : null,
    }
    const sourceMetadata = {
      laneKey,
      sheetName: input.cell.sheetName,
      cellRef: input.cell.cellRef,
      laneId: typeof meta.laneId === "string" ? meta.laneId : null,
      step: RATES_STEP_KEY,
    }

    const existing = input.pendingByLane.get(laneKey)
    if (existing) {
      await this.reviews.update(
        input.organizationId,
        input.fillId,
        existing.id,
        {
          title,
          proposal,
          sourceMetadata,
          confidence,
        }
      )
      return true
    }

    const created = await this.reviews.create(
      input.organizationId,
      input.fillId,
      {
        title,
        stepKey: RATES_STEP_KEY,
        source: RATE_PICK_REVIEW_SOURCE,
        proposal,
        sourceMetadata,
        confidence,
      }
    )
    input.pendingByLane.set(laneKey, created)
    return true
  }
}
