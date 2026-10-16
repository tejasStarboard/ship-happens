import type { StarboardHttp } from "../../http/starboardHttp.js"
import {
  recommendRate,
  type RateCandidateInput,
} from "../../lib/recommendRate.js"
import {
  assembleResolvedRate,
  resolveContractRates,
  type ResolvedRate,
  type SearchRateHit,
} from "./resolveFullRate.js"
import {
  ContractSearchInputSchema,
  SpotSearchInputSchema,
  type ContractSearchInput,
  type SpotSearchInput,
} from "./schemas.js"
import type { RateItemRow } from "../globals/filter.js"

export type { ContractSearchInput, SpotSearchInput, ResolvedRate }

export class RatesModule {
  constructor(private readonly http: StarboardHttp) {}

  /** Raw contract/vendor search — POST /api/qv2/rates/search. */
  async searchContract(input: ContractSearchInput): Promise<unknown> {
    const body = ContractSearchInputSchema.parse(input)
    return this.http.request("POST", "/qv2/rates/search", body)
  }

  /** Spot search — POST /api/vendor_rates/spot/[carrier]. */
  async searchSpot(input: SpotSearchInput): Promise<unknown> {
    const body = SpotSearchInputSchema.parse(input)
    const { carrier, ...rest } = body
    return this.http.request(
      "POST",
      `/vendor_rates/spot/${encodeURIComponent(carrier)}`,
      rest
    )
  }

  /**
   * Enhanced search: contract hits + matching global defaults attached
   * (quote-view style), without creating a quote.
   */
  async resolve(input: ContractSearchInput) {
    const body = ContractSearchInputSchema.parse(input)
    return resolveContractRates(this.http, body)
  }

  /** Assemble one search hit with provided global default rows (offline / tests). */
  assemble(
    hit: SearchRateHit,
    globalDefaults: RateItemRow[],
    equipmentType: string | null = null
  ): ResolvedRate {
    return assembleResolvedRate(hit, globalDefaults, equipmentType)
  }

  recommend(
    rates: RateCandidateInput[],
    opts?: {
      preferred_carriers?: string[]
      strategy?: "cheapest" | "recommended"
    }
  ) {
    return recommendRate(rates, opts)
  }
}
