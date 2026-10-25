/**
 * Rates domain — re-exports the Starboard adapter (pure search + UI mapping).
 * Keep HTTP/env wiring in `@/lib/starboard/client`.
 */
export {
  buildContractSearchInput,
  buildSmokeLane,
  buildSpotSearchInput,
  mapRateSearchResultToRows,
  parseEquipmentTypes,
  parseLocodeList,
  searchRatesReadOnly,
  type RateSearchLane,
  type RateSearchResult,
  type SearchRatesReadOnlyInput,
} from "@/lib/starboard/rate-search"
export type {
  OceanEquipmentType,
  RateResultChannel,
  RateResultRow,
  RateResultSurcharge,
  RateSearchLaneSummary,
} from "@/lib/starboard/rate-result"
export {
  OCEAN_EQUIPMENT_TYPES,
  RATES_SEARCH_PAGE_SIZE,
  todayYmd,
} from "@/lib/starboard/rate-result"
