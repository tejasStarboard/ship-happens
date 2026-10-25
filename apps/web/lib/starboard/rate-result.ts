/** Contract vs spot source for a mapped Rates-page row. */
export type RateResultChannel = "contract" | "spot"

/**
 * Surcharge line from Starboard `Qv2RateSearchResult.surcharges`
 * (starboard-2 `apps/webapp/hooks/qv2/useQv2SearchRates.ts`).
 */
export type RateResultSurcharge = {
  name: string
  /** Prefer `calculated_amount`, else unit `rate`. */
  amount: number | null
  unitRate: number | null
  currency: string | null
  usageUnit: string | null
  leg: string | null
  /** When false, Starboard excludes this line from `total_amount`. */
  includedInTotal: boolean | null
  note: string | null
}

/**
 * UI row mapped from Starboard Qv2 / spot search hits (Phase 2a Rates page).
 * Field names follow starboard-2 `Qv2RateSearchResult` where applicable.
 */
export type RateResultRow = {
  id: string
  origin: string
  destination: string
  originName: string | null
  destinationName: string | null
  originVia: string | null
  destinationVia: string | null
  /** Pre-formatted spot route string when present. */
  route: string | null
  carrier: string
  vendorName: string | null
  containerType: string
  channel: RateResultChannel
  /** Base freight from `rate.amount` when present. */
  baseAmount: number | null
  /** All-in / search `total_amount`. */
  amount: number | null
  currency: string | null
  validFrom: string | null
  validTo: string | null
  transitMinDays: number | null
  transitMaxDays: number | null
  serviceName: string | null
  vesselName: string | null
  sailingDate: string | null
  productType: string | null
  surcharges: RateResultSurcharge[]
}

export type RateSearchErrorKind = "config" | "auth" | "api" | "validation"

export type RateSearchLaneSummary = {
  origin: string
  destination: string
  equipment: string
  spotCarrier: string
  serviceType: string
}
