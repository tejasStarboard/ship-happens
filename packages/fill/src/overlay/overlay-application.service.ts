import { DomainError } from "../errors"
import type { FillPipelineManager } from "../pipeline/fill-pipeline.manager"
import type { ReviewItemService } from "../review/review-item.service"
import type { ReviewItemView } from "../review/review-item.types"
import type { RfpRepository } from "../rfp/rfp.repository"
import type {
  FillReportRepository,
  LaneCellRow,
  UpsertLaneCellInput,
} from "../rates/fill-report.repository"
import { withOverlayAuditMetadata } from "../rates/lane-price-audit"
import { applyMarkup, checkFloor, parseMoney } from "./margin-math"
import {
  MARGIN_FLOOR_REVIEW_SOURCE,
  type MarginFloorRuleView,
} from "./margin-floor.types"
import { matchMarginFloorRule } from "./match-margin-floor"
import { matchOverlayRule } from "./match-overlay-rule"
import type { MarginFloorRuleRepository } from "./margin-floor.repository"
import type { OverlayRuleRepository } from "./overlay-rule.repository"
import type { OverlayRuleView } from "./overlay.types"

export type ApplyOverlaysResult = {
  fillId: string
  appliedCount: number
  unchangedCount: number
  floorBreachCount: number
  detail: string
  cells: UpsertLaneCellInput[]
}

function laneFromMetadata(meta: Record<string, unknown>): {
  originLocode: string
  destLocode: string
  equipmentType: string
  buyTotal: number | null
} | null {
  const originLocode =
    typeof meta.originLocode === "string" ? meta.originLocode : null
  const destLocode =
    typeof meta.destLocode === "string" ? meta.destLocode : null
  const equipmentType =
    typeof meta.equipmentType === "string" ? meta.equipmentType : null
  if (!originLocode || !destLocode || !equipmentType) return null

  const buyTotal = parseMoney(
    (meta.resolvedBuyTotal as string | number | null | undefined) ?? null
  )
  return { originLocode, destLocode, equipmentType, buyTotal }
}

function cellToUpsert(cell: LaneCellRow): UpsertLaneCellInput {
  return {
    sheetName: cell.sheetName,
    cellRef: cell.cellRef,
    rowIndex: cell.rowIndex,
    columnKey: cell.columnKey,
    outcome: cell.outcome,
    value: cell.value,
    reason: cell.reason,
    metadata: cell.metadata,
  }
}

function applyProjected(
  cell: UpsertLaneCellInput,
  rule: OverlayRuleView
): UpsertLaneCellInput {
  const amount = parseMoney(rule.projectedAmount)
  if (amount == null) return cell
  const value = String(amount)
  return {
    ...cell,
    outcome: "filled",
    value,
    reason: null,
    metadata: withOverlayAuditMetadata(cell.metadata ?? {}, {
      ruleId: rule.id,
      ruleName: rule.name,
      mode: "projected",
      currency: rule.currency,
      projectedSell: amount,
      sellTotal: amount,
    }),
  }
}

function applyMarkupRule(
  cell: UpsertLaneCellInput,
  rule: OverlayRuleView,
  buyTotal: number
): UpsertLaneCellInput {
  const pct = parseMoney(rule.markupPct) ?? undefined
  const amount = parseMoney(rule.markupAmount) ?? undefined
  const result = applyMarkup({ buy: buyTotal, pct, amount })
  return {
    ...cell,
    outcome: "filled",
    value: String(result.sell),
    reason: null,
    metadata: withOverlayAuditMetadata(cell.metadata ?? {}, {
      ruleId: rule.id,
      ruleName: rule.name,
      mode: "markup",
      currency: rule.currency,
      markupPct: pct ?? null,
      markupAmount: amount ?? null,
      sellTotal: result.sell,
      margin: result.margin,
      marginPct: result.marginPct,
    }),
  }
}

function laneKeyForCell(cell: UpsertLaneCellInput): string {
  const laneId = cell.metadata?.laneId
  if (typeof laneId === "string" && laneId.trim()) return laneId.trim()
  return `${cell.sheetName}:${cell.cellRef}`
}

function pendingFloorLaneKey(review: ReviewItemView): string | null {
  if (review.source !== MARGIN_FLOOR_REVIEW_SOURCE) return null
  if (review.status !== "pending") return null
  const key = review.sourceMetadata?.laneKey
  return typeof key === "string" && key.trim() ? key.trim() : null
}

function formatBreachSummary(
  breaches: Array<{ rule: string; required: number; actual: number }>
): string {
  return breaches
    .map((b) => {
      if (b.rule === "min_amount") {
        return `margin $${b.actual} < floor $${b.required}`
      }
      return `margin ${b.actual}% < floor ${b.required}%`
    })
    .join("; ")
}

export class OverlayApplicationService {
  constructor(
    private readonly rfps: RfpRepository,
    private readonly pipeline: FillPipelineManager,
    private readonly reports: FillReportRepository,
    private readonly rules: OverlayRuleRepository,
    private readonly floors: MarginFloorRuleRepository,
    private readonly reviews: ReviewItemService
  ) {}

  async applyForFill(input: {
    organizationId: string
    fillId: string
  }): Promise<ApplyOverlaysResult> {
    const fill = await this.rfps.findByIdForOrganization(
      input.organizationId,
      input.fillId
    )
    if (!fill) {
      throw new DomainError(`Fill not found: ${input.fillId}`, "NOT_FOUND")
    }

    const existingCells = await this.reports.listLaneCells(input.fillId)
    const rules = await this.rules.listByOrganization(input.organizationId, {
      enabledOnly: true,
    })

    await this.pipeline.startStep(
      input.fillId,
      "overlay",
      rules.length === 0
        ? "No enabled overlay rules"
        : `Applying overlays across ${existingCells.length} cell(s)`
    )

    let appliedCount = 0
    const nextCells: UpsertLaneCellInput[] = []

    for (const row of existingCells) {
      let cell = cellToUpsert(row)
      const lane = laneFromMetadata(cell.metadata ?? {})
      if (!lane) {
        nextCells.push(cell)
        continue
      }

      const hasBuy = lane.buyTotal != null
      const mode = hasBuy ? "markup" : "projected"
      const matched = matchOverlayRule({
        rules,
        fillCustomer: fill.customer,
        lane,
        mode,
      })

      if (!matched) {
        nextCells.push(cell)
        continue
      }

      if (mode === "projected") {
        cell = applyProjected(cell, matched.rule)
      } else if (lane.buyTotal != null) {
        cell = applyMarkupRule(cell, matched.rule, lane.buyTotal)
      } else {
        nextCells.push(cell)
        continue
      }

      appliedCount++
      await this.pipeline.appendLog({
        rfpId: input.fillId,
        stepKey: "overlay",
        source: "overlay",
        message: `Lane ${String(cell.metadata?.laneId ?? cell.columnKey ?? "?")}: applied ${matched.rule.mode} rule “${matched.rule.name}” → ${cell.value} ${matched.rule.currency}`,
        metadata: {
          overlayRuleId: matched.rule.id,
          overlayMode: matched.rule.mode,
          laneId: cell.metadata?.laneId ?? null,
          sellTotal: cell.value,
        },
      })
      nextCells.push(cell)
    }

    const unchangedCount = nextCells.length - appliedCount
    let detail =
      appliedCount === 0
        ? "0 overlays applied"
        : `Applied ${appliedCount} overlay(s); ${unchangedCount} unchanged`

    if (existingCells.length > 0 || nextCells.length > 0) {
      await this.reports.replaceLaneCells(input.fillId, nextCells, detail)
    }

    const floorBreachCount = await this.enforceFloorMargins({
      organizationId: input.organizationId,
      fillId: input.fillId,
      fillCustomer: fill.customer,
      cells: nextCells,
    })

    if (floorBreachCount > 0) {
      detail = `${detail}; ${floorBreachCount} floor-margin review(s) opened`
      await this.pipeline.appendLog({
        rfpId: input.fillId,
        stepKey: "overlay",
        source: "margin-floor",
        level: "warn",
        message: `Floor-margin breaches opened ${floorBreachCount} Waiting on you review(s)`,
        metadata: { floorBreachCount },
      })
      // Pending reviews hold Progress — do not complete overlay yet.
      return {
        fillId: input.fillId,
        appliedCount,
        unchangedCount,
        floorBreachCount,
        detail,
        cells: nextCells,
      }
    }

    try {
      await this.pipeline.completeStep(input.fillId, "overlay", detail)
    } catch (error) {
      await this.pipeline.appendLog({
        rfpId: input.fillId,
        stepKey: "overlay",
        source: "overlay",
        level: "warn",
        message:
          error instanceof Error
            ? `Overlays persisted but step not completed: ${error.message}`
            : "Overlays persisted but step not completed",
      })
      throw error
    }

    return {
      fillId: input.fillId,
      appliedCount,
      unchangedCount,
      floorBreachCount: 0,
      detail,
      cells: nextCells,
    }
  }

  /**
   * Check buy+sell lanes against org/customer floors. Projected-only (no buy)
   * lanes are skipped. Opens or refreshes Phase 2b reviews on breach.
   */
  private async enforceFloorMargins(input: {
    organizationId: string
    fillId: string
    fillCustomer: string | null
    cells: UpsertLaneCellInput[]
  }): Promise<number> {
    const floorRules = await this.floors.listByOrganization(
      input.organizationId,
      { enabledOnly: true }
    )
    const matched = matchMarginFloorRule({
      rules: floorRules,
      fillCustomer: input.fillCustomer,
    })
    if (!matched) return 0

    const floor = matched.rule
    const minAmount = parseMoney(floor.minAmount) ?? undefined
    const minPct = parseMoney(floor.minPct) ?? undefined
    if (minAmount == null && minPct == null) return 0

    const existingReviews = await this.reviews.list(
      input.organizationId,
      input.fillId,
      { status: "pending" }
    )
    const pendingByLane = new Map<string, ReviewItemView>()
    for (const review of existingReviews) {
      const key = pendingFloorLaneKey(review)
      if (key) pendingByLane.set(key, review)
    }

    let breachCount = 0
    for (const cell of input.cells) {
      const opened = await this.maybeOpenFloorReview({
        organizationId: input.organizationId,
        fillId: input.fillId,
        cell,
        floor,
        minAmount,
        minPct,
        pendingByLane,
      })
      if (opened) breachCount++
    }
    return breachCount
  }

  private async maybeOpenFloorReview(input: {
    organizationId: string
    fillId: string
    cell: UpsertLaneCellInput
    floor: MarginFloorRuleView
    minAmount: number | undefined
    minPct: number | undefined
    pendingByLane: Map<string, ReviewItemView>
  }): Promise<boolean> {
    const meta = input.cell.metadata ?? {}
    const buy = parseMoney(
      (meta.resolvedBuyTotal as string | number | null | undefined) ?? null
    )
    // Only check lanes where overlay computed a sell (markup). Projected
    // (no buy) and buy-only rate cells without sellTotal are skipped.
    const sell = parseMoney(
      (meta.sellTotal as string | number | null | undefined) ?? null
    )
    if (buy == null || sell == null) return false

    const check = checkFloor({
      buy,
      sell,
      minAmount: input.minAmount,
      minPct: input.minPct,
    })
    if (check.ok) return false

    const laneKey = laneKeyForCell(input.cell)
    const summary = formatBreachSummary(check.breaches)
    const title = `Floor margin: ${laneKey} (${summary})`
    const proposal = {
      kind: MARGIN_FLOOR_REVIEW_SOURCE,
      laneKey,
      buy: check.buy,
      sell: check.sell,
      margin: check.margin,
      marginPct: check.marginPct,
      breaches: check.breaches,
      floorRuleId: input.floor.id,
      floorRuleName: input.floor.name,
      minAmount: input.minAmount ?? null,
      minPct: input.minPct ?? null,
      currency: input.floor.currency,
      sheetName: input.cell.sheetName,
      cellRef: input.cell.cellRef,
    }
    const sourceMetadata = {
      laneKey,
      floorRuleId: input.floor.id,
      sheetName: input.cell.sheetName,
      cellRef: input.cell.cellRef,
      laneId: typeof meta.laneId === "string" ? meta.laneId : null,
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
          confidence: null,
        }
      )
      return true
    }

    const created = await this.reviews.create(
      input.organizationId,
      input.fillId,
      {
        title,
        stepKey: "overlay",
        source: MARGIN_FLOOR_REVIEW_SOURCE,
        proposal,
        sourceMetadata,
      }
    )
    input.pendingByLane.set(laneKey, created)
    return true
  }
}
