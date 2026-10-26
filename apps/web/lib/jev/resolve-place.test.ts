import { describe, expect, it } from "vitest"
import { candidatesFromSearchOptions } from "./resolve-place"

describe("candidatesFromSearchOptions", () => {
  it("dedupes locodes and builds labels", () => {
    const candidates = candidatesFromSearchOptions([
      {
        city: "Shanghai",
        country: "China",
        locodes: ["CNSHA", "CNSHG"],
      },
      {
        city: "Shanghai",
        country: "China",
        locodes: ["CNSHA"],
      },
    ])
    expect(candidates.map((c) => c.locode)).toEqual(["CNSHA", "CNSHG"])
    expect(candidates[0]?.label).toContain("Shanghai")
  })
})
