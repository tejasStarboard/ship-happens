import type { LaneCellRow } from "../rates/fill-report.repository"
import type { WorkbookCellWrite } from "../ports"

export type ExportCellPlan = {
  writes: WorkbookCellWrite[]
  /** Filled outcomes missing sheetName or cellRef — skipped per product rule. */
  skippedMissingRef: number
  /** Non-filled outcomes (skipped / needs_human / error). */
  skippedOther: number
}

/**
 * Pick cells that may be written into the original BCO template.
 * Only `filled` rows with both sheetName and cellRef are written; missing
 * refs are skipped (not errors).
 */
export function selectExportCells(cells: LaneCellRow[]): ExportCellPlan {
  const writes: WorkbookCellWrite[] = []
  let skippedMissingRef = 0
  let skippedOther = 0

  for (const cell of cells) {
    if (cell.outcome !== "filled" || cell.value == null || cell.value === "") {
      skippedOther += 1
      continue
    }
    const sheetName = cell.sheetName?.trim() ?? ""
    const cellRef = cell.cellRef?.trim() ?? ""
    if (!sheetName || !cellRef) {
      skippedMissingRef += 1
      continue
    }
    writes.push({ sheetName, cellRef, value: cell.value })
  }

  return { writes, skippedMissingRef, skippedOther }
}
