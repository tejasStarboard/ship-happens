import type { MappedLane } from "./mapped-lane"
import type { RateResolveSearchInput } from "./rate-ports"

function todayYmd(now = new Date()): string {
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, "0")
  const d = String(now.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function isYmd(value: string | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value))
}

/** Map a persisted / workspace lane onto Starboard contract search input. */
export function mappedLaneToSearchInput(
  lane: MappedLane,
  now = new Date()
): RateResolveSearchInput {
  const today = todayYmd(now)
  const body: RateResolveSearchInput = {
    service_type: lane.serviceType ?? "ocean_fcl",
    origin_locodes: [lane.originLocode.trim().toUpperCase()],
    destination_locodes: [lane.destLocode.trim().toUpperCase()],
    cargo: {
      cargo_type: "container",
      container_types: [lane.equipmentType.trim().toUpperCase()],
    },
    effective_from: isYmd(lane.validFrom) ? lane.validFrom : today,
    expires_on: isYmd(lane.validTo) ? lane.validTo : today,
  }
  return body
}

/**
 * Prefer the cheapest priced hit; if none are priced, return null (no-hit path).
 */
export function pickResolvedCandidate<
  T extends { resolved_buy_total: number | null },
>(rates: T[]): T | null {
  const priced = rates.filter(
    (r) => r.resolved_buy_total != null && Number.isFinite(r.resolved_buy_total)
  )
  if (priced.length === 0) return null
  let best = priced[0]!
  for (let i = 1; i < priced.length; i++) {
    const next = priced[i]!
    if (
      (next.resolved_buy_total as number) < (best.resolved_buy_total as number)
    ) {
      best = next
    }
  }
  return best
}
