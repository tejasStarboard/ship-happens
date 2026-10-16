/** SYNC: twin of apps/webapp/utils/shared/quotes/deriveRawUsage.ts — keep identical; see src/engine/README.md */
/**
 * Wedge 03 (SB-2866) — Canonical raw-usage derivation for the webapp.
 *
 * TypeScript twin of `apps/backend/app/internal/rfq_v2/profit_calc.py:derive_raw_usage`.
 * Dispatches on `usageUnit` first, then `surchargeType`. Returns the raw
 * cargo-derived quantity with NO clamps applied (clamps live in
 * `computeSurchargeRow`). Returns `null` for true flat-fee shipment rows.
 *
 * Air chargeable-weight handling is the caller's responsibility: for Air legs
 * pass `weightKg = max(actualKg, volumetricKg)` and `weightTon = weightKg / 1000`.
 * This function deliberately does NOT branch on service type — same input,
 * same output, regardless of mode.
 *
 * Per Area E (detailed_plan.md §7.3): the wedge-02 migration gives every row
 * explicit `min_usage`, so the legacy 4-priority `getGlobalChargeQuantity`
 * fallback (including `usage_amount`-as-min-floor) deliberately does NOT port.
 */

import { teuFactor } from "./teuFactor.js"
import { UsageUnit, normalizeUsageUnit } from "./usageUnit.js"

export interface DeriveRawUsageArgs {
  usageUnit?: string | null
  surchargeType?: string | null
  weightKg?: number
  weightTon?: number
  volumeCbm?: number
  palletCount?: number
  /**
   * SB-3192: the row's equipment type (or the caller's fanned-out container
   * type for bare rows) — consumed ONLY by the `teu` branch. Like palletCount,
   * this is a cargo attribute, not a service-type branch.
   */
  equipmentType?: string | null
}

export function deriveRawUsage(args: DeriveRawUsageArgs): number | null {
  const unit = (args.usageUnit ?? "").toLowerCase()
  const stype = (args.surchargeType ?? "").toLowerCase()
  const weightKg = args.weightKg ?? 0
  const weightTon = args.weightTon ?? 0
  const volumeCbm = args.volumeCbm ?? 0
  const palletCount = args.palletCount ?? 0

  // Dispatch on usage_unit first.
  if (unit === "cbm" || unit === "m3" || unit === "m" || unit === "volume") {
    return volumeCbm
  }
  if (unit.includes("kg") || unit === "kilogram") {
    return weightKg
  }
  if (
    unit === "ton" ||
    unit === "mt" ||
    unit === "tonne" ||
    unit === "w" ||
    unit === "w/t" ||
    unit.includes("ton") ||
    unit.includes("weight")
  ) {
    return weightTon
  }
  if (unit === "wm" || unit === "w/m" || unit === "rt" || unit === "r/t") {
    return Math.max(volumeCbm, weightTon)
  }
  if (unit === "eq" || unit === "container" || unit === "ctr") {
    return 1
  }
  // SB-3192: per-TEU bills the equipment's TEU factor where per-container
  // bills 1 (DERIVE-CONT-1 applies unchanged — one row per equipment TYPE,
  // never × container count). Without equipment context the factor is 1.
  // Audit I17: ask the canonical normalizer, so every spelling it reads as TEU
  // ('per TEU', ' TEU ', '/TEU') bills as TEU — no second spelling list.
  if (normalizeUsageUnit(unit) === UsageUnit.TEU) {
    return teuFactor(args.equipmentType)
  }
  if (unit.includes("pallet") || unit === "skid") {
    return palletCount
  }
  if (
    unit === "hr" ||
    unit === "hour" ||
    unit === "day" ||
    unit === "per_time" ||
    unit === "time"
  ) {
    // Per-time units have no cargo measurement. Default to 1 per-shipment.
    // Operators who want a time quantity supply it via user_amount_override
    // (Q-C2 DOSSIER — the override is the dollar value, not the quantity).
    // Wedge 03.5 W9 (Task 9.6): `per_time` is the canonical UsageUnit value
    // emitted once W9 ingest normalization lands; `time` is the `per_`-stripped
    // form `surchargeCalculation.resolveGlobalRawUsage` produces. `hr`/`hour`/
    // `day` are the legacy raw forms, kept until W9 Task 9.5 retires the cascade.
    return 1
  }
  if (unit === "shipment" || unit === "flat") {
    return null
  }

  // Fall through to surcharge_type.
  if (stype.includes("cbm") || stype.includes("volume")) {
    return volumeCbm
  }
  if (stype === "per_kg" || stype.includes("kg")) {
    return weightKg
  }
  if (stype.includes("ton") || stype.includes("weight")) {
    return weightTon
  }
  if (stype === "per_container") {
    return 1
  }
  if (stype === "per_pallet") {
    return palletCount
  }

  return null
}
