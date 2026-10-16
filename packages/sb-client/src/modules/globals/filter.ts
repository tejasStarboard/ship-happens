export type RateItemRow = {
  id?: string
  name?: string | null
  has_default_rate?: boolean | null
  leg?: string | null
  applicable_to_rate_sheet?: boolean | null
  services?: string[] | null
  rate?: number | string | null
  currency?: string | null
  usage_unit?: string | null
  usage_by?: string | null
  free_usage?: number | string | null
  min_usage?: number | string | null
  max_usage?: number | string | null
  origin_group_code_id?: string | null
  pol_group_code_id?: string | null
  pod_group_code_id?: string | null
  destination_group_code_id?: string | null
  equipment_rates?: Record<string, number | string> | null
  [key: string]: unknown
}

export type GlobalListFilters = {
  has_default_rate?: boolean
  leg?: string
  name_contains?: string
  applicable_to_rate_sheet?: boolean
}

export function filterGlobals(
  items: RateItemRow[],
  filters: GlobalListFilters
): RateItemRow[] {
  let out = items
  if (filters.has_default_rate !== undefined) {
    out = out.filter(
      (i) => Boolean(i.has_default_rate) === filters.has_default_rate
    )
  }
  if (filters.leg) {
    out = out.filter((i) => i.leg === filters.leg)
  }
  if (filters.name_contains) {
    const needle = filters.name_contains.toLowerCase()
    out = out.filter((i) => (i.name ?? "").toLowerCase().includes(needle))
  }
  if (filters.applicable_to_rate_sheet !== undefined) {
    out = out.filter(
      (i) =>
        Boolean(i.applicable_to_rate_sheet) === filters.applicable_to_rate_sheet
    )
  }
  return out
}
