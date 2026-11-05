import type { StarboardHttp } from "../../http/starboardHttp.js"

export type CarrierVocabEntry = {
  name: string
  scac_codes: string[]
  carrier_codes?: string[]
}

export type ScacLookupResult = {
  scac: string | null
  candidates: string[]
}

/**
 * Prefer 4-letter *U matching carrier initials (CMA CGM → CMDU, COSCO → COSU).
 * Else first *U, else first code. Never invents when vocab misses.
 */
export function pickPreferredScac(
  codes: string[],
  carrierName: string
): string | null {
  const normalized = codes
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean)
  if (!normalized.length) return null
  const fourU = normalized.filter((x) => /^[A-Z]{3}U$/.test(x))
  const tokens = carrierName.match(/[A-Za-z]{2,}/g) ?? []
  const first = (tokens[0] ?? "").toUpperCase()
  const initials = tokens.map((t) => t[0]!.toUpperCase()).join("")
  if (fourU.length) {
    return (
      fourU.find(
        (code) => initials.length >= 2 && code.startsWith(initials.slice(0, 2))
      ) ??
      fourU.find((code) => first && first.startsWith(code.slice(0, 2))) ??
      fourU.find((code) => first && code.startsWith(first.slice(0, 2))) ??
      fourU[0] ??
      null
    )
  }
  return normalized[0] ?? null
}

/**
 * Lookup SCAC for a carrier display name via Starboard `/carriers`.
 * Returns null when vocab is unavailable or name does not match — never invent.
 */
export function scacFromCarrierVocab(
  entries: CarrierVocabEntry[],
  carrierName: string | null | undefined
): string | null {
  return scacFromCarrierVocabDetailed(entries, carrierName).scac
}

export function scacFromCarrierVocabDetailed(
  entries: CarrierVocabEntry[],
  carrierName: string | null | undefined
): ScacLookupResult {
  const needle = carrierName?.trim().toLowerCase()
  if (!needle) return { scac: null, candidates: [] }
  const hit = entries.find((e) => e.name.trim().toLowerCase() === needle)
  const candidates = (hit?.scac_codes ?? [])
    .filter((c): c is string => typeof c === "string" && c.trim().length > 0)
    .map((c) => c.trim().toUpperCase())
  if (!candidates.length) return { scac: null, candidates: [] }
  return {
    scac: pickPreferredScac(candidates, carrierName!.trim()),
    candidates,
  }
}

function asCarrierList(body: unknown): CarrierVocabEntry[] {
  if (!body || typeof body !== "object") return []
  const o = body as Record<string, unknown>
  const list = Array.isArray(o.data)
    ? o.data
    : Array.isArray(o.carriers)
      ? o.carriers
      : Array.isArray(o.results)
        ? o.results
        : Array.isArray(body)
          ? body
          : []
  const out: CarrierVocabEntry[] = []
  for (const raw of list) {
    if (!raw || typeof raw !== "object") continue
    const row = raw as Record<string, unknown>
    const name = typeof row.name === "string" ? row.name.trim() : ""
    if (!name) continue
    const codes = Array.isArray(row.scac_codes)
      ? row.scac_codes.filter(
          (c): c is string => typeof c === "string" && c.trim().length > 0
        )
      : []
    out.push({ name, scac_codes: codes })
  }
  return out
}

export class CarriersModule {
  private cache: CarrierVocabEntry[] | null = null

  constructor(private readonly http: StarboardHttp) {}

  /** Active carrier vocab (GET /carriers). Soft-fail → empty list. */
  async listActive(): Promise<CarrierVocabEntry[]> {
    if (this.cache) return this.cache
    try {
      const body = await this.http.request<unknown>("GET", "/carriers")
      this.cache = asCarrierList(body)
    } catch {
      this.cache = []
    }
    return this.cache
  }

  async lookupScac(carrierName: string | null | undefined): Promise<string | null> {
    const detailed = await this.lookupScacDetailed(carrierName)
    return detailed.scac
  }

  async lookupScacDetailed(
    carrierName: string | null | undefined
  ): Promise<ScacLookupResult> {
    const entries = await this.listActive()
    return scacFromCarrierVocabDetailed(entries, carrierName)
  }
}
