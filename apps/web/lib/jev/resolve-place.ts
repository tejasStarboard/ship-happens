import { choice } from "@typesafe-ai/sdk"
import {
  decidePlaceFromChoice,
  decidePlaceWithoutJev,
  GEO_NONE_KEY,
  type GeoCandidate,
  type PlaceResolveResult,
} from "@ship-happens/fill"
import { getJevClient, isJevConfigured } from "./client"

export const GEO_PLACE_INSTRUCTIONS =
  "`label` is a location cell from a freight rate sheet. Pick the candidate UN/LOCODE that is " +
  "the place the label names. Rules: (1) The place NAME must match (spelling variants, " +
  "abbreviations, former/local names OK). (2) Qualifiers (state, province, country) must agree. " +
  "(3) Prefer the city/standard port code over a named airport or facility unless the label " +
  "names that facility. (4) Pick NONE when the label is not a place, names a region/group of " +
  "ports, or no candidate is that place."

export type LocationSearchFn = (query: string) => Promise<{
  options: Array<{
    city?: unknown
    country?: unknown
    country_code?: unknown
    locodes: string[]
  }>
}>

/** Flatten Starboard search options into unique UN/LOCODE candidates. */
export function candidatesFromSearchOptions(
  options: Array<{
    city?: unknown
    country?: unknown
    country_code?: unknown
    locodes: string[]
  }>,
  limit = 8
): GeoCandidate[] {
  const seen = new Set<string>()
  const out: GeoCandidate[] = []
  for (const option of options) {
    const city = typeof option.city === "string" ? option.city : undefined
    const country =
      typeof option.country === "string"
        ? option.country
        : typeof option.country_code === "string"
          ? option.country_code
          : undefined
    for (const raw of option.locodes) {
      const locode = raw.trim().toUpperCase()
      if (!locode || seen.has(locode)) continue
      seen.add(locode)
      const where = [city, country].filter(Boolean).join(", ")
      out.push({
        locode,
        label: where ? `${where} (${locode})` : locode,
        city,
        country,
      })
      if (out.length >= limit) return out
    }
  }
  return out
}

/**
 * Retrieve via Starboard location search, then Jev choice (when configured).
 * Without Jev, returns search best at confidence 0 so HITL still opens.
 */
export async function resolvePlaceLabel(
  label: string,
  search: LocationSearchFn
): Promise<PlaceResolveResult> {
  const trimmed = label.trim()
  if (!trimmed) {
    return decidePlaceWithoutJev(trimmed, [])
  }

  let pool: GeoCandidate[] = []
  try {
    const result = await search(trimmed)
    pool = candidatesFromSearchOptions(result.options)
  } catch {
    return {
      label: trimmed,
      locode: null,
      confidence: 0,
      certain: false,
      candidates: [],
      blocked: "error",
    }
  }

  if (pool.length === 0) {
    return decidePlaceWithoutJev(trimmed, [])
  }

  if (!isJevConfigured()) {
    return decidePlaceWithoutJev(trimmed, pool)
  }

  try {
    const criteria: Record<string, string> = {}
    for (const c of pool) {
      criteria[c.locode] = c.label
    }
    criteria[GEO_NONE_KEY] =
      "None of these candidates is the place the label names"

    const client = getJevClient()
    const response = await client.systemOne({
      state: { label: trimmed, instructions: GEO_PLACE_INSTRUCTIONS },
      questions: {
        pick: choice(
          "Which UN/LOCODE is the place this label names?",
          criteria
        ),
      },
    })

    const answer = response.answers.pick
    const probabilities: Record<string, number> = {}
    for (const [key, value] of Object.entries(answer.probabilities ?? {})) {
      if (typeof value === "number") probabilities[key] = value
    }

    return decidePlaceFromChoice(trimmed, pool, {
      choice: String(answer.choice),
      confidence: typeof answer.confidence === "number" ? answer.confidence : 0,
      probabilities,
    })
  } catch {
    return decidePlaceWithoutJev(trimmed, pool)
  }
}
