import type { StarboardHttp } from "../../http/starboardHttp.js"
import { splitVia, splitViaAlternates } from "../../lib/laneText.js"
import {
  canonicalizeLocode,
  resolveLaneLocodesForFill,
  type CanonicalizeResult,
  type ResolveLaneForFillResult,
} from "./locodeAliases.js"

export {
  canonicalizeLocode,
  resolveLaneLocodesForFill,
  LOCODE_ALIASES,
  NAME_TO_LOCODES,
  type CanonicalizeResult,
  type ResolveLaneForFillResult,
} from "./locodeAliases.js"

function topLocodes(option: Record<string, unknown>): string[] {
  const unlocodes = option.unlocodes
  if (!Array.isArray(unlocodes)) return []
  return unlocodes
    .map((u) => {
      if (typeof u === "string") return u
      if (u && typeof u === "object" && "code" in u)
        return String((u as { code: unknown }).code)
      return null
    })
    .filter((c): c is string => Boolean(c))
}

export class LocationsModule {
  constructor(private readonly http: StarboardHttp) {}

  async resolve(query: string, opts?: { include_airports?: boolean }) {
    const includeAirports = opts?.include_airports ?? false
    const params = new URLSearchParams({ query })
    if (!includeAirports) params.set("include_airports", "false")
    const { options } = await this.http.request<{ options: unknown[] }>(
      "GET",
      `/standardize/search_geo_unlocodes?${params}`
    )
    const simplified = (options as Record<string, unknown>[])
      .slice(0, 8)
      .map((o) => ({
        city: o.city,
        country: o.country,
        country_code: o.country_code ?? o.countryCode,
        locodes: topLocodes(o),
        coordinates: o.coordinates,
      }))
    return {
      query,
      count: simplified.length,
      options: simplified,
      best_locode: simplified[0]?.locodes?.[0] ?? null,
    }
  }

  async resolveLane(args: {
    origin: string
    destination: string
    origin_via?: string
    include_airports?: boolean
  }) {
    const includeAirports = args.include_airports ?? false
    const destSplit = splitVia(args.destination)
    const originSplit = args.origin_via
      ? { primary: args.origin, via: args.origin_via }
      : splitVia(args.origin)

    const resolveOne = async (query: string) => {
      const r = await this.resolve(query, { include_airports: includeAirports })
      return {
        query,
        best_locode: r.best_locode,
        city: r.options[0]?.city,
        country: r.options[0]?.country,
        locodes: r.options[0]?.locodes ?? [],
      }
    }

    const viaQueries = destSplit.via ? splitViaAlternates(destSplit.via) : []
    const [origin, destination, ...vias] = await Promise.all([
      resolveOne(originSplit.primary),
      resolveOne(destSplit.primary),
      ...viaQueries.map((q) => resolveOne(q)),
    ])

    return {
      origin,
      destination,
      destination_via: vias,
      origin_via: originSplit.via ? await resolveOne(originSplit.via) : null,
      search_hint: {
        origin_locodes: origin.best_locode ? [origin.best_locode] : [],
        destination_locodes: destination.best_locode
          ? [destination.best_locode]
          : [],
        destination_via_locodes: vias
          .map((v) => v.best_locode)
          .filter((c): c is string => Boolean(c)),
      },
    }
  }

  /**
   * Sheet code/label → locode list via alias table; falls back to geo search
   * only when alias/name miss and query is not an empty reason.
   */
  async canonicalize(
    codeOrLabel: string,
    opts?: { include_airports?: boolean; geoFallback?: boolean }
  ): Promise<CanonicalizeResult & { geo_best?: string | null }> {
    const local = canonicalizeLocode(codeOrLabel)
    if (local.locodes.length) return local
    if (opts?.geoFallback === false) return local
    if (!codeOrLabel.trim()) return local
    try {
      const r = await this.resolve(codeOrLabel, {
        include_airports: opts?.include_airports,
      })
      if (r.best_locode) {
        return {
          query: codeOrLabel.trim(),
          locodes: [r.best_locode],
          source: "unlocode",
          geo_best: r.best_locode,
        }
      }
    } catch {
      /* keep empty */
    }
    return local
  }

  /**
   * Origin/destination sheet labels → locode arrays for `rates.resolve`.
   * Alias-first; optional geo fallback per side when alias misses.
   */
  async resolveLaneForFill(args: {
    origin: string
    destination: string
    geoFallback?: boolean
    include_airports?: boolean
  }): Promise<ResolveLaneForFillResult> {
    const base = resolveLaneLocodesForFill({
      origin: args.origin,
      destination: args.destination,
    })
    if (base.ok || args.geoFallback === false) return base

    const [o, d] = await Promise.all([
      base.origin_locodes.length
        ? Promise.resolve(base.origin)
        : this.canonicalize(args.origin, {
            geoFallback: true,
            include_airports: args.include_airports,
          }),
      base.destination_locodes.length
        ? Promise.resolve(base.destination)
        : this.canonicalize(args.destination, {
            geoFallback: true,
            include_airports: args.include_airports,
          }),
    ])
    const origin_locodes = o.locodes
    const destination_locodes = d.locodes
    const ok = origin_locodes.length > 0 && destination_locodes.length > 0
    return {
      origin: o,
      destination: d,
      origin_locodes,
      destination_locodes,
      ok,
      reason: ok
        ? undefined
        : [
            !origin_locodes.length
              ? `origin:${o.reason ?? "empty"}`
              : null,
            !destination_locodes.length
              ? `destination:${d.reason ?? "empty"}`
              : null,
          ]
            .filter(Boolean)
            .join(";"),
    }
  }
}
