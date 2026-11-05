import type { StarboardHttp } from "../../http/starboardHttp.js"
import {
  recommendRate,
  type RateCandidateInput,
} from "../../lib/recommendRate.js"
import {
  asRateList,
  assembleResolvedRate,
  contractFactsFromSearchHit,
  countRateSearchHits,
  paginationFromSearchBody,
  resolveContractRates,
  type ContractServiceFacts,
  type RateSearchPaginationMeta,
  type ResolvedFreeTime,
  type ResolvedRate,
  type SearchRateHit,
} from "./resolveFullRate.js"
import {
  normalizeForFill as normalizeForFillHit,
  pickForFill as pickForFillHits,
  type FillView,
  type PickForFillOptions,
} from "./fillView.js"
import {
  resolveMany,
  type ResolveManyJob,
  type ResolveManyOptions,
  type ResolveManyResult,
} from "./resolveMany.js"
import {
  getRateDocSignedUrl,
  isRateDocId,
  provenanceFromSearchHit,
  type RateDocSignedUrlResult,
} from "./rateDocSignedUrl.js"
import {
  ContractSearchInputSchema,
  SpotSearchInputSchema,
  type ContractSearchInput,
  type SpotSearchInput,
} from "./schemas.js"
import type { RateItemRow } from "../globals/filter.js"

export type {
  ContractSearchInput,
  SpotSearchInput,
  ContractServiceFacts,
  RateSearchPaginationMeta,
  ResolvedFreeTime,
  ResolvedRate,
  SearchRateHit,
  RateDocSignedUrlResult,
  FillView,
  PickForFillOptions,
  ResolveManyJob,
  ResolveManyOptions,
  ResolveManyResult,
}
export {
  asRateList,
  contractFactsFromSearchHit,
  countRateSearchHits,
  paginationFromSearchBody,
  isRateDocId,
  provenanceFromSearchHit,
  normalizeForFillHit as normalizeForFill,
  pickForFillHits as pickForFill,
}

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

  /**
   * Signed download URL for a vendor rate doc (rate sheet / email artifact).
   * Soft-callers should catch StarboardApiError / AuthError.
   */
  getRateDocSignedUrl(rateDocId: string): Promise<RateDocSignedUrlResult> {
    return getRateDocSignedUrl(this.http, rateDocId)
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

  /** Peel base/lss/arb/all_in + contract facts for one equipment — pure. */
  normalizeForFill(
    hit: SearchRateHit | Record<string, unknown>,
    equipment: string
  ): FillView {
    return normalizeForFillHit(hit, equipment)
  }

  /** Cheapest usable hit for equipment (optional floor + service preference). */
  pickForFill(
    rates: Array<SearchRateHit | Record<string, unknown>>,
    equipment: string,
    opts?: PickForFillOptions
  ) {
    return pickForFillHits(rates, equipment, opts)
  }

  /**
   * Resolve many lanes with one session, bounded concurrency, optional cache.
   * Prefer this over spawning CLI per lane.
   */
  resolveMany(
    jobs: ResolveManyJob[],
    opts?: ResolveManyOptions
  ): Promise<ResolveManyResult[]> {
    return resolveMany(this.http, jobs, opts)
  }
}
