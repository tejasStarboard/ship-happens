/** Candidate UN/LOCODE from location search (Starboard or equivalent). */
export type GeoCandidate = {
  locode: string
  /** Human-readable description shown to Jev / HITL. */
  label: string
  city?: string
  country?: string
}

export type PlaceCandidateChip = {
  locode: string
  label: string
  probability: number
}

/**
 * Result of resolving free-text place → UN/LOCODE (+ confidence).
 * `certain` means confidence meets the product HITL threshold and a locode exists.
 */
export type PlaceResolveResult = {
  label: string
  locode: string | null
  confidence: number
  certain: boolean
  candidates: PlaceCandidateChip[]
  /** Why uncertain / empty — mirrors geo_v4 blocked reasons (subset). */
  blocked?: "none" | "low_p" | "no_candidates" | "error"
}

/** Host adapter: retrieve + (optional) Jev choice for one place label. */
export type GeoResolvePort = {
  resolvePlace(label: string): Promise<PlaceResolveResult>
}

export type CrmMatchResult = {
  displayName: string
  confidence: number
}

/**
 * Optional customer-label match. Implementations must fail open (return null
 * on errors) — callers never block mapping on CRM.
 */
export type CrmMatchPort = {
  matchCustomer(label: string): Promise<CrmMatchResult | null>
}
