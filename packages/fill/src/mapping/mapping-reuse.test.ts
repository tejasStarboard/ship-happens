import { describe, expect, it } from "vitest"
import type { MappedLane } from "../rates/mapped-lane"
import { classifyMappingReuse, fingerprintFromSource } from "./mapping-reuse"

function lane(
  partial: Partial<MappedLane> & Pick<MappedLane, "laneId">
): MappedLane {
  return {
    originLocode: "CNSHA",
    destLocode: "USLAX",
    equipmentType: "40HC",
    sheetName: "Rates",
    columnKey: "ocean_freight",
    rowIndex: 10,
    cellRef: "B10",
    surchargeSlots: ["BAF"],
    ...partial,
  }
}

describe("classifyMappingReuse", () => {
  it("reuses the same lane id when the sheet still exists and no anchors are known", () => {
    const parent = lane({ laneId: "lane_1" })
    const result = classifyMappingReuse([parent], { sheetNames: ["Rates"] })
    expect(result.reused).toHaveLength(1)
    expect(result.drifted).toHaveLength(0)
    expect(result.removed).toHaveLength(0)
    expect(result.reused[0]?.lane).toMatchObject({
      laneId: "lane_1",
      rowIndex: 10,
      columnKey: "ocean_freight",
      cellRef: "B10",
    })
  })

  it("auto-accepts the same column within ±2 rows and shifts the cell", () => {
    const result = classifyMappingReuse([lane({ laneId: "lane_1" })], {
      sheetNames: ["Rates"],
      anchors: [
        {
          sheetName: "Rates",
          columnKey: "ocean_freight",
          rowIndex: 12,
        },
      ],
    })
    expect(result.reused[0]?.lane).toMatchObject({
      laneId: "lane_1",
      rowIndex: 12,
      cellRef: "B12",
    })
    expect(result.reused[0]?.reason).toMatch(/shifted by 2/)
  })

  it("sends a larger row move to drift without a confirmed lane", () => {
    const result = classifyMappingReuse([lane({ laneId: "lane_1" })], {
      sheetNames: ["Rates"],
      anchors: [
        {
          sheetName: "Rates",
          columnKey: "ocean_freight",
          rowIndex: 13,
          originLocode: "CNSHA",
          destLocode: "USLAX",
          equipmentType: "40HC",
        },
      ],
    })
    expect(result.reused).toHaveLength(0)
    expect(result.drifted).toHaveLength(1)
    expect(result.drifted[0]?.lane).toBeUndefined()
    expect(result.drifted[0]?.reason).toMatch(/row moved by 3/)
    expect(result.drifted[0]?.suggested).toMatchObject({ rowIndex: 13 })
  })

  it("drifts when the header or column changes but O-D-equipment still matches", () => {
    const result = classifyMappingReuse([lane({ laneId: "lane_1" })], {
      sheetNames: ["Rates"],
      anchors: [
        {
          sheetName: "Rates",
          columnKey: "base_rate",
          header: "Base rate",
          rowIndex: 10,
          originLocode: "cnsha",
          destLocode: "uslax",
          equipmentType: "40hc",
          laneId: "other",
        },
      ],
    })
    expect(result.drifted).toHaveLength(1)
    expect(result.drifted[0]?.reason).toMatch(/header or column changed/)
    expect(result.drifted[0]?.suggested?.columnKey).toBe("base_rate")
    expect(result.drifted[0]?.parent.laneId).toBe("lane_1")
  })

  it("removes a lane whose sheet is gone and nothing else matches", () => {
    const result = classifyMappingReuse([lane({ laneId: "lane_1" })], {
      sheetNames: ["Cover"],
    })
    expect(result.removed).toHaveLength(1)
    expect(result.removed[0]?.reason).toMatch(/Sheet not in new workbook/)
  })

  it("drifts instead of removing when the lane moved to another sheet", () => {
    const result = classifyMappingReuse([lane({ laneId: "lane_1" })], {
      sheetNames: ["Cover"],
      anchors: [
        {
          sheetName: "Cover",
          columnKey: "ocean_freight",
          rowIndex: 4,
          laneId: "lane_1",
        },
      ],
    })
    expect(result.removed).toHaveLength(0)
    expect(result.drifted[0]?.reason).toMatch(/sheet changed/)
    expect(result.drifted[0]?.suggested?.sheetName).toBe("Cover")
  })

  it("keeps parent fee bindings when fee headings drift", () => {
    const result = classifyMappingReuse(
      [lane({ laneId: "lane_1", surchargeSlots: ["BAF", "THC"] })],
      {
        sheetNames: ["Rates"],
        anchors: [
          {
            sheetName: "Rates",
            columnKey: "ocean_freight",
            rowIndex: 10,
            feeHeadings: ["BAF", "AMS"],
          },
        ],
      }
    )
    expect(result.reused[0]?.feeDrift).toBe(true)
    expect(result.reused[0]?.lane?.surchargeSlots).toEqual(["BAF", "THC"])
  })

  it("treats an empty sheet list as unknown and still reuses", () => {
    const result = classifyMappingReuse([lane({ laneId: "lane_1" })], {
      sheetNames: [],
    })
    expect(result.reused).toHaveLength(1)
  })

  it("removes lanes when a fingerprint has no matching anchor", () => {
    const result = classifyMappingReuse([lane({ laneId: "lane_1" })], {
      sheetNames: ["Rates"],
      anchors: [],
    })
    expect(result.removed[0]?.reason).toMatch(/No matching lane anchor/)
  })

  it("reads anchors from parse metadata", () => {
    const fingerprint = fingerprintFromSource({
      sheetNames: ["Rates"],
      parseMetadata: {
        anchors: [
          {
            sheetName: "Rates",
            columnKey: "ocean_freight",
            rowIndex: 11,
            feeHeadings: ["BAF"],
          },
        ],
      },
    })
    const result = classifyMappingReuse(
      [lane({ laneId: "lane_1" })],
      fingerprint
    )
    expect(result.reused[0]?.lane?.rowIndex).toBe(11)
    expect(result.reused[0]?.lane?.cellRef).toBe("B11")
    expect(result.reused[0]?.feeDrift).toBe(false)
  })
})
