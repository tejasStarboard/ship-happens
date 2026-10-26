/**
 * Charge ontology helpers for RFP clubbing.
 * Mirrors FCL v6 charge_inventory codes + ocean-leg families and webapp
 * surchargeCategories keywords — kept local so sb-client stays standalone.
 */

/** Common ocean surcharge codes (from ocean_fcl_v6/charge_inventory._CODES). */
export const CHARGE_CODES = new Set(
  `BAF FAF CAF EBS EBA LSS LSF ECA THC OTHC DTHC THD THO ISPS ISP PSS GRI RR PCS PCC CIC EIS
   OWS OWC HWS WRS WRC SCS PCAF AMS ENS ACI AFR AFS DOC DDC DDF ACS CFC CSF CPC EFS EFF ERS ERC
   IFP ISD ISF LWS OBS PSC SEC SMD STF TSC TAD ADF NBF GPO MUF DPS OCS CNS LCF SSD CUC CDD ARD
   BUC EMS EMF ODF CYR CYC TLX VGM PAD PAE EQS EIC HEA EIF ORC CSC IHC CAS BRC PCA LSA OPA`
    .split(/\s+/)
    .filter(Boolean)
)

/** Codes that ride the ocean freight leg (from v6 to_fcl_base_route._OCEAN_CODES). */
const OCEAN_CODES = new Set(
  "baf faf buc efs ebs pss pcs lss lsr lsf hea hws ows gri war wrs suz eis ets caf eca cic".split(
    " "
  )
)

const OCEAN_PHRASE =
  /bunker|fuel|peak season|low sulph|low sulf|heavy weight|heavyweight|overweight|war risk|suez|canal|currency adj|general rate|emission|carbon|piracy|congestion|imbalance/i

const INLAND_PHRASE =
  /pre-?carriage|on-?carriage|inland|haulage|truck|rail|drayage/i

const ORIGIN_PHRASE =
  /\b(origin|orig|pol|otc|othc|origin thc|origin terminal|pickup|export|origin handling)\b/i

const DEST_PHRASE =
  /\b(destination|dest|pod|dthc|destination thc|destination terminal|delivery|import|dest handling|pier pass|chassis)\b/i

const BASE_FREIGHT =
  /^(ocean[_\s-]?freight|basic ocean freight|freight|o\/?f|base rate|all-?in)$/i

const DOC_FEE =
  /\b(ams|ens|aci|isf|isf 10|documentation|doc fee|b\/?l fee|bl fee|manifest)\b/i

export type ChargeBucket =
  | "base_freight"
  | "freight_surcharge"
  | "origin"
  | "destination"
  | "documentation"
  | "inland"
  | "globals"
  | "unknown"

export interface ClassifiedCharge {
  name: string
  bucket: ChargeBucket
  normalized_code: string | null
  amount?: number | null
  currency?: string | null
}

export function normalizeChargeToken(name: string): string {
  return name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
}

export function classifySurchargeName(name: string): ClassifiedCharge {
  const raw = name?.trim() || ""
  const lower = raw.toLowerCase()
  const code = normalizeChargeToken(raw)
  const knownCode = CHARGE_CODES.has(code) ? code : null

  if (BASE_FREIGHT.test(lower) || lower === "ocean_freight") {
    return { name: raw, bucket: "base_freight", normalized_code: knownCode }
  }
  if (INLAND_PHRASE.test(lower)) {
    return { name: raw, bucket: "inland", normalized_code: knownCode }
  }
  if (
    DOC_FEE.test(lower) ||
    code === "AMS" ||
    code === "ISF" ||
    code === "ENS"
  ) {
    return {
      name: raw,
      bucket: "documentation",
      normalized_code: knownCode || code || null,
    }
  }
  if (ORIGIN_PHRASE.test(lower) && !DEST_PHRASE.test(lower)) {
    return { name: raw, bucket: "origin", normalized_code: knownCode }
  }
  if (DEST_PHRASE.test(lower)) {
    return { name: raw, bucket: "destination", normalized_code: knownCode }
  }
  const ocean =
    OCEAN_CODES.has(code.toLowerCase()) ||
    [...OCEAN_CODES].some((c) => lower.includes(c)) ||
    OCEAN_PHRASE.test(lower)
  if (ocean) {
    return {
      name: raw,
      bucket: "freight_surcharge",
      normalized_code: knownCode || code || null,
    }
  }
  if (lower.includes("global") || lower === "globals") {
    return { name: raw, bucket: "globals", normalized_code: knownCode }
  }
  return { name: raw, bucket: "unknown", normalized_code: knownCode }
}

/** Default RFP-ish headings → which buckets roll into them. */
export const DEFAULT_HEADING_BUCKETS: Record<string, ChargeBucket[]> = {
  base: ["base_freight"],
  ocean_freight: ["base_freight"],
  baf: ["freight_surcharge"],
  freight_surcharges: ["freight_surcharge"],
  origin_fees: ["origin"],
  destination_fees: ["destination"],
  documentation: ["documentation"],
  ams: ["documentation"],
  isf: ["documentation"],
  inland: ["inland"],
  delivery: ["inland", "destination"],
  total: [
    "base_freight",
    "freight_surcharge",
    "origin",
    "destination",
    "documentation",
    "inland",
    "globals",
    "unknown",
  ],
}

export interface RollupInputCharge {
  name: string
  amount: number
  currency?: string | null
  bucket?: ChargeBucket
}

export interface RollupHeading {
  heading: string
  amount: number
  currency: string | null
  constituents: Array<{ name: string; amount: number; bucket: ChargeBucket }>
}

export function rollupCharges(params: {
  charges: RollupInputCharge[]
  /** heading → buckets; defaults to DEFAULT_HEADING_BUCKETS keys requested */
  headings?: string[]
  heading_buckets?: Record<string, ChargeBucket[]>
}): { headings: RollupHeading[]; unassigned: RollupInputCharge[] } {
  const map = params.heading_buckets ?? DEFAULT_HEADING_BUCKETS
  const headingNames = params.headings ?? Object.keys(map)
  const classified = params.charges.map((c) => {
    const cls = c.bucket ? { bucket: c.bucket } : classifySurchargeName(c.name)
    return { ...c, bucket: cls.bucket }
  })

  const used = new Set<number>()
  const headings: RollupHeading[] = []
  for (const heading of headingNames) {
    const buckets = new Set(map[heading] ?? [])
    const isTotal = heading === "total" || heading.endsWith("_total")
    const constituents = classified
      .map((c, i) => ({ c, i }))
      .filter(({ c, i }) => buckets.has(c.bucket) && (isTotal || !used.has(i)))
    if (!isTotal) {
      for (const { i } of constituents) used.add(i)
    }
    const amount = constituents.reduce((s, { c }) => s + c.amount, 0)
    const currency = constituents[0]?.c.currency ?? null
    headings.push({
      heading,
      amount,
      currency,
      constituents: constituents.map(({ c }) => ({
        name: c.name,
        amount: c.amount,
        bucket: c.bucket,
      })),
    })
  }

  const unassigned = classified.filter((_, i) => !used.has(i))
  return { headings, unassigned }
}

/**
 * Thin BCO helper (SB-7088): roll resolved surcharges / globals into
 * requested sheet fee headings. Does not invent amounts.
 */
export function allocateChargesToHeadings(params: {
  charges: RollupInputCharge[]
  headings: string[]
  heading_buckets?: Record<string, ChargeBucket[]>
}): {
  headings: RollupHeading[]
  unexpected: RollupInputCharge[]
} {
  const { headings, unassigned } = rollupCharges({
    charges: params.charges,
    headings: params.headings,
    heading_buckets: params.heading_buckets,
  })
  const unexpected = unassigned.filter((c) => {
    const bucket = c.bucket ?? classifySurchargeName(c.name).bucket
    return bucket !== "base_freight"
  })
  return { headings, unexpected }
}
