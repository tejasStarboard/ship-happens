import { describe, expect, it } from "vitest"
import { DomainError } from "../errors"
import {
  parseMappingDocument,
  parseMappingJson,
  SMOKE_MAPPING_FIXTURE,
} from "./mapped-lane"

describe("parseMappingDocument", () => {
  it("accepts the smoke fixture", () => {
    const lanes = parseMappingDocument(SMOKE_MAPPING_FIXTURE)
    expect(lanes).toHaveLength(1)
    expect(lanes[0]?.laneId).toBe("lane_cnsha_uslax_40hc")
  })

  it("rejects invalid documents", () => {
    expect(() => parseMappingDocument({ lanes: [{ laneId: "x" }] })).toThrow(
      DomainError
    )
  })
})

describe("parseMappingJson", () => {
  it("parses JSON text", () => {
    const lanes = parseMappingJson(JSON.stringify(SMOKE_MAPPING_FIXTURE))
    expect(lanes[0]?.originLocode).toBe("CNSHA")
  })

  it("rejects non-JSON", () => {
    expect(() => parseMappingJson("not-json")).toThrow(DomainError)
  })
})
