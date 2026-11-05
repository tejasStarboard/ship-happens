/**
 * Fill-oriented view of a contract rate hit.
 * Never invents money, free days, or schedule — null when absent.
 */

import {
  contractFactsFromSearchHit,
  type ResolvedFreeTime,
  type SearchRateHit,
} from "./resolveFullRate.js"

const OCEAN_NAMES = new Set([
  "ocean_freight",
  "base_freight",
  "freight",
  "ocean freight",
])

const LSS_NAMES = new Set([
  "lss",
  "baf",
  "lsf",
  "low sulphur",
  "low sulfur",
  "bunker",
  "efs",
  "bfs",
  "faf",
])

const ARB_NAMES = new Set([
  "origin_arbitrary",
  "destination_arbitrary",
  "arbitrary",
  "arb",
  "origin arb",
  "destination arb",
])

const DEFAULT_PRICE_FLOOR: Record<string, number> = {
  "20GP": 150,
  "40GP": 400,
  "40HC": 400,
  "45GP": 400,
  "40REEF": 400,
  "40RH": 400,
}

export type FillUnsupported = {
  schedule: {
    supported: false
    reason: "contract_resolve"
  }
}

export type FillView = {
  equipment: string
  carrier_name: string | null
  base: number | null
  lss: number | null
  arb: number | null
  all_in: number | null
  currency: string | null
  transit_days: number | null
  service_name: string | null
  free_time: ResolvedFreeTime | null
  effective_from: string | null
  expires_on: string | null
  origin: string | null
  destination: string | null
  source_rate_id: string | null
  vendor_rate_doc_id: string | null
  unsupported: FillUnsupported
}

export type PickForFillOptions = {
  /** Drop absurd QA junk when a saner hit exists. Default true. */
  applyFloor?: boolean
  /** Override per-equipment minimum all-in/base. */
  floors?: Record<string, number>
  /** Prefer hits with service_name among near-cheapest (±5%). Default true. */
  preferServiceName?: boolean
}

function finiteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim()) {
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  return null
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null
  const t = value.trim()
  return t.length ? t : null
}

function surchargeAmount(
  s: Record<string, unknown>,
  equipment: string
): number | null {
  const calc = finiteNumber(s.calculated_amount)
  if (calc != null) return calc
  const rate = s.rate
  if (typeof rate === "number" && Number.isFinite(rate)) return rate
  if (rate && typeof rate === "object") {
    const m = rate as Record<string, unknown>
    return (
      finiteNumber(m[equipment]) ??
      finiteNumber(m[equipment.toLowerCase()]) ??
      finiteNumber(m.amount)
    )
  }
  return null
}

function nameMatches(name: string, set: Set<string>): boolean {
  const n = name.toLowerCase().trim()
  if (set.has(n)) return true
  for (const token of set) {
    if (n.includes(token)) return true
  }
  return false
}

function freeTimeFromSurcharges(
  surcharges: unknown[]
): ResolvedFreeTime | null {
  let originDays: number | null = null
  let destDays: number | null = null
  let any = false
  for (const raw of surcharges) {
    if (!raw || typeof raw !== "object") continue
    const s = raw as Record<string, unknown>
    const name = asString(s.name)?.toLowerCase() ?? ""
    const fu = finiteNumber(s.free_usage)
    if (fu == null || fu < 0) continue
    if (name.includes("destination_free") || name === "destination free time") {
      destDays = fu
      any = true
    } else if (name.includes("origin_free") || name === "origin free time") {
      originDays = fu
      any = true
    }
  }
  if (!any) return null
  return {
    originDays,
    destDays,
    detentionOrigin: null,
    detentionDest: null,
    demurrageOrigin: null,
    demurrageDest: null,
  }
}

function mergeFreeTime(
  a: ResolvedFreeTime | null,
  b: ResolvedFreeTime | null
): ResolvedFreeTime | null {
  if (!a && !b) return null
  return {
    originDays: a?.originDays ?? b?.originDays ?? null,
    destDays: a?.destDays ?? b?.destDays ?? null,
    detentionOrigin: a?.detentionOrigin ?? b?.detentionOrigin ?? null,
    detentionDest: a?.detentionDest ?? b?.detentionDest ?? null,
    demurrageOrigin: a?.demurrageOrigin ?? b?.demurrageOrigin ?? null,
    demurrageDest: a?.demurrageDest ?? b?.demurrageDest ?? null,
  }
}

/**
 * Peel base / LSS / arb / all-in + contract facts from one hit for a container type.
 * Amounts only when present on the hit — never invented.
 */
export function normalizeForFill(
  hit: SearchRateHit | Record<string, unknown>,
  equipment: string
): FillView {
  const row = hit as Record<string, unknown>
  const surcharges = Array.isArray(row.surcharges)
    ? (row.surcharges as unknown[])
    : Array.isArray(row.resolved_surcharges)
      ? (row.resolved_surcharges as unknown[])
      : []

  let base: number | null = null
  let lss: number | null = null
  let arb: number | null = null

  for (const raw of surcharges) {
    if (!raw || typeof raw !== "object") continue
    const s = raw as Record<string, unknown>
    const name = asString(s.name) ?? ""
    const amt = surchargeAmount(s, equipment)
    if (nameMatches(name, OCEAN_NAMES) && amt != null) base = amt
    if (nameMatches(name, LSS_NAMES) && amt != null) lss = amt
    if (nameMatches(name, ARB_NAMES) && amt != null) arb = amt
  }

  const total =
    finiteNumber(row.total_amount) ??
    finiteNumber(row.resolved_buy_total) ??
    null

  if (base == null && total != null) {
    base = total - (lss ?? 0) - (arb ?? 0)
  }
  let all_in = total
  if (all_in == null && base != null) {
    all_in = base + (lss ?? 0) + (arb ?? 0)
  }

  const facts = contractFactsFromSearchHit(hit)
  const fromSurch = freeTimeFromSurcharges(surcharges)
  const free_time = mergeFreeTime(facts.free_time, fromSurch)

  return {
    equipment,
    carrier_name: asString(row.carrier_name),
    base,
    lss,
    arb,
    all_in,
    currency: asString(row.currency) ?? asString(row.resolved_currency),
    transit_days: facts.transit_time_days,
    service_name: facts.service_name,
    free_time,
    effective_from: facts.effective_from,
    expires_on: facts.expires_on,
    origin: asString(row.origin),
    destination: asString(row.destination),
    source_rate_id:
      asString(row.source_rate_id) ??
      (typeof row.id === "string" ? row.id : null),
    vendor_rate_doc_id: asString(row.vendor_rate_doc_id),
    unsupported: {
      schedule: { supported: false, reason: "contract_resolve" },
    },
  }
}

/**
 * Pick cheapest usable hit for equipment; optional floor + service_name preference.
 */
export function pickForFill(
  rates: Array<SearchRateHit | Record<string, unknown>>,
  equipment: string,
  opts?: PickForFillOptions
): { hit: SearchRateHit | Record<string, unknown>; view: FillView } | null {
  const applyFloor = opts?.applyFloor !== false
  const preferService = opts?.preferServiceName !== false
  const floors = { ...DEFAULT_PRICE_FLOOR, ...(opts?.floors ?? {}) }
  const floor = floors[equipment] ?? 200

  const scored: Array<{
    price: number
    hit: SearchRateHit | Record<string, unknown>
    view: FillView
  }> = []

  for (const hit of rates) {
    const view = normalizeForFill(hit, equipment)
    if (view.all_in == null && view.base == null) continue
    const price = view.all_in ?? view.base
    if (price == null) continue
    scored.push({ price, hit, view })
  }
  if (!scored.length) return null

  scored.sort((a, b) => a.price - b.price)
  const pool = applyFloor
    ? scored.filter((s) => s.price >= floor)
    : scored
  const use = pool.length ? pool : scored
  const best = use[0].price
  const near = use.filter((s) => s.price <= best * 1.05)
  if (preferService) {
    const withSvc = near.filter((s) => Boolean(s.view.service_name))
    if (withSvc.length) return { hit: withSvc[0].hit, view: withSvc[0].view }
  }
  return { hit: near[0].hit, view: near[0].view }
}
