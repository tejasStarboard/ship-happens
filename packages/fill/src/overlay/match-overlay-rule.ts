import type {
  MatchedOverlayRule,
  OverlayLaneContext,
  OverlayRuleMode,
  OverlayRuleView,
} from "./overlay.types"

function normalizeKey(value: string | null | undefined): string | null {
  if (value == null) return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed.toUpperCase() : null
}

function normalizeCustomer(value: string | null | undefined): string | null {
  if (value == null) return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed.toLowerCase() : null
}

function fieldMatches(
  ruleValue: string | null | undefined,
  laneValue: string
): { ok: boolean; scored: boolean } {
  const ruleKey = normalizeKey(ruleValue)
  if (ruleKey == null) return { ok: true, scored: false }
  return {
    ok: ruleKey === normalizeKey(laneValue),
    scored: true,
  }
}

/**
 * Pick the best enabled overlay rule for a lane.
 * Precedence: customer-specific > org-wide; then lane specificity; then priority.
 * Mode must fit the lane: projected only when no buy; markup only when buy exists.
 */
export function matchOverlayRule(input: {
  rules: OverlayRuleView[]
  fillCustomer: string | null
  lane: OverlayLaneContext
  mode: OverlayRuleMode
}): MatchedOverlayRule | null {
  const fillCustomer = normalizeCustomer(input.fillCustomer)
  const candidates: MatchedOverlayRule[] = []

  for (const rule of input.rules) {
    if (!rule.enabled) continue
    if (rule.mode !== input.mode) continue

    const ruleCustomer = normalizeCustomer(rule.customer)
    if (ruleCustomer != null) {
      if (fillCustomer == null || ruleCustomer !== fillCustomer) continue
    }

    const origin = fieldMatches(rule.originLocode, input.lane.originLocode)
    const dest = fieldMatches(rule.destLocode, input.lane.destLocode)
    const equipment = fieldMatches(rule.equipmentType, input.lane.equipmentType)
    if (!origin.ok || !dest.ok || !equipment.ok) continue

    let specificity = 0
    if (origin.scored) specificity += 10
    if (dest.scored) specificity += 10
    if (equipment.scored) specificity += 10

    candidates.push({
      rule,
      specificity,
      customerSpecific: ruleCustomer != null,
    })
  }

  if (candidates.length === 0) return null

  candidates.sort((a, b) => {
    if (a.customerSpecific !== b.customerSpecific) {
      return a.customerSpecific ? -1 : 1
    }
    if (a.specificity !== b.specificity) return b.specificity - a.specificity
    if (a.rule.priority !== b.rule.priority) {
      return b.rule.priority - a.rule.priority
    }
    return a.rule.name.localeCompare(b.rule.name)
  })

  return candidates[0] ?? null
}
