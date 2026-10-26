import { describe, expect, it } from "vitest"
import type { LaneCellRow } from "../rates/fill-report.repository"
import { selectExportCells } from "./select-export-cells"

function cell(
  partial: Partial<LaneCellRow> & Pick<LaneCellRow, "outcome">
): LaneCellRow {
  return {
    id: partial.id ?? "fcel_1",
    sheetName: partial.sheetName ?? null,
    cellRef: partial.cellRef ?? null,
    rowIndex: partial.rowIndex ?? null,
    columnKey: partial.columnKey ?? null,
    outcome: partial.outcome,
    value: partial.value ?? null,
    reason: partial.reason ?? null,
    metadata: partial.metadata ?? {},
  }
}

describe("selectExportCells", () => {
  it("writes filled cells that have sheet + cellRef", () => {
    const plan = selectExportCells([
      cell({
        outcome: "filled",
        sheetName: "Rates",
        cellRef: "D3",
        value: "1500",
      }),
    ])
    expect(plan.writes).toEqual([
      { sheetName: "Rates", cellRef: "D3", value: "1500" },
    ])
    expect(plan.skippedMissingRef).toBe(0)
    expect(plan.skippedOther).toBe(0)
  })

  it("skips filled cells missing sheet or cellRef", () => {
    const plan = selectExportCells([
      cell({ outcome: "filled", sheetName: "Rates", value: "1" }),
      cell({ outcome: "filled", cellRef: "A1", value: "2" }),
      cell({
        outcome: "filled",
        sheetName: "  ",
        cellRef: "B2",
        value: "3",
      }),
    ])
    expect(plan.writes).toEqual([])
    expect(plan.skippedMissingRef).toBe(3)
    expect(plan.skippedOther).toBe(0)
  })

  it("counts non-filled outcomes as skippedOther", () => {
    const plan = selectExportCells([
      cell({ outcome: "skipped", sheetName: "Rates", cellRef: "D3" }),
      cell({
        outcome: "needs_human",
        sheetName: "Rates",
        cellRef: "D4",
        value: "9",
      }),
      cell({ outcome: "error", sheetName: "Rates", cellRef: "D5" }),
      cell({
        outcome: "filled",
        sheetName: "Rates",
        cellRef: "D6",
        value: "",
      }),
    ])
    expect(plan.writes).toEqual([])
    expect(plan.skippedOther).toBe(4)
    expect(plan.skippedMissingRef).toBe(0)
  })
})
