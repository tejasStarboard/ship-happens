import { DomainError } from "../errors"
import type { FillPipelineManager } from "../pipeline/fill-pipeline.manager"
import type { RfpRepository } from "../rfp/rfp.repository"
import type {
  FillReportRepository,
  LaneCellRow,
  UpsertLaneCellInput,
} from "../rates/fill-report.repository"
import { applyMarkup, parseMoney } from "./margin-math"
import { matchOverlayRule } from "./match-overlay-rule"
import type { OverlayRuleRepository } from "./overlay-rule.repository"
import type { OverlayRuleView } from "./overlay.types"

export type ApplyOverlaysResult = {
  fillId: string
  appliedCount: number
  unchangedCount: number
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
    metadata: {
      ...cell.metadata,
      overlayRuleId: rule.id,
      overlayRuleName: rule.name,
      overlayMode: "projected",
      overlayCurrency: rule.currency,
      projectedSell: amount,
      sellTotal: amount,
    },
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
    metadata: {
      ...cell.metadata,
      overlayRuleId: rule.id,
      overlayRuleName: rule.name,
      overlayMode: "markup",
      overlayCurrency: rule.currency,
      markupPct: pct ?? null,
      markupAmount: amount ?? null,
      sellTotal: result.sell,
      margin: result.margin,
      marginPct: result.marginPct,
    },
  }
}

export class OverlayApplicationService {
  constructor(
    private readonly rfps: RfpRepository,
    private readonly pipeline: FillPipelineManager,
    private readonly reports: FillReportRepository,
    private readonly rules: OverlayRuleRepository
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
    const detail =
      appliedCount === 0
        ? "0 overlays applied"
        : `Applied ${appliedCount} overlay(s); ${unchangedCount} unchanged`

    if (existingCells.length > 0 || nextCells.length > 0) {
      await this.reports.replaceLaneCells(input.fillId, nextCells, detail)
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
      detail,
      cells: nextCells,
    }
  }
}
