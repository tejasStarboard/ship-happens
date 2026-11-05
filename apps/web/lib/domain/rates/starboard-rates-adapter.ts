import type {
  RateResolveSearchInput,
  ResolvedRateCandidate,
  StarboardRatesPort,
} from "@ship-happens/fill"
import {
  contractFactsFromSearchHit,
  provenanceFromSearchHit,
  type ContractSearchInput,
} from "@ship-happens/sb-client"
import type { StarboardClient } from "@/lib/starboard/client"

/**
 * Adapts `@ship-happens/sb-client` `rates.resolve` into the fill StarboardRatesPort.
 * Zod inside `resolve` validates equipment / locodes at runtime.
 * Also preserves transit / free-time / validity / service from the hit (M3 T1).
 */
export function createStarboardRatesPort(
  createClient: () => Promise<StarboardClient>
): StarboardRatesPort {
  return {
    async resolve(
      input: RateResolveSearchInput
    ): Promise<ResolvedRateCandidate[]> {
      const client = await createClient()
      const result = await client.rates.resolve(input as ContractSearchInput)
      // Soft SCAC enrich once per resolve batch (vocab miss → null, never invent).
      const names = [
        ...new Set(
          result.rates
            .map((r) => r.carrier_name?.trim())
            .filter((n): n is string => Boolean(n))
        ),
      ]
      const scacByName = new Map<string, string | null>()
      await Promise.all(
        names.map(async (name) => {
          const scac = await client.carriers.lookupScac(name)
          scacByName.set(name.toLowerCase(), scac)
        })
      )

      return result.rates.map((rate) => {
        const provenance = provenanceFromSearchHit(rate)
        const facts = contractFactsFromSearchHit(rate)
        const carrierKey = rate.carrier_name?.trim().toLowerCase() ?? ""
        return {
          id: typeof rate.id === "string" ? rate.id : undefined,
          carrier_name: rate.carrier_name ?? null,
          carrier_scac: carrierKey
            ? (scacByName.get(carrierKey) ?? null)
            : null,
          resolved_buy_total: rate.resolved_buy_total,
          resolved_currency: rate.resolved_currency,
          resolved_surcharges: (rate.resolved_surcharges ?? []).map((s) => ({
            name: s.name,
            amount: s.amount,
            currency: s.currency,
            source: s.source,
          })),
          vendor_rate_doc_id: provenance.vendorRateDocId,
          vendor_email_url: provenance.vendorEmailUrl,
          transit_time_days: facts.transit_time_days,
          service_name: facts.service_name,
          effective_from: facts.effective_from,
          expires_on: facts.expires_on,
          free_time: facts.free_time,
        }
      })
    },
  }
}
