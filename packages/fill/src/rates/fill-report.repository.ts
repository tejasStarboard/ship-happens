import { randomUUID } from "node:crypto"
import { eq } from "drizzle-orm"
import { rfpFillReportCells, rfpFillReports } from "@workspace/db"
import type { AppDb } from "../rfp/rfp.repository"

function reportId() {
  return `frpt_${randomUUID().replaceAll("-", "").slice(0, 16)}`
}

function cellId() {
  return `fcel_${randomUUID().replaceAll("-", "").slice(0, 16)}`
}

export type FillCellOutcome = "filled" | "skipped" | "needs_human" | "error"

export type UpsertLaneCellInput = {
  sheetName?: string | null
  cellRef?: string | null
  rowIndex?: number | null
  columnKey?: string | null
  outcome: FillCellOutcome
  value?: string | null
  reason?: string | null
  metadata?: Record<string, unknown>
}

export class FillReportRepository {
  constructor(private readonly db: AppDb) {}

  async ensureReport(rfpId: string) {
    const existing = await this.db
      .select({ id: rfpFillReports.id })
      .from(rfpFillReports)
      .where(eq(rfpFillReports.rfpId, rfpId))
      .limit(1)
      .then((rows) => rows[0] ?? null)

    if (existing) return existing.id

    const id = reportId()
    await this.db.insert(rfpFillReports).values({
      id,
      rfpId,
      filledCount: 0,
      skippedCount: 0,
      needsHumanCount: 0,
      errorCount: 0,
      summary: null,
      metadata: {},
    })
    return id
  }

  async replaceLaneCells(
    rfpId: string,
    cells: UpsertLaneCellInput[],
    summary: string
  ) {
    const reportIdValue = await this.ensureReport(rfpId)

    await this.db
      .delete(rfpFillReportCells)
      .where(eq(rfpFillReportCells.reportId, reportIdValue))

    let filledCount = 0
    let skippedCount = 0
    let needsHumanCount = 0
    let errorCount = 0
    for (const cell of cells) {
      if (cell.outcome === "filled") filledCount++
      else if (cell.outcome === "skipped") skippedCount++
      else if (cell.outcome === "needs_human") needsHumanCount++
      else errorCount++
    }

    if (cells.length > 0) {
      await this.db.insert(rfpFillReportCells).values(
        cells.map((cell) => ({
          id: cellId(),
          reportId: reportIdValue,
          sheetName: cell.sheetName ?? null,
          cellRef: cell.cellRef ?? null,
          rowIndex: cell.rowIndex ?? null,
          columnKey: cell.columnKey ?? null,
          outcome: cell.outcome,
          value: cell.value ?? null,
          reason: cell.reason ?? null,
          confidence: null,
          metadata: cell.metadata ?? {},
        }))
      )
    }

    await this.db
      .update(rfpFillReports)
      .set({
        filledCount,
        skippedCount,
        needsHumanCount,
        errorCount,
        summary,
        updatedAt: new Date(),
      })
      .where(eq(rfpFillReports.id, reportIdValue))

    return {
      reportId: reportIdValue,
      filledCount,
      skippedCount,
      needsHumanCount,
      errorCount,
    }
  }
}
