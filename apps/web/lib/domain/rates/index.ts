/**
 * Rates domain — re-exports the Starboard adapter (pure search + UI mapping).
 * Keep HTTP/env wiring in `@/lib/starboard/client`.
 */
export {
  mapRateSearchResultToRows,
  searchRatesReadOnly,
  type RateSearchResult,
  type SearchRatesReadOnlyInput,
} from "@/lib/starboard/rate-search"
export type {
  RateResultChannel,
  RateResultRow,
  RateResultSurcharge,
} from "@/lib/starboard/rate-result"
