import { describe, expect, it } from "vitest"
import {
  canonicalizeLocode,
  resolveLaneLocodesForFill,
} from "./locodeAliases.js"

describe("canonicalizeLocode", () => {
  it("maps Nordstrom short codes and typos", () => {
    expect(canonicalizeLocode("SHA").locodes).toEqual(["CNSHA"])
    expect(canonicalizeLocode("SZA").locodes[0]).toBe("CNSHK")
    expect(canonicalizeLocode("CNNBO").locodes).toEqual(["CNNGB"])
    expect(canonicalizeLocode("TCM/SEA - CY").locodes).toContain("USSEA")
  })

  it("passes through real UN/LOCODEs", () => {
    expect(canonicalizeLocode("CNSHA")).toEqual({
      query: "CNSHA",
      locodes: ["CNSHA"],
      source: "unlocode",
    })
  })

  it("returns empty + reason for unknown — never invents", () => {
    const r = canonicalizeLocode("NOTAPORT")
    expect(r.locodes).toEqual([])
    expect(r.source).toBe("empty")
    expect(r.reason).toBe("unknown_alias")
  })
})

describe("resolveLaneLocodesForFill", () => {
  it("returns locode arrays ready for resolve", () => {
    const r = resolveLaneLocodesForFill({
      origin: "SHA",
      destination: "TCM/SEA - CY",
    })
    expect(r.ok).toBe(true)
    expect(r.origin_locodes).toEqual(["CNSHA"])
    expect(r.destination_locodes).toContain("USSEA")
  })

  it("fails closed when either side unknown", () => {
    const r = resolveLaneLocodesForFill({
      origin: "SHA",
      destination: "FAKEPORTXYZ",
    })
    expect(r.ok).toBe(false)
    expect(r.destination_locodes).toEqual([])
  })
})
