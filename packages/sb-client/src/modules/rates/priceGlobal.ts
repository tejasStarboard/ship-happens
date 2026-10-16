/**
 * Price a settings global the same way QGS does after add-rate:
 * mapSettingsGuardrails (usage_by quantity vs rate) → deriveRawUsage → computeSurchargeRow.
 *
 * Guardrail mapping is the twin of
 * apps/webapp/store/qv2/slices/coreSlice.ts mapSettingsGuardrails (SB-4313 / SB-4563).
 */

import { computeSurchargeRow } from "../../engine/computeSurchargeRow.js"
import { deriveRawUsage } from "../../engine/deriveRawUsage.js"
import type { RateItemRow } from "../globals/filter.js"

function str(v: number | string | null | undefined): string | null {
  if (v == null || v === "") return null
  return String(v)
}

/** Twin of coreSlice.mapSettingsGuardrails — usage_by='rate' → dollar H8 clamps. */
export function mapSettingsGuardrails(item: RateItemRow): {
  free_usage: string | null
  min_usage: string | null
  max_usage: string | null
  free_charge: string | null
  minimum_charge: string | null
  maximum_charge: string | null
} {
  const usageBy = String(item.usage_by ?? "quantity").toLowerCase()
  if (usageBy === "rate") {
    return {
      free_usage: null,
      min_usage: null,
      max_usage: null,
      free_charge: str(item.free_usage as number | string | null | undefined),
      minimum_charge: str(item.min_usage as number | string | null | undefined),
      maximum_charge: str(item.max_usage as number | string | null | undefined),
    }
  }
  return {
    free_usage: str(item.free_usage as number | string | null | undefined),
    min_usage: str(item.min_usage as number | string | null | undefined),
    max_usage: str(item.max_usage as number | string | null | undefined),
    free_charge: null,
    minimum_charge: null,
    maximum_charge: null,
  }
}

function resolveLibraryRate(
  item: RateItemRow,
  equipmentType: string | null
): number | null {
  const byEq = item.equipment_rates
  if (
    equipmentType &&
    byEq &&
    typeof byEq === "object" &&
    !Array.isArray(byEq) &&
    equipmentType in (byEq as Record<string, unknown>)
  ) {
    const v = (byEq as Record<string, unknown>)[equipmentType]
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }
  if (item.rate == null || item.rate === "") return null
  const n = Number(item.rate)
  return Number.isFinite(n) ? n : null
}

export type PricedGlobal = {
  name: string
  source: "global"
  amount: number
  currency: string | null
  settings_rate_item_id: string | null
  usage_unit: string | null
  leg: string | null
  qty: number | null
  unit_rate: number | null
  minimum_charge_applied: boolean
  raw: RateItemRow
}

/**
 * Buy amount for one global on one equipment (FCL row = one type, DERIVE-CONT-1).
 */
export function priceGlobalBuy(
  item: RateItemRow,
  equipmentType: string | null
): PricedGlobal | null {
  const unitRate = resolveLibraryRate(item, equipmentType)
  if (unitRate == null) return null

  const guardrails = mapSettingsGuardrails(item)
  const usageUnit = typeof item.usage_unit === "string" ? item.usage_unit : null
  const rawUsage = deriveRawUsage({
    usageUnit,
    equipmentType,
  })

  const { buy, constraintApplied } = computeSurchargeRow(
    {
      rate: unitRate,
      free_usage: guardrails.free_usage,
      min_usage: guardrails.min_usage,
      max_usage: guardrails.max_usage,
      free_charge: guardrails.free_charge,
      minimum_charge: guardrails.minimum_charge,
      maximum_charge: guardrails.maximum_charge,
    },
    null,
    rawUsage
  )

  if (!Number.isFinite(buy)) return null

  return {
    name: String(item.name ?? "global"),
    source: "global",
    amount: Math.round(buy * 100) / 100,
    currency: typeof item.currency === "string" ? item.currency : "USD",
    settings_rate_item_id: typeof item.id === "string" ? item.id : null,
    usage_unit: usageUnit,
    leg: typeof item.leg === "string" ? item.leg : null,
    qty: rawUsage,
    unit_rate: unitRate,
    minimum_charge_applied: constraintApplied.minChargeApplied,
    raw: item,
  }
}
