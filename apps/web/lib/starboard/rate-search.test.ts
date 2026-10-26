import { describe, expect, it } from "vitest"
import {
  buildContractSearchInput,
  buildSmokeLane,
  buildSpotSearchInput,
  parseEquipmentTypes,
  parseLocodeList,
} from "./rate-search"

describe("parseLocodeList", () => {
  it("splits comma and whitespace, uppercases", () => {
    expect(parseLocodeList("cnsha, uslax")).toEqual(["CNSHA", "USLAX"])
    expect(parseLocodeList(["krpus", " JPTYO "])).toEqual(["KRPUS", "JPTYO"])
  })
})

describe("parseEquipmentTypes", () => {
  it("defaults to 40HC when empty", () => {
    expect(parseEquipmentTypes(undefined)).toEqual(["40HC"])
  })

  it("accepts multi-eq and drops unknowns", () => {
    expect(parseEquipmentTypes(["20GP", "NOPE", "40HC"])).toEqual([
      "20GP",
      "40HC",
    ])
  })

  it("falls back to legacy equipment string", () => {
    expect(parseEquipmentTypes(undefined, "20GP")).toEqual(["20GP"])
  })
})

describe("buildContractSearchInput", () => {
  it("maps multi-eq, validity, vias, and transit to Qv2 body", () => {
    const lane = buildSmokeLane({
      origin: "CNSHA,KRPUS",
      destination: "USLAX",
      equipmentTypes: ["20GP", "40HC"],
      validFrom: "2026-10-01",
      validTo: "2026-10-31",
      originVia: "TWKHH",
      destinationVia: "USOAK",
      transitTimeMax: 21,
    })
    const body = buildContractSearchInput(lane, {
      page: 2,
      pageSize: 25,
      cacheKey: "ck",
    })
    expect(body.origin_locodes).toEqual(["CNSHA", "KRPUS"])
    expect(body.destination_locodes).toEqual(["USLAX"])
    expect(body.cargo?.container_types).toEqual(["20GP", "40HC"])
    expect(body.effective_from).toBe("2026-10-01")
    expect(body.expires_on).toBe("2026-10-31")
    expect(body.origin_via_locodes).toEqual(["TWKHH"])
    expect(body.destination_via_locodes).toEqual(["USOAK"])
    expect(body.transit_time_max).toBe(21)
    expect(body.page).toBe(2)
    expect(body.cache_key).toBe("ck")
  })
})

describe("buildSpotSearchInput", () => {
  it("passes all container types and departure_date from validFrom", () => {
    const lane = buildSmokeLane({
      equipmentTypes: ["20GP", "40HC"],
      validFrom: "2026-11-01",
      validTo: "2026-11-30",
      spotCarrier: "msc",
    })
    expect(buildSpotSearchInput(lane)).toEqual({
      carrier: "msc",
      origin_locodes: ["CNSHA"],
      destination_locodes: ["USLAX"],
      container_types: ["20GP", "40HC"],
      departure_date: "2026-11-01",
    })
  })
})
