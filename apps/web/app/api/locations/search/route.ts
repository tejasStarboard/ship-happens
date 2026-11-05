import { NextResponse } from "next/server"
import { requireOrgSession } from "@/lib/auth/session"
import { jsonDomainError } from "@/lib/domain/http"
import { createStarboardClient } from "@/lib/starboard/client"

export type LocationSearchHit = {
  locode: string
  label: string
  city: string | null
  country: string | null
}

/**
 * Starboard geo search (UN/LOCODE) for overlay / rules pickers.
 * GET /api/locations/search?q=shanghai
 */
export async function GET(request: Request) {
  try {
    await requireOrgSession()
    const url = new URL(request.url)
    const q = (url.searchParams.get("q") ?? "").trim()
    if (q.length < 2) {
      return NextResponse.json({ query: q, options: [] as LocationSearchHit[] })
    }

    const client = await createStarboardClient()
    const result = await client.locations.resolve(q)

    const options: LocationSearchHit[] = []
    for (const opt of result.options) {
      const locodes = opt.locodes ?? []
      const city =
        typeof opt.city === "string"
          ? opt.city
          : opt.city != null
            ? String(opt.city)
            : null
      const country =
        typeof opt.country === "string"
          ? opt.country
          : opt.country != null
            ? String(opt.country)
            : null
      for (const locode of locodes.slice(0, 3)) {
        if (!locode) continue
        const parts = [city, country].filter(Boolean)
        options.push({
          locode,
          label: parts.length > 0 ? `${locode} · ${parts.join(", ")}` : locode,
          city,
          country,
        })
      }
    }

    return NextResponse.json({
      query: q,
      options: options.slice(0, 12),
    })
  } catch (error) {
    return jsonDomainError(error, "Location search failed")
  }
}
