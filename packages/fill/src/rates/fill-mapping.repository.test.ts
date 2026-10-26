import { describe, expect, it } from "vitest"
import { parseMappingDocument, SMOKE_MAPPING_FIXTURE } from "./mapped-lane"

describe("fill mapping document", () => {
  it("parses smoke fixture for DB replace", () => {
    const lanes = parseMappingDocument(SMOKE_MAPPING_FIXTURE)
    expect(lanes).toHaveLength(1)
    expect(lanes[0]?.laneId).toBe("lane_cnsha_uslax_40hc")
    expect(lanes[0]?.originLocode).toBe("CNSHA")
    expect(lanes[0]?.destLocode).toBe("USLAX")
  })
})
