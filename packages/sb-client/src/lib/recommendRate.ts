/**
 * Rate pick helpers — mirrors webapp ruleRecommendation cheapest path for MVP.
 * (Full pickRecommended needs ≥2 priced options; cheapest works for 1+.)
 */

export interface RateCandidateInput {
  id?: string | null
  carrier_name?: string | null
  vendor_company_name?: string | null
  total_amount?: number | null
  currency?: string | null
  transit_time_days?: { min?: number; max?: number } | null
  agent_quoted?: boolean
  [key: string]: unknown
}

export interface RecommendedRate {
  index: number
  id: string
  reason: "cheapest" | "rfr_response" | "only_option" | "preferred_carrier"
  rate: RateCandidateInput
}

function transitMinutes(r: RateCandidateInput): number | null {
  const d = r.transit_time_days
  if (!d) return null
  const days = d.min ?? d.max
  return days != null ? days * 24 * 60 : null
}

function pricedTotal(r: RateCandidateInput): number | null {
  const t = r.total_amount
  if (t == null || !Number.isFinite(t) || t <= 0) return null
  return t
}

export function recommendRate(
  rates: RateCandidateInput[],
  opts?: {
    preferred_carriers?: string[]
    strategy?: "cheapest" | "recommended"
  }
): RecommendedRate | null {
  if (!rates.length) return null

  const preferred = (opts?.preferred_carriers ?? []).map((c) => c.toLowerCase())
  const withMeta = rates.map((rate, index) => ({
    rate,
    index,
    id: String(rate.id ?? `idx:${index}`),
    total: pricedTotal(rate),
    currency: (rate.currency ?? "").trim().toUpperCase() || "USD",
    transit: transitMinutes(rate),
    agentQuoted: Boolean(rate.agent_quoted),
    carrier: (rate.carrier_name ?? "").toLowerCase(),
  }))

  const priced = withMeta.filter((r) => r.total != null)
  if (!priced.length) return null

  if (preferred.length) {
    const hit = priced.find((r) => preferred.some((p) => r.carrier.includes(p)))
    if (hit) {
      return {
        index: hit.index,
        id: hit.id,
        reason: "preferred_carrier",
        rate: hit.rate,
      }
    }
  }

  const agent = priced.filter((r) => r.agentQuoted)
  const pool = agent.length ? agent : priced

  // Dominant currency
  const counts = new Map<string, number>()
  for (const r of pool)
    counts.set(r.currency, (counts.get(r.currency) ?? 0) + 1)
  let dom = pool[0].currency
  for (const [c, n] of counts) {
    if (n > (counts.get(dom) ?? 0)) dom = c
  }
  const comparable = pool.filter((r) => r.currency === dom)

  comparable.sort(
    (a, b) =>
      (a.total as number) - (b.total as number) ||
      (a.transit ?? Number.POSITIVE_INFINITY) -
        (b.transit ?? Number.POSITIVE_INFINITY) ||
      a.index - b.index
  )
  const best = comparable[0]
  const reason =
    agent.length > 0
      ? "rfr_response"
      : priced.length === 1
        ? "only_option"
        : "cheapest"

  return { index: best.index, id: best.id, reason, rate: best.rate }
}
