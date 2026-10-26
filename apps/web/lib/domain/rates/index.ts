/**
 * Rates domain — re-exports the Starboard adapter (pure search + UI mapping).
 * Keep HTTP/env wiring in `@/lib/starboard/client`.
 * Fill resolve: `createAppContext().rates` + workspace `mapping.json`.
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
export {
  FILL_MAPPING_RELATIVE_PATH,
  createWorkspaceMappingStore,
} from "@/lib/domain/rates/workspace-mapping-store"
export { createStarboardRatesPort } from "@/lib/domain/rates/starboard-rates-adapter"
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
