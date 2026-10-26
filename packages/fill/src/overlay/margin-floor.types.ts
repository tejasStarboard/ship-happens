export type MarginFloorRuleView = {
  id: string
  organizationId: string
  name: string
  customer: string | null
  minAmount: string | null
  minPct: string | null
  currency: string
  enabled: boolean
  priority: number
  createdByUserId: string
  createdAt: string
  updatedAt: string
}

export type CreateMarginFloorRuleInput = {
  name: string
  customer?: string | null
  minAmount?: string | null
  minPct?: string | null
  currency?: string
  enabled?: boolean
  priority?: number
}

export type UpdateMarginFloorRuleInput = Partial<CreateMarginFloorRuleInput>

export type MatchedMarginFloorRule = {
  rule: MarginFloorRuleView
  customerSpecific: boolean
}

/** Stable source tag for Phase 2b reviews opened by floor enforcement. */
export const MARGIN_FLOOR_REVIEW_SOURCE = "margin-floor" as const
