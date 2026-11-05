import type { StarboardHttp } from "../../http/starboardHttp.js"
import { filterGlobals, type RateItemRow } from "../globals/filter.js"
import { filterGlobalsForLane, type GroupCode } from "./matchGlobals.js"
import { priceGlobalBuy } from "./priceGlobal.js"
import type { ContractSearchInput, ServiceType } from "./schemas.js"

export type SearchRateHit = {
  id?: string
  carrier_name?: string | null
  total_amount?: number | null
  currency?: string | null
  /** Source vendor_rate_doc id when the hit came from a contract sheet/email. */
  vendor_rate_doc_id?: string | null
  /** Short-lived signed .eml URL when Public API attached it (v3 quotes). */
  vendor_email_url?: string | null
  surcharges?: unknown[]
  rate?: { container_type?: string; [key: string]: unknown } | null
  [key: string]: unknown
}

export type ResolvedSurcharge = {
  name: string
  source: "carrier" | "global"
  amount: number | null
  currency: string | null
  settings_rate_item_id?: string | null
  usage_unit?: string | null
  leg?: string | null
  qty?: number | null
  unit_rate?: number | null
  minimum_charge_applied?: boolean
  raw?: unknown
}

export type ResolvedRate = SearchRateHit & {
  carrier_surcharges: ResolvedSurcharge[]
  global_surcharges: ResolvedSurcharge[]
  resolved_surcharges: ResolvedSurcharge[]
  /** Buy-side: search total_amount + engine-priced matching globals. */
  resolved_buy_total: number | null
  resolved_currency: string | null
}

/** Free-time days parsed from contract hit `rate_items` (SB-4132 names). */
export type ResolvedFreeTime = {
  originDays: number | null
  destDays: number | null
  detentionOrigin: number | null
  detentionDest: number | null
  demurrageOrigin: number | null
  demurrageDest: number | null
}

/** Non-money service facts already present on a qv2 search hit. */
export type ContractServiceFacts = {
  transit_time_days: number | null
  service_name: string | null
  effective_from: string | null
  expires_on: string | null
  free_time: ResolvedFreeTime | null
}

const FREE_TIME_ITEM_NAMES = new Set([
  "free_time",
  "combined_free_time",
  "detention_free_time",
  "demurrage_free_time",
  "origin_free_time",
  "origin_combined_free_time",
  "origin_detention_free_time",
  "origin_demurrage_free_time",
  "destination_free_time",
  "destination_combined_free_time",
  "destination_detention_free_time",
  "destination_demurrage_free_time",
])

function finiteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim()) {
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  return null
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function isFreeTimeRateItemName(name: string | null | undefined): boolean {
  return name != null && FREE_TIME_ITEM_NAMES.has(name)
}

function freeUsageDays(item: Record<string, unknown>): number | null {
  const raw = item.free_usage ?? item.free_allowance
  const n = finiteNumber(raw)
  return n != null && n >= 0 ? n : null
}

/**
 * Pull transit / free-time / validity / service from a contract search hit.
 * Mirrors starboard-2 free-time item names; never invents values.
 */
export function contractFactsFromSearchHit(
  hit: SearchRateHit | Record<string, unknown>
): ContractServiceFacts {
  const row = hit as Record<string, unknown>

  let transit_time_days = finiteNumber(row.transit_time)
  if (transit_time_days != null && transit_time_days === 0) {
    transit_time_days = null
  }
  if (transit_time_days == null) {
    const nested = row.transit_time_days
    if (nested && typeof nested === "object") {
      const t = nested as Record<string, unknown>
      transit_time_days =
        finiteNumber(t.min) ?? finiteNumber(t.max) ?? finiteNumber(t.days)
    } else {
      transit_time_days = finiteNumber(nested)
    }
  }

  const service_name =
    asNonEmptyString(row.service_name) ?? asNonEmptyString(row.service) ?? null

  const effective_from =
    asNonEmptyString(row.effective_from) ??
    asNonEmptyString(row.valid_from) ??
    null
  const expires_on =
    asNonEmptyString(row.expires_on) ??
    asNonEmptyString(row.effective_to) ??
    asNonEmptyString(row.valid_to) ??
    null

  const free_time = freeTimeFromHit(row)

  return {
    transit_time_days,
    service_name,
    effective_from,
    expires_on,
    free_time,
  }
}

function freeTimeFromHit(
  row: Record<string, unknown>
): ResolvedFreeTime | null {
  const items = Array.isArray(row.rate_items)
    ? (row.rate_items as unknown[])
    : Array.isArray(row.free_time_items)
      ? (row.free_time_items as unknown[])
      : []

  let originDays: number | null = null
  let destDays: number | null = null
  let detentionOrigin: number | null = null
  let detentionDest: number | null = null
  let demurrageOrigin: number | null = null
  let demurrageDest: number | null = null
  let any = false

  for (const raw of items) {
    if (!raw || typeof raw !== "object") continue
    const item = raw as Record<string, unknown>
    const name = typeof item.name === "string" ? item.name : null
    if (!isFreeTimeRateItemName(name)) continue
    const days = freeUsageDays(item)
    if (days == null) continue
    any = true
    switch (name) {
      case "origin_free_time":
      case "origin_combined_free_time":
        originDays = days
        break
      case "destination_free_time":
      case "destination_combined_free_time":
        destDays = days
        break
      case "origin_detention_free_time":
        detentionOrigin = days
        break
      case "destination_detention_free_time":
        detentionDest = days
        break
      case "origin_demurrage_free_time":
        demurrageOrigin = days
        break
      case "destination_demurrage_free_time":
        demurrageDest = days
        break
      case "free_time":
      case "combined_free_time":
        if (originDays == null) originDays = days
        if (destDays == null) destDays = days
        break
      case "detention_free_time":
        if (detentionOrigin == null) detentionOrigin = days
        if (detentionDest == null) detentionDest = days
        break
      case "demurrage_free_time":
        if (demurrageOrigin == null) demurrageOrigin = days
        if (demurrageDest == null) demurrageDest = days
        break
      default:
        break
    }
  }

  // Top-level route fields (when search still surfaces them beside rate_items).
  for (const [key, setter] of [
    ["origin_free_time", (n: number) => { originDays = originDays ?? n }],
    ["destination_free_time", (n: number) => { destDays = destDays ?? n }],
    [
      "origin_detention_free_time",
      (n: number) => {
        detentionOrigin = detentionOrigin ?? n
      },
    ],
    [
      "destination_detention_free_time",
      (n: number) => {
        detentionDest = detentionDest ?? n
      },
    ],
    [
      "origin_demurrage_free_time",
      (n: number) => {
        demurrageOrigin = demurrageOrigin ?? n
      },
    ],
    [
      "destination_demurrage_free_time",
      (n: number) => {
        demurrageDest = demurrageDest ?? n
      },
    ],
  ] as const) {
    const n = finiteNumber(row[key])
    if (n == null) continue
    any = true
    setter(n)
  }

  if (!any) return null
  return {
    originDays,
    destDays,
    detentionOrigin,
    detentionDest,
    demurrageOrigin,
    demurrageDest,
  }
}

/**
 * Normalize contract/spot search JSON into a rate hit list.
 * Supports legacy `{ rates }` and Starboard paginated
 * `{ paginated_rates, non_paginated_rates, pagination }` (qv2 rates/search).
 */
export function asRateList(searchBody: unknown): SearchRateHit[] {
  if (!searchBody || typeof searchBody !== "object") return []
  const o = searchBody as Record<string, unknown>
  if (Array.isArray(o.paginated_rates)) {
    const page = o.paginated_rates as SearchRateHit[]
    const extra = Array.isArray(o.non_paginated_rates)
      ? (o.non_paginated_rates as SearchRateHit[])
      : []
    return [...page, ...extra]
  }
  const candidates = [o.rates, o.data, o.results]
  for (const c of candidates) {
    if (Array.isArray(c)) return c as SearchRateHit[]
  }
  return []
}

/** Hit count for empty vs success discrimination (raw body still available). */
export function countRateSearchHits(searchBody: unknown): number {
  return asRateList(searchBody).length
}

/** Pagination block from Starboard paginated Qv2 search (when present). */
export type RateSearchPaginationMeta = {
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
  cacheKey: string | null
}

export function paginationFromSearchBody(
  searchBody: unknown
): RateSearchPaginationMeta | null {
  if (!searchBody || typeof searchBody !== "object") return null
  const pagination = (searchBody as Record<string, unknown>).pagination
  if (!pagination || typeof pagination !== "object") return null
  const p = pagination as Record<string, unknown>
  const page = typeof p.page === "number" ? p.page : null
  const pageSize = typeof p.page_size === "number" ? p.page_size : null
  const totalCount = typeof p.total_count === "number" ? p.total_count : null
  const totalPages = typeof p.total_pages === "number" ? p.total_pages : null
  if (
    page == null ||
    pageSize == null ||
    totalCount == null ||
    totalPages == null
  ) {
    return null
  }
  return {
    page,
    pageSize,
    totalCount,
    totalPages,
    cacheKey: typeof p.cache_key === "string" ? p.cache_key : null,
  }
}

function equipmentFromHit(
  hit: SearchRateHit,
  input: ContractSearchInput
): string | null {
  const fromRate =
    hit.rate &&
    typeof hit.rate === "object" &&
    typeof hit.rate.container_type === "string"
      ? hit.rate.container_type
      : null
  if (fromRate) return fromRate
  const cargo = input.cargo
  if (cargo?.container_type) return cargo.container_type
  if (cargo?.container_types?.length) return cargo.container_types[0]
  return null
}

function mapCarrierSurcharges(raw: unknown[] | undefined): ResolvedSurcharge[] {
  if (!raw?.length) return []
  return raw.map((s) => {
    const row = (s && typeof s === "object" ? s : {}) as Record<string, unknown>
    const name = String(row.name ?? row.charge_name ?? row.code ?? "surcharge")
    const amountRaw =
      row.calculated_amount ??
      row.amount ??
      row.buy_amount ??
      row.total_amount ??
      row.rate
    const amount =
      typeof amountRaw === "number" && Number.isFinite(amountRaw)
        ? amountRaw
        : amountRaw != null && Number.isFinite(Number(amountRaw))
          ? Number(amountRaw)
          : null
    const currency =
      typeof row.currency === "string"
        ? row.currency
        : typeof row.buy_currency === "string"
          ? row.buy_currency
          : null
    return {
      name,
      source: "carrier" as const,
      amount,
      currency,
      raw: s,
    }
  })
}

function locodesFromInput(input: ContractSearchInput): {
  origin: string[]
  destination: string[]
} {
  const origin = [
    ...(input.origin_locodes ?? []),
    ...(input.origin_locode ? [input.origin_locode] : []),
  ]
  const destination = [
    ...(input.destination_locodes ?? []),
    ...(input.destination_locode ? [input.destination_locode] : []),
  ]
  return { origin, destination }
}

export function assembleResolvedRate(
  hit: SearchRateHit,
  globalDefaults: RateItemRow[],
  equipmentType: string | null
): ResolvedRate {
  const carrier_surcharges = mapCarrierSurcharges(
    Array.isArray(hit.surcharges) ? hit.surcharges : undefined
  )

  const global_surcharges: ResolvedSurcharge[] = []
  for (const item of globalDefaults) {
    const priced = priceGlobalBuy(item, equipmentType)
    if (!priced) continue
    global_surcharges.push({
      name: priced.name,
      source: "global",
      amount: priced.amount,
      currency: priced.currency,
      settings_rate_item_id: priced.settings_rate_item_id,
      usage_unit: priced.usage_unit,
      leg: priced.leg,
      qty: priced.qty,
      unit_rate: priced.unit_rate,
      minimum_charge_applied: priced.minimum_charge_applied,
      raw: priced.raw,
    })
  }

  const resolved_surcharges = [...carrier_surcharges, ...global_surcharges]
  const currency =
    (typeof hit.currency === "string" ? hit.currency : null) ||
    carrier_surcharges.find((s) => s.currency)?.currency ||
    global_surcharges.find((s) => s.currency)?.currency ||
    null
  const base =
    typeof hit.total_amount === "number" && Number.isFinite(hit.total_amount)
      ? hit.total_amount
      : null
  let globalSum = 0
  let anyGlobal = false
  for (const g of global_surcharges) {
    if (g.amount == null || !Number.isFinite(g.amount)) continue
    if (
      currency &&
      g.currency &&
      g.currency.toUpperCase() !== currency.toUpperCase()
    )
      continue
    globalSum += g.amount
    anyGlobal = true
  }
  const resolved_buy_total =
    base != null
      ? Math.round((base + globalSum) * 100) / 100
      : anyGlobal
        ? Math.round(globalSum * 100) / 100
        : null

  return {
    ...hit,
    carrier_surcharges,
    global_surcharges,
    resolved_surcharges,
    resolved_buy_total,
    resolved_currency: currency,
  }
}

/**
 * Contract search + attach matching company global defaults with QGS surcharge math.
 * Does not create or save a quote.
 */
export async function resolveContractRates(
  http: StarboardHttp,
  input: ContractSearchInput
): Promise<{
  company_id: string
  service_type: ServiceType
  count: number
  rates: ResolvedRate[]
  global_defaults_considered: number
  global_defaults_matched: number
  raw_search: unknown
}> {
  const searchBody = await http.request<unknown>(
    "POST",
    "/qv2/rates/search",
    input
  )
  const hits = asRateList(searchBody)

  const [{ data }, groupRes] = await Promise.all([
    http.request<{ data: RateItemRow[] }>(
      "GET",
      `/settings/quote_tool/rate_items?service=${encodeURIComponent(input.service_type)}`
    ),
    http
      .request<{ data: GroupCode[] }>("GET", "/settings/quote_tool/group_codes")
      .catch(() => ({ data: [] as GroupCode[] })),
  ])

  const defaults = filterGlobals(data ?? [], { has_default_rate: true })
  const { origin, destination } = locodesFromInput(input)
  const matched = filterGlobalsForLane(
    defaults,
    { origin, destination, pol: origin, pod: destination },
    groupRes.data ?? []
  )

  const limit = input.limit
  const sliced = limit != null ? hits.slice(0, limit) : hits
  const rates = sliced.map((h) =>
    assembleResolvedRate(h, matched, equipmentFromHit(h, input))
  )

  return {
    company_id: http.companyId,
    service_type: input.service_type,
    count: rates.length,
    rates,
    global_defaults_considered: defaults.length,
    global_defaults_matched: matched.length,
    raw_search: searchBody,
  }
}
