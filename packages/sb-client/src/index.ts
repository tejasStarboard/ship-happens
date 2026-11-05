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
export {
  scacFromCarrierVocab,
  scacFromCarrierVocabDetailed,
  pickPreferredScac,
  type CarrierVocabEntry,
  type ScacLookupResult,
} from "./modules/carriers/index.js"
export {
  canonicalizeLocode,
  resolveLaneLocodesForFill,
  LOCODE_ALIASES,
  NAME_TO_LOCODES,
  type CanonicalizeResult,
  type ResolveLaneForFillResult,
} from "./modules/locations/locodeAliases.js"
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
  contractFactsFromSearchHit,
  countRateSearchHits,
  paginationFromSearchBody,
  isRateDocId,
  provenanceFromSearchHit,
  normalizeForFill,
  pickForFill,
} from "./modules/rates/index.js"
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
} from "./modules/rates/index.js"
