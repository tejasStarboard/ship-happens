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
 * Optional host reader for one-shot import of workspace `mapping.json`
 * when Postgres has no lanes yet.
 */
export type MappingFileReader = {
  readMappingJson(fillId: string): Promise<string | null>
}

/**
 * Mapped lanes for a fill. Host default is Postgres (`rfp_mapped_lanes`);
 * workspace `mapping.json` remains import/export only.
 */
export type MappingStore = {
  readMappedLanes(fillId: string): Promise<MappedLane[]>
  /** Confirm / replace all lanes for a fill. Optional for read-only fakes. */
  replaceMappedLanes?(
    fillId: string,
    organizationId: string,
    lanes: MappedLane[]
  ): Promise<void>
}
