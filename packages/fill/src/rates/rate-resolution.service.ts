import { DomainError } from "../errors"
import type { FillPipelineManager } from "../pipeline/fill-pipeline.manager"
import type { RfpRepository } from "../rfp/rfp.repository"
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

const DEFAULT_CONCURRENCY = 3
const MAP_STEP_KEY = "map"

export type ResolveMappedLanesResult = {
  fillId: string
  hitCount: number
  noHitCount: number
  errorCount: number
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

export class RateResolutionService {
  constructor(
    private readonly rfps: RfpRepository,
    private readonly pipeline: FillPipelineManager,
    private readonly reports: FillReportRepository,
    private readonly mapping: MappingStore,
    private readonly starboard: StarboardRatesPort,
    private readonly reviewItems?: ReviewItemRepository,
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
              metadata: buildRateAuditMetadata(lane, null, reason),
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
            metadata: buildRateAuditMetadata(lane, chosen, null),
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
    const detail = `Resolved ${hitCount} hit / ${noHitCount} no-hit / ${errorCount} error`

    await this.reports.replaceLaneCells(input.fillId, cells, detail)

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
      detail,
      cells,
    }
  }
}
