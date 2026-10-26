import { describe, expect, it } from "vitest"
import {
  decidePlaceFromChoice,
  decidePlaceWithoutJev,
  GEO_NONE_KEY,
} from "./decide-place"
import type { GeoCandidate } from "./geo-ports"

const pool: GeoCandidate[] = [
  { locode: "CNSHA", label: "Shanghai, China" },
  { locode: "CNNGB", label: "Ningbo, China" },
]

describe("decidePlaceFromChoice", () => {
  it("marks certain when lead confidence meets 0.9", () => {
    const result = decidePlaceFromChoice("Shanghai", pool, {
      choice: "CNSHA",
      confidence: 0.95,
      probabilities: { CNSHA: 0.95, CNNGB: 0.04, [GEO_NONE_KEY]: 0.01 },
    })
    expect(result.certain).toBe(true)
    expect(result.locode).toBe("CNSHA")
    expect(result.confidence).toBe(0.95)
    expect(result.blocked).toBeUndefined()
  })

  it("routes low confidence to uncertain", () => {
    const result = decidePlaceFromChoice("Portland", pool, {
      choice: "CNSHA",
      confidence: 0.7,
      probabilities: { CNSHA: 0.7, CNNGB: 0.2, [GEO_NONE_KEY]: 0.1 },
    })
    expect(result.certain).toBe(false)
    expect(result.blocked).toBe("low_p")
    expect(result.candidates).toHaveLength(2)
  })

  it("handles NONE choice", () => {
    const result = decidePlaceFromChoice("Midwest", pool, {
      choice: GEO_NONE_KEY,
      confidence: 0.8,
      probabilities: { CNSHA: 0.1, CNNGB: 0.05, [GEO_NONE_KEY]: 0.85 },
    })
    expect(result.certain).toBe(false)
    expect(result.blocked).toBe("none")
    expect(result.confidence).toBe(0.85)
  })

  it("handles empty pool", () => {
    const result = decidePlaceFromChoice("Nowhere", [], {
      choice: GEO_NONE_KEY,
      confidence: 1,
      probabilities: { [GEO_NONE_KEY]: 1 },
    })
    expect(result.blocked).toBe("no_candidates")
    expect(result.locode).toBeNull()
  })
})

describe("decidePlaceWithoutJev", () => {
  it("forces HITL with search best and confidence 0", () => {
    const result = decidePlaceWithoutJev("Shanghai", pool)
    expect(result.certain).toBe(false)
    expect(result.confidence).toBe(0)
    expect(result.locode).toBe("CNSHA")
    expect(result.blocked).toBe("error")
  })
})
