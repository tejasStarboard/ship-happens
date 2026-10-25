import {
  AuthError,
  StarboardApiError,
  asRateList,
  countRateSearchHits,
  type ContractSearchInput,
  type SearchRateHit,
  type SpotSearchInput,
} from "@starboard/sb-client"
import { ZodError } from "zod"
import {
  StarboardConfigError,
  createStarboardClient,
} from "@/lib/starboard/client"
import type {
  RateResultChannel,
  RateResultRow,
  RateResultSurcharge,
  RateSearchErrorKind,
} from "@/lib/starboard/rate-result"

export type {
  RateResultChannel,
  RateResultRow,
  RateResultSurcharge,
  RateSearchErrorKind,
} from "@/lib/starboard/rate-result"

/** Default smoke lane from SB-6652 (CNSHA → USLAX 40HC). */
export const DEFAULT_SMOKE_ORIGIN = "CNSHA"
export const DEFAULT_SMOKE_DESTINATION = "USLAX"
export const DEFAULT_SMOKE_EQUIPMENT = "40HC" as const
/** Spot search requires a carrier slug; CMA is the documented CLI example. */
export const DEFAULT_SMOKE_SPOT_CARRIER = "cma"

export type RateSearchChannelOk = {
  status: "ok"
  count: number
  raw: unknown
}

export type RateSearchChannelEmpty = {
  status: "empty"
  count: 0
  raw: unknown
}

export type RateSearchChannelError = {
  status: "error"
  kind: RateSearchErrorKind
  message: string
  statusCode?: number
}

export type RateSearchChannelResult =
  RateSearchChannelOk | RateSearchChannelEmpty | RateSearchChannelError

export type RateSearchLane = {
  origin: string
  destination: string
  equipment: string
  spotCarrier: string
  serviceType: ContractSearchInput["service_type"]
}

export type RateSearchSuccess = {
  status: "ok" | "empty"
  companyId: string
  lane: RateSearchLane
  /** Per-channel outcomes; overall `ok` if either side has hits (contract and/or spot). */
  contract: RateSearchChannelResult
  spot: RateSearchChannelResult
}

export type RateSearchFailure = {
  status: "error"
  kind: RateSearchErrorKind
  message: string
  statusCode?: number
  companyId?: string
  lane?: RateSearchLane
  contract?: RateSearchChannelResult
  spot?: RateSearchChannelResult
}

export type RateSearchResult = RateSearchSuccess | RateSearchFailure

export type SearchRatesReadOnlyInput = {
  origin?: string
  destination?: string
  equipment?: string
  spotCarrier?: string
  serviceType?: ContractSearchInput["service_type"]
}

export function buildSmokeLane(
  input: SearchRatesReadOnlyInput = {}
): RateSearchLane {
  return {
    origin: input.origin ?? DEFAULT_SMOKE_ORIGIN,
    destination: input.destination ?? DEFAULT_SMOKE_DESTINATION,
    equipment: input.equipment ?? DEFAULT_SMOKE_EQUIPMENT,
    spotCarrier: input.spotCarrier ?? DEFAULT_SMOKE_SPOT_CARRIER,
    serviceType: input.serviceType ?? "ocean_fcl",
  }
}

export function buildContractSearchInput(
  lane: RateSearchLane
): ContractSearchInput {
  return {
    service_type: lane.serviceType,
    origin_locodes: [lane.origin],
    destination_locodes: [lane.destination],
    cargo: {
      cargo_type: "container",
      container_types: [lane.equipment as "40HC"],
    },
  }
}

export function buildSpotSearchInput(lane: RateSearchLane): SpotSearchInput {
  return {
    carrier: lane.spotCarrier,
    origin_locodes: [lane.origin],
    destination_locodes: [lane.destination],
    container_types: [lane.equipment],
  }
}

export function channelFromSearchBody(
  raw: unknown
): RateSearchChannelOk | RateSearchChannelEmpty {
  const count = countRateSearchHits(raw)
  if (count === 0) {
    return { status: "empty", count: 0, raw }
  }
  return { status: "ok", count, raw }
}

export function mapStarboardError(err: unknown): RateSearchChannelError {
  if (err instanceof StarboardConfigError) {
    return {
      status: "error",
      kind: "config",
      message: err.message,
      statusCode: err.statusCode,
    }
  }
  if (err instanceof AuthError) {
    return {
      status: "error",
      kind: "auth",
      message: err.message,
      statusCode: err.statusCode,
    }
  }
  if (err instanceof StarboardApiError) {
    return {
      status: "error",
      kind: "api",
      message: err.message,
      statusCode: err.statusCode,
    }
  }
  if (err instanceof ZodError) {
    return {
      status: "error",
      kind: "validation",
      message: err.issues.map((i) => i.message).join("; ") || "Invalid input",
      statusCode: 400,
    }
  }
  return {
    status: "error",
    kind: "api",
    message: err instanceof Error ? err.message : String(err),
  }
}

function overallFromChannels(
  contract: RateSearchChannelResult,
  spot: RateSearchChannelResult
): "ok" | "empty" | "error" {
  // Ticket: contract and/or spot — one successful hit list is enough for smoke ok.
  if (contract.status === "ok" || spot.status === "ok") {
    return "ok"
  }
  if (contract.status === "empty" && spot.status === "empty") {
    return "empty"
  }
  return "error"
}

/**
 * Read-only contract + spot rate search for server routes/actions.
 * Empty (HTTP 200, zero hits) is distinct from auth/config/API failures.
 */
export async function searchRatesReadOnly(
  input: SearchRatesReadOnlyInput = {}
): Promise<RateSearchResult> {
  const lane = buildSmokeLane(input)

  let client
  try {
    client = await createStarboardClient()
  } catch (err: unknown) {
    const mapped = mapStarboardError(err)
    return {
      status: "error",
      kind: mapped.kind,
      message: mapped.message,
      statusCode: mapped.statusCode,
      lane,
    }
  }

  const [contractSettled, spotSettled] = await Promise.allSettled([
    client.rates.searchContract(buildContractSearchInput(lane)),
    client.rates.searchSpot(buildSpotSearchInput(lane)),
  ])

  const contract: RateSearchChannelResult =
    contractSettled.status === "fulfilled"
      ? channelFromSearchBody(contractSettled.value)
      : mapStarboardError(contractSettled.reason)

  const spot: RateSearchChannelResult =
    spotSettled.status === "fulfilled"
      ? channelFromSearchBody(spotSettled.value)
      : mapStarboardError(spotSettled.reason)

  const overall = overallFromChannels(contract, spot)

  if (overall === "error") {
    const firstError =
      contract.status === "error"
        ? contract
        : spot.status === "error"
          ? spot
          : null
    return {
      status: "error",
      kind: firstError?.kind ?? "api",
      message:
        firstError?.message ??
        "Contract and/or spot rate search failed against Starboard",
      statusCode: firstError?.statusCode,
      companyId: client.companyId,
      lane,
      contract,
      spot,
    }
  }

  return {
    status: overall,
    companyId: client.companyId,
    lane,
    contract,
    spot,
  }
}

/** SB-6652 smoke: CNSHA → USLAX 40HC contract + spot. */
export async function runStarboardRateSearchSmoke(
  input: SearchRatesReadOnlyInput = {}
): Promise<RateSearchResult> {
  return searchRatesReadOnly(input)
}

function stringField(hit: SearchRateHit, keys: string[]): string | null {
  for (const key of keys) {
    const value = hit[key]
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return null
}

function finiteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (value != null && value !== "" && Number.isFinite(Number(value))) {
    return Number(value)
  }
  return null
}

/**
 * Map Starboard `Qv2RateSearchResult.surcharges` lines
 * (starboard-2 useQv2SearchRates).
 */
function mapHitSurcharges(raw: unknown): RateResultSurcharge[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item) => {
    const row =
      item && typeof item === "object"
        ? (item as Record<string, unknown>)
        : ({} as Record<string, unknown>)
    const included = row.is_included_in_total
    return {
      name: String(row.name ?? row.charge_name ?? row.code ?? "surcharge"),
      amount: finiteNumber(
        row.calculated_amount ??
          row.amount ??
          row.buy_amount ??
          row.total_amount
      ),
      unitRate: finiteNumber(row.rate),
      currency:
        typeof row.currency === "string"
          ? row.currency
          : typeof row.buy_currency === "string"
            ? row.buy_currency
            : null,
      usageUnit: typeof row.usage_unit === "string" ? row.usage_unit : null,
      leg: typeof row.leg === "string" ? row.leg : null,
      includedInTotal:
        typeof included === "boolean"
          ? included
          : included == null
            ? null
            : Boolean(included),
      note: typeof row.note === "string" ? row.note : null,
    }
  })
}

function mapTransitDays(hit: SearchRateHit): {
  transitMinDays: number | null
  transitMaxDays: number | null
} {
  const transit = hit.transit_time_days
  if (!transit || typeof transit !== "object") {
    return { transitMinDays: null, transitMaxDays: null }
  }
  const t = transit as Record<string, unknown>
  return {
    transitMinDays: finiteNumber(t.min),
    transitMaxDays: finiteNumber(t.max),
  }
}

function mapHitToRow(
  hit: SearchRateHit,
  channel: RateResultChannel,
  lane: RateSearchLane,
  index: number
): RateResultRow {
  const rateObj =
    hit.rate && typeof hit.rate === "object"
      ? (hit.rate as Record<string, unknown>)
      : null
  const containerFromHit =
    rateObj && typeof rateObj.container_type === "string"
      ? rateObj.container_type
      : null
  // Starboard can return multiple hits that share vendor_rate_doc_id / id
  // (e.g. different equipment or sailings). Always suffix the list index so
  // React keys stay unique within a search response.
  const vendorId =
    typeof hit.vendor_rate_doc_id === "string" ? hit.vendor_rate_doc_id : null
  const stableId =
    (typeof hit.id === "string" && hit.id.trim() ? hit.id.trim() : null) ??
    vendorId ??
    "hit"
  const { transitMinDays, transitMaxDays } = mapTransitDays(hit)

  return {
    id: `${channel}:${stableId}:${index}`,
    origin:
      stringField(hit, ["origin", "origin_locode", "origin_locodes"]) ??
      lane.origin,
    destination:
      stringField(hit, [
        "destination",
        "destination_locode",
        "destination_locodes",
      ]) ?? lane.destination,
    originName: stringField(hit, ["origin_name"]),
    destinationName: stringField(hit, ["destination_name"]),
    originVia: stringField(hit, ["origin_via_port"]),
    destinationVia: stringField(hit, ["destination_via_port"]),
    route: stringField(hit, ["route"]),
    carrier: stringField(hit, ["carrier_name", "carrier"]) ?? "—",
    vendorName: stringField(hit, ["vendor_company_name"]),
    containerType: containerFromHit ?? lane.equipment,
    channel,
    baseAmount: rateObj ? finiteNumber(rateObj.amount) : null,
    amount: finiteNumber(hit.total_amount),
    currency: typeof hit.currency === "string" ? hit.currency : null,
    validFrom: stringField(hit, ["valid_from"]),
    validTo: stringField(hit, ["valid_to", "offer_valid_to"]),
    transitMinDays,
    transitMaxDays,
    serviceName: stringField(hit, ["service_name"]),
    vesselName: stringField(hit, ["vessel_name"]),
    sailingDate: stringField(hit, ["sailing_date"]),
    productType: stringField(hit, ["product_type"]),
    surcharges: mapHitSurcharges(hit.surcharges),
  }
}

function rowsFromChannel(
  channel: RateResultChannel,
  result: RateSearchChannelResult,
  lane: RateSearchLane
): RateResultRow[] {
  if (result.status === "error") return []
  return asRateList(result.raw).map((hit, index) =>
    mapHitToRow(hit, channel, lane, index)
  )
}

/** Flatten contract + spot channel bodies into Rates table rows. */
export function mapRateSearchResultToRows(
  result: RateSearchSuccess
): RateResultRow[] {
  return [
    ...rowsFromChannel("contract", result.contract, result.lane),
    ...rowsFromChannel("spot", result.spot, result.lane),
  ]
}
