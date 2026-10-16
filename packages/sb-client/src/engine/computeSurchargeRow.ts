/** SYNC: twin of apps/webapp/utils/shared/quotes/computeSurchargeRow.ts — keep identical; see src/engine/README.md */
/**
 * Wedge 03 (SB-2866) — Webapp canonical per-row surcharge engine.
 *
 * ONE MATH per CODEBASE (N=3): this is the TypeScript twin of
 * `apps/backend/app/internal/rfq_v2/profit_calc.py:compute_surcharge_buy_sell`.
 * It returns native-currency buy/sell + a ConstraintApplied attribution
 * indicator. FX conversion is the caller's job — the engine stays
 * native-in/native-out so the cross-runtime parity matrix at
 * `apps/shared-fixtures/qv2/surcharge_matrix.json` can lock all three engines
 * (Python / webapp / addin) to the cent on identical inputs.
 *
 * Pipeline (DOSSIER WINS, James 2026-05-15):
 *   1. Q-C2 short-circuit: `user_amount_override` is a dollar value; returns
 *      it on both buy + sell with `userAmountOverrideApplied=true`.
 *   2. CR-1 usage clamps Max → Free → Min applied to raw usage.
 *   3. Buy: percentage > tiered > rate × usage > flat rate.
 *   3b. SB-4563: deduct `free_charge` (dollar free allowance, floored at 0).
 *      Dollar-axis order is Free → Min-lift → Max-cap — deliberately NOT a
 *      mirror of CR-1's Max-first unit order: with Free $50 + Max $400 on one
 *      row this yields cap(amount − free), so the customer never pays above
 *      the stated Max. Do not "align" with CR-1 without a matrix re-lock.
 *   4. H8 LIFT: min_charge / max_charge applied UNCONDITIONALLY on both
 *      buy and sell (the pre-wedge `is_total` gate is gone).
 *   5. Sell defaults to buy; user_rate_override / user_percentage_override
 *      keep their per-unit semantics. The override branches deduct
 *      `free_charge` themselves (they compute sell fresh); the default
 *      sell = buy path must NOT deduct again — subtraction, unlike the
 *      min/max clamps, is not idempotent.
 */

type Num = number | string | null | undefined

export interface SurchargeRowConstraintApplied {
  freeApplied: boolean
  minApplied: boolean
  maxApplied: boolean
  minChargeApplied: boolean
  maxChargeApplied: boolean
  // SB-4563: dollar free allowance deducted. Distinct from `freeApplied`
  // (unit axis) — the two can co-fire on one row.
  freeChargeApplied: boolean
  userAmountOverrideApplied: boolean
}

export interface SurchargeRowResult {
  buy: number
  sell: number
  constraintApplied: SurchargeRowConstraintApplied
}

export interface TieredRateInput {
  min?: Num
  max?: Num
  rate?: Num
}

export interface SurchargeRowInput {
  rate?: Num
  rate_percentage?: Num
  user_rate_override?: Num
  user_percentage_override?: Num
  user_amount_override?: Num
  free_usage?: Num
  min_usage?: Num
  max_usage?: Num
  minimum_charge?: Num
  maximum_charge?: Num
  // SB-4563: dollar free allowance — deducted before the min/max charge clamps.
  free_charge?: Num
  surcharge_type?: string | null
  tiered_rates?: TieredRateInput[] | null | unknown
}

const NO_CONSTRAINTS: SurchargeRowConstraintApplied = {
  freeApplied: false,
  minApplied: false,
  maxApplied: false,
  minChargeApplied: false,
  maxChargeApplied: false,
  freeChargeApplied: false,
  userAmountOverrideApplied: false,
}

function num(value: Num): number | null {
  if (value == null || value === "") {
    return null
  }
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function getEffectiveUsageQty(
  raw: number,
  freeUsage: number | null,
  minUsage: number | null,
  maxUsage: number | null
): {
  qty: number
  freeApplied: boolean
  minApplied: boolean
  maxApplied: boolean
} {
  let qty = raw
  let freeApplied = false
  let minApplied = false
  let maxApplied = false

  // CR-1 step 1: MAX cap (uses `!= null` so max_usage=0 caps at zero — H7b)
  if (maxUsage != null && qty > maxUsage) {
    qty = maxUsage
    maxApplied = true
  }

  // CR-1 step 2: FREE subtract (only when free > 0 to avoid no-op flag)
  if (freeUsage != null && freeUsage > 0) {
    const newQty = Math.max(qty - freeUsage, 0)
    if (newQty !== qty) {
      freeApplied = true
    }
    qty = newQty
  }

  // CR-1 step 3: MIN floor
  if (minUsage != null && qty < minUsage) {
    qty = minUsage
    minApplied = true
  }

  return { qty, freeApplied, minApplied, maxApplied }
}

function findTierRate(
  tieredRates: TieredRateInput[],
  usage: number
): number | null {
  // Half-open `[min, max)`; boundary value lands in the higher bucket.
  for (const tier of tieredRates) {
    const tmin = num(tier.min) ?? 0
    const tmax = num(tier.max)
    if (usage >= tmin && (tmax == null || usage < tmax)) {
      return num(tier.rate)
    }
  }
  return null
}

function normalizePercent(raw: number): number {
  // Stored as whole-number (20 = 20%) or decimal (0.2 = 20%). Values > 1 are whole.
  return raw > 1 ? raw / 100 : raw
}

export function computeSurchargeRow(
  surcharge: SurchargeRowInput,
  baseAmountForPct: number | null,
  rawUsage: number | null
): SurchargeRowResult {
  // 1. Q-C2 short-circuit (DOSSIER WINS): user_amount_override IS the dollar.
  const userAmountOverride = num(surcharge.user_amount_override)
  if (userAmountOverride != null) {
    return {
      buy: userAmountOverride,
      sell: userAmountOverride,
      constraintApplied: { ...NO_CONSTRAINTS, userAmountOverrideApplied: true },
    }
  }

  const rateVal = num(surcharge.rate)
  const ratePct = num(surcharge.rate_percentage)
  const sellOverride = num(surcharge.user_rate_override)
  const sellPctOverride = num(surcharge.user_percentage_override)
  const tieredRates = Array.isArray(surcharge.tiered_rates)
    ? (surcharge.tiered_rates as TieredRateInput[])
    : null
  const isTiered =
    surcharge.surcharge_type === "tiered" &&
    tieredRates !== null &&
    tieredRates.length > 0

  const freeUsage = num(surcharge.free_usage)
  const minUsage = num(surcharge.min_usage)
  const maxUsage = num(surcharge.max_usage)
  // SB-4911 known ceiling: these three dollar clamps are applied as raw
  // scalars against the NATIVE row total. For a settings-linked row
  // (usage_by='rate') they live-read the LIBRARY item's value, denominated in
  // the library's own currency (`minimum_charge_currency` on the loaded row —
  // this engine ignores it), so in the stale window between a library
  // currency edit and the interactive sync tick the clamp treats a USD floor
  // as row-currency. The "(min $X charge)" suffix converts correctly
  // (useSurchargeCalculations.getDisplayMinimumCharge), so the two can
  // disagree on one PDF row in that window. Fixing it means making this
  // engine currency-aware (FX at clamp time, save/render parity, add-in twin
  // alignment) — sequenced with the Q-ABSORB-1 "FX into the engine" work,
  // deliberately NOT bolted onto the SB-4911 display fix.
  const minCharge = num(surcharge.minimum_charge)
  const maxCharge = num(surcharge.maximum_charge)
  const freeCharge = num(surcharge.free_charge)
  const pctBase = baseAmountForPct ?? 0

  // 2. CR-1 usage clamps.
  // SB-4401: a flat / shipment-level row is ONE occurrence. `deriveRawUsage`
  // returns null for it (flat / shipment / occurrence), which used to skip the
  // clamps entirely — so the QGS row clamped (`deriveFclRowAmounts` seeds an
  // implicit qty of 1 per Rule CR-1) and showed $0.00 FREE while the PDF, email,
  // Excel and the saved totals billed the full rate. Clamp against that same
  // implicit 1 whenever the row actually declares free/min/max. No clamp → stay
  // null, so `rate × 1 == rate` is byte-identical and nothing else moves.
  // Tiered stays out: its bucket walk brackets on effective usage and Rule
  // TIER-1 alignment is sequenced separately (SB-2707).
  const hasUsageClamp =
    freeUsage != null || minUsage != null || maxUsage != null
  const usageForClamps = rawUsage ?? (hasUsageClamp && !isTiered ? 1 : null)
  let effectiveUsage: number | null = null
  let freeApplied = false
  let minApplied = false
  let maxApplied = false
  if (usageForClamps != null) {
    const c = getEffectiveUsageQty(
      usageForClamps,
      freeUsage,
      minUsage,
      maxUsage
    )
    effectiveUsage = c.qty
    freeApplied = c.freeApplied
    minApplied = c.minApplied
    maxApplied = c.maxApplied
  }

  // 3. Buy side.
  let buyTotal = 0
  if (isTiered && effectiveUsage != null) {
    // Bucket selected from effective (post-clamp) usage. DIVERGES from Air WB-1
    // (which brackets from raw); current behavior per Rule TIER-1, WB-1
    // alignment is deferred to SB-2707 (TIER-3). Do not "fix" without sequencing.
    const bucketRate = findTierRate(tieredRates ?? [], effectiveUsage)
    if (bucketRate != null) {
      buyTotal = bucketRate * effectiveUsage
    }
  } else if (rateVal != null) {
    buyTotal = effectiveUsage != null ? rateVal * effectiveUsage : rateVal
  } else if (ratePct != null) {
    buyTotal = pctBase * normalizePercent(ratePct)
  }

  // 3b. SB-4563: deduct the dollar free allowance from buy (floor 0).
  // `> 0` guard mirrors the unit-free's; zero deducts nothing, sets no flag.
  let buyFreeChargeApplied = false
  if (freeCharge != null && freeCharge > 0) {
    const newBuy = Math.max(buyTotal - freeCharge, 0)
    if (newBuy !== buyTotal) {
      buyFreeChargeApplied = true
    }
    buyTotal = newBuy
  }

  // 4a. H8 LIFT: buy charge clamps unconditional.
  let buyMinChargeApplied = false
  let buyMaxChargeApplied = false
  if (minCharge != null && buyTotal < minCharge) {
    buyTotal = minCharge
    buyMinChargeApplied = true
  }
  if (maxCharge != null && buyTotal > maxCharge) {
    buyTotal = maxCharge
    buyMaxChargeApplied = true
  }

  // 5. Sell side.
  // SB-4563: only the override branches deduct free_charge — they compute
  // sell FRESH. The default sell = buy path inherits buy AFTER its deduction
  // and clamps; deducting there again would subtract the free twice
  // (subtraction is not idempotent, unlike the min/max clamps).
  let sellTotal = 0
  let sellFreeChargeApplied = false
  if (sellOverride != null) {
    // user_rate_override × EFFECTIVE usage per CR-1 buy/sell symmetry (Wedge 03
    // alignment 2026-05-18; Python aligned at profit_calc.py:281).
    sellTotal = sellOverride * (effectiveUsage != null ? effectiveUsage : 1)
    if (freeCharge != null && freeCharge > 0) {
      const newSell = Math.max(sellTotal - freeCharge, 0)
      if (newSell !== sellTotal) {
        sellFreeChargeApplied = true
      }
      sellTotal = newSell
    }
  } else if (sellPctOverride != null) {
    sellTotal = pctBase * normalizePercent(sellPctOverride)
    if (freeCharge != null && freeCharge > 0) {
      const newSell = Math.max(sellTotal - freeCharge, 0)
      if (newSell !== sellTotal) {
        sellFreeChargeApplied = true
      }
      sellTotal = newSell
    }
  } else if (rateVal != null || ratePct != null || isTiered) {
    sellTotal = buyTotal
  }

  // 4b. H8 LIFT: sell charge clamps unconditional.
  let sellMinChargeApplied = false
  let sellMaxChargeApplied = false
  if (minCharge != null && sellTotal < minCharge) {
    sellTotal = minCharge
    sellMinChargeApplied = true
  }
  if (maxCharge != null && sellTotal > maxCharge) {
    sellTotal = maxCharge
    sellMaxChargeApplied = true
  }

  return {
    buy: buyTotal,
    sell: sellTotal,
    constraintApplied: {
      freeApplied,
      minApplied,
      maxApplied,
      minChargeApplied: buyMinChargeApplied || sellMinChargeApplied,
      maxChargeApplied: buyMaxChargeApplied || sellMaxChargeApplied,
      freeChargeApplied: buyFreeChargeApplied || sellFreeChargeApplied,
      userAmountOverrideApplied: false,
    },
  }
}
