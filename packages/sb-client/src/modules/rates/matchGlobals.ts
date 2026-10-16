/**
 * Lightweight group-code lane filter for default globals.
 * Mirrors checkSatisfiesGroupCodeRequirements (unlocode / country slots) without Sentry.
 */

import type { RateItemRow } from "../globals/filter.js"

export type GroupCode = {
  id: string
  unlocodes?: string[] | null
  country_codes?: string[] | null
}

export type LaneLocodes = {
  origin: string[]
  destination: string[]
  /** POL defaults to origin when not set (ocean FCL port-to-port). */
  pol?: string[]
  pod?: string[]
}

function countryFromLocode(code: string): string | null {
  const u = code.trim().toUpperCase()
  return u.length >= 2 ? u.slice(0, 2) : null
}

function slotMatches(
  group: GroupCode,
  locodes: string[],
  countryCodes: string[]
): boolean {
  const applicableUnlocodes = (group.unlocodes ?? []).map((u) =>
    u.toUpperCase()
  )
  const applicableCountries = (group.country_codes ?? []).map((c) =>
    c.toUpperCase()
  )
  const locodeSet = new Set(applicableUnlocodes)
  if (locodes.some((u) => locodeSet.has(u.toUpperCase()))) {
    return true
  }
  // Ports listed win; countries only when no locode list (SB-4545 simplified)
  if (applicableUnlocodes.length > 0) {
    return false
  }
  const countrySet = new Set(applicableCountries)
  return countryCodes.some((c) => countrySet.has(c.toUpperCase()))
}

/** True when item has no geo groups, or every configured group slot matches the lane. */
export function globalMatchesLane(
  item: RateItemRow,
  lane: LaneLocodes,
  groupCodes: GroupCode[]
): boolean {
  const slots: Array<{ field: keyof RateItemRow; locodes: string[] }> = [
    { field: "origin_group_code_id", locodes: lane.origin },
    { field: "pol_group_code_id", locodes: lane.pol ?? lane.origin },
    { field: "pod_group_code_id", locodes: lane.pod ?? lane.destination },
    { field: "destination_group_code_id", locodes: lane.destination },
  ]

  for (const { field, locodes } of slots) {
    const id = item[field]
    if (typeof id !== "string" || !id) continue
    const group = groupCodes.find((g) => g.id === id)
    if (!group) {
      // Missing group definition → do not attach (same fail-closed as QGS when GC missing)
      return false
    }
    const countries = locodes
      .map(countryFromLocode)
      .filter((c): c is string => Boolean(c))
    if (!slotMatches(group, locodes, countries)) {
      return false
    }
  }
  return true
}

export function filterGlobalsForLane(
  items: RateItemRow[],
  lane: LaneLocodes,
  groupCodes: GroupCode[]
): RateItemRow[] {
  return items.filter((i) => globalMatchesLane(i, lane, groupCodes))
}
