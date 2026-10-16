/** SYNC: twin of apps/webapp/utils/shared/quotes/usageUnit.ts — keep identical; see src/engine/README.md */
/**
 * Wedge 03.5 PR 3 — W9: the canonical usage-unit vocabulary.
 *
 * `UsageUnit` is the single billing-unit enum every surcharge calc dispatches
 * on. `normalizeUsageUnit` maps the free-text `usage_unit` strings that reach
 * `qv2_surcharge` — carrier short forms, legacy long forms (`per_metric_ton`),
 * and the outputs of the pre-W9 per-pipeline normalizers (`app/types/lcl.py`,
 * `rate_search.py:_normalize_usage_unit`, `air_agent.py`) — onto that enum.
 *
 * Applied at ingest (W9 Task 9.3): the webapp `qv2_surcharge` persistence
 * chokepoint (`buildSurchargeRow` / `mapSurcharge`), the add-in manual-entry
 * path (`AddChargeModal`), and the rate-search response. Once every surface
 * normalizes, the downstream `.includes()` substring cascades in
 * `determineUsageAmount` / `deriveRawUsage` become dead code.
 *
 * Python twin: `apps/backend/app/internal/rfq_v2/usage_unit.py` (kept
 * byte-for-byte equivalent in mapping + fallback order).
 */

export enum UsageUnit {
  /** Volume — billed per CBM (`volume_cbm`). */
  CBM = "cbm",
  /** Weight — billed per kilogram (`weight_kg`). */
  KG = "kg",
  /** Weight — billed per metric ton (`weight_ton`). */
  TON = "ton",
  /** Weight-or-measure — billed per `max(volume_cbm, weight_ton)`. */
  WM = "wm",
  /** Per container / equipment unit. */
  CONTAINER = "container",
  /** Per TEU — qty = the row equipment's TEU factor (20ft 1, 40ft 2, 45ft 2.5332). SB-3192. */
  TEU = "teu",
  /** Per pallet / skid. */
  PALLET = "pallet",
  /** Per time unit (hour / day) — carries no cargo-derived quantity. */
  PER_TIME = "per_time",
  /** Flat shipment-level fee — no per-unit billing (FILE / BL / shipment). */
  FLAT = "flat",
  /** Unrecognised unit — ingest must reject/flag, never silently bill flat. */
  UNKNOWN = "unknown",
}

/**
 * Exact-match table — the authoritative form→unit map. Keyed by the raw string
 * lower-cased and trimmed. Covers carrier short forms, the legacy long forms
 * wedge-02 migration carries, and every value the pre-W9 normalizers emit.
 */
const EXACT_UNIT_MAP: Record<string, UsageUnit> = {
  // volume
  cbm: UsageUnit.CBM,
  m3: UsageUnit.CBM,
  m: UsageUnit.CBM,
  cbft: UsageUnit.CBM,
  volume: UsageUnit.CBM,
  per_cbm: UsageUnit.CBM,
  // weight — kilogram
  kg: UsageUnit.KG,
  kgs: UsageUnit.KG,
  kilogram: UsageUnit.KG,
  lb: UsageUnit.KG,
  lbs: UsageUnit.KG,
  per_kg: UsageUnit.KG,
  // weight — ton
  ton: UsageUnit.TON,
  tons: UsageUnit.TON,
  mt: UsageUnit.TON,
  tonne: UsageUnit.TON,
  w: UsageUnit.TON,
  "w/t": UsageUnit.TON,
  "100kgs": UsageUnit.TON,
  per_ton: UsageUnit.TON,
  per_metric_ton: UsageUnit.TON,
  // weight-or-measure
  wm: UsageUnit.WM,
  "w/m": UsageUnit.WM,
  rt: UsageUnit.WM,
  "r/t": UsageUnit.WM,
  // container / equipment
  eq: UsageUnit.CONTAINER,
  container: UsageUnit.CONTAINER,
  ctr: UsageUnit.CONTAINER,
  equipment: UsageUnit.CONTAINER,
  per_container: UsageUnit.CONTAINER,
  // teu (SB-3192)
  teu: UsageUnit.TEU,
  teus: UsageUnit.TEU,
  per_teu: UsageUnit.TEU,
  // pallet
  pallet: UsageUnit.PALLET,
  pallets: UsageUnit.PALLET,
  skid: UsageUnit.PALLET,
  per_pallet: UsageUnit.PALLET,
  // per-time
  hr: UsageUnit.PER_TIME,
  hour: UsageUnit.PER_TIME,
  hours: UsageUnit.PER_TIME,
  day: UsageUnit.PER_TIME,
  days: UsageUnit.PER_TIME,
  week: UsageUnit.PER_TIME,
  per_hr: UsageUnit.PER_TIME,
  per_day: UsageUnit.PER_TIME,
  per_hour: UsageUnit.PER_TIME,
  // flat / shipment-level
  file: UsageUnit.FLAT,
  hbl: UsageUnit.FLAT,
  bl: UsageUnit.FLAT,
  "b/l": UsageUnit.FLAT,
  mbl: UsageUnit.FLAT,
  mawb: UsageUnit.FLAT,
  hawb: UsageUnit.FLAT,
  shipment: UsageUnit.FLAT,
  flat: UsageUnit.FLAT,
  occurrence: UsageUnit.FLAT,
  per_bl: UsageUnit.FLAT,
  per_file: UsageUnit.FLAT,
  per_shipment: UsageUnit.FLAT,
}

/**
 * Canonicalise a free-text `usage_unit` string to a `UsageUnit`.
 *
 * - Absent / empty → `FLAT` (the defined shipment-level case).
 * - Unrecognised non-empty → `UNKNOWN` — ingest must reject/flag it, never
 *   silently treat it as a flat fee (the pre-W9 `.includes()` cascade returned
 *   `undefined` = flat for any unmatched string).
 */
export function normalizeUsageUnit(raw: string | null | undefined): UsageUnit {
  if (raw == null) {
    return UsageUnit.FLAT
  }
  const unit = raw.trim().toLowerCase()
  if (unit === "") {
    return UsageUnit.FLAT
  }
  const exact = EXACT_UNIT_MAP[unit]
  if (exact !== undefined) {
    return exact
  }
  // Substring fallback — mirrors the pre-W9 `deriveRawUsage` tolerance so
  // prefixed / parenthesised forms (`per_metric_ton`, `kg (chargeable)`) still
  // resolve. Order matters: kg before ton before cbm.
  if (unit.includes("kg") || unit.includes("kilogram")) {
    return UsageUnit.KG
  }
  if (unit.includes("ton") || unit.includes("weight")) {
    return UsageUnit.TON
  }
  if (unit.includes("cbm") || unit.includes("m3")) {
    return UsageUnit.CBM
  }
  if (unit.includes("pallet") || unit.includes("skid")) {
    return UsageUnit.PALLET
  }
  // teu before container: "per teu" must not fall to UNKNOWN (SB-3192).
  if (unit.includes("teu")) {
    return UsageUnit.TEU
  }
  if (unit.includes("container") || unit.includes("equip")) {
    return UsageUnit.CONTAINER
  }
  if (unit.includes("hour") || unit.includes("day")) {
    return UsageUnit.PER_TIME
  }
  return UsageUnit.UNKNOWN
}
