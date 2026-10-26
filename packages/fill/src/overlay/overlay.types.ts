export const OVERLAY_RULE_MODES = ["projected", "markup"] as const
export type OverlayRuleMode = (typeof OVERLAY_RULE_MODES)[number]

export type OverlayRuleView = {
  id: string
  organizationId: string
  name: string
  customer: string | null
  originLocode: string | null
  destLocode: string | null
  equipmentType: string | null
  mode: OverlayRuleMode
  projectedAmount: string | null
  markupPct: string | null
  markupAmount: string | null
  currency: string
  enabled: boolean
  priority: number
  createdByUserId: string
  createdAt: string
  updatedAt: string
}

export type CreateOverlayRuleInput = {
  name: string
  customer?: string | null
  originLocode?: string | null
  destLocode?: string | null
  equipmentType?: string | null
  mode: OverlayRuleMode
  projectedAmount?: string | null
  markupPct?: string | null
  markupAmount?: string | null
  currency?: string
  enabled?: boolean
  priority?: number
}

export type UpdateOverlayRuleInput = Partial<CreateOverlayRuleInput>

export type OverlayLaneContext = {
  originLocode: string
  destLocode: string
  equipmentType: string
  /** Starboard buy total when present. */
  buyTotal: number | null
}

export type MatchedOverlayRule = {
  rule: OverlayRuleView
  specificity: number
  customerSpecific: boolean
}
