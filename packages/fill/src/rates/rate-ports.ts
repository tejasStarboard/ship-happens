import type { MappedLane } from "./mapped-lane"

/** Subset of Starboard contract search used by fill rate resolve. */
export type RateResolveSearchInput = {
  service_type:
    | "ocean_fcl"
    | "ocean_lcl"
    | "air"
    | "origin_drayage"
    | "destination_drayage"
    | "origin_cartage"
    | "destination_cartage"
  origin_locodes: string[]
  destination_locodes: string[]
  cargo: {
    cargo_type: "container"
    container_types: string[]
  }
  effective_from?: string
  expires_on?: string
}

export type ResolvedSurchargeCandidate = {
  name: string
  amount: number | null
  currency: string | null
  source?: string
}

/** Portable buy-side candidate after `rates.resolve`. */
export type ResolvedRateCandidate = {
  id?: string
  carrier_name?: string | null
  resolved_buy_total: number | null
  resolved_currency: string | null
  resolved_surcharges?: ResolvedSurchargeCandidate[]
}

export type StarboardRatesPort = {
  resolve(input: RateResolveSearchInput): Promise<ResolvedRateCandidate[]>
}

/**
 * Read mapped lanes for a fill. Host implements via workspace `mapping.json`
 * until Phase 2c persists mapping in Postgres.
 */
export type MappingStore = {
  readMappedLanes(fillId: string): Promise<MappedLane[]>
}
