import type { CrmMatchPort, GeoResolvePort } from "@ship-happens/fill"
import { matchCustomerLabel } from "@/lib/jev/match-customer"
import { resolvePlaceLabel } from "@/lib/jev/resolve-place"
import type { StarboardClient } from "@/lib/starboard/client"

/** Adapts Starboard locations search + Jev into the fill GeoResolvePort. */
export function createGeoResolvePort(
  createClient: () => Promise<StarboardClient>
): GeoResolvePort {
  return {
    async resolvePlace(label: string) {
      return resolvePlaceLabel(label, async (query) => {
        const client = await createClient()
        const result = await client.locations.resolve(query)
        return {
          options: result.options.map((o) => ({
            city: o.city,
            country: o.country,
            country_code: o.country_code,
            locodes: o.locodes ?? [],
          })),
        }
      })
    },
  }
}

/** Optional CRM enrichment — always fail-open. */
export function createCrmMatchPort(): CrmMatchPort {
  return {
    matchCustomer: (label) => matchCustomerLabel(label),
  }
}
