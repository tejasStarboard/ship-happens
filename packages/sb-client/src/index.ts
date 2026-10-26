/**
 * @ship-happens/sb-client — library entry.
 *
 *   import { createClient } from '@ship-happens/sb-client'
 *   const client = await createClient()
 *   const resolved = await client.rates.resolve({ service_type: 'ocean_fcl', ... })
 */

export {
  createClient,
  StarboardClient,
  type CreateClientOptions,
} from "./createClient.js"
export { loadConfig, type Config } from "./config.js"
export { AuthError, type AuthSession } from "./auth/types.js"
export { StarboardApiError } from "./http/starboardHttp.js"
export { applyMargin, checkFloor } from "./modules/margins/index.js"
export { recommendRate } from "./lib/recommendRate.js"
export {
  allocateChargesToHeadings,
  classifySurchargeName,
  rollupCharges,
  DEFAULT_HEADING_BUCKETS,
} from "./lib/chargeOntology.js"
export {
  asRateList,
  countRateSearchHits,
  paginationFromSearchBody,
} from "./modules/rates/index.js"
export type {
  ContractSearchInput,
  SpotSearchInput,
  RateSearchPaginationMeta,
  ResolvedRate,
  SearchRateHit,
} from "./modules/rates/index.js"
