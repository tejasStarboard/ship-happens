import {
  AuthError,
  StarboardApiError,
  countRateSearchHits,
  type ContractSearchInput,
  type SpotSearchInput,
} from "@starboard/sb-client"
import { ZodError } from "zod"
import {
  StarboardConfigError,
  createStarboardClient,
} from "@/lib/starboard/client"

/** Default smoke lane from SB-6652 (CNSHA → USLAX 40HC). */
export const DEFAULT_SMOKE_ORIGIN = "CNSHA"
export const DEFAULT_SMOKE_DESTINATION = "USLAX"
export const DEFAULT_SMOKE_EQUIPMENT = "40HC" as const
/** Spot search requires a carrier slug; CMA is the documented CLI example. */
export const DEFAULT_SMOKE_SPOT_CARRIER = "cma"

export type RateSearchErrorKind = "config" | "auth" | "api" | "validation"

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
