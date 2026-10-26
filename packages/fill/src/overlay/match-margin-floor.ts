import type {
  MarginFloorRuleView,
  MatchedMarginFloorRule,
} from "./margin-floor.types"

function normalizeCustomer(value: string | null | undefined): string | null {
  if (value == null) return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed.toLowerCase() : null
}

/**
 * Pick the best enabled floor rule for a fill customer.
 * Precedence: customer-specific > org-wide; then priority; then name.
 */
export function matchMarginFloorRule(input: {
  rules: MarginFloorRuleView[]
  fillCustomer: string | null
}): MatchedMarginFloorRule | null {
  const fillCustomer = normalizeCustomer(input.fillCustomer)
  const candidates: MatchedMarginFloorRule[] = []

  for (const rule of input.rules) {
    if (!rule.enabled) continue
    if (rule.minAmount == null && rule.minPct == null) continue

    const ruleCustomer = normalizeCustomer(rule.customer)
    if (ruleCustomer != null) {
      if (fillCustomer == null || ruleCustomer !== fillCustomer) continue
    }

    candidates.push({
      rule,
      customerSpecific: ruleCustomer != null,
    })
  }

  if (candidates.length === 0) return null

  candidates.sort((a, b) => {
    if (a.customerSpecific !== b.customerSpecific) {
      return a.customerSpecific ? -1 : 1
    }
    if (a.rule.priority !== b.rule.priority) {
      return b.rule.priority - a.rule.priority
    }
    return a.rule.name.localeCompare(b.rule.name)
  })

  return candidates[0] ?? null
}
