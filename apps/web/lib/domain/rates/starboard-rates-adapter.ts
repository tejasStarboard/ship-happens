import type {
  RateResolveSearchInput,
  ResolvedRateCandidate,
  StarboardRatesPort,
} from "@ship-happens/fill"
import type { ContractSearchInput } from "@ship-happens/sb-client"
import type { StarboardClient } from "@/lib/starboard/client"

/**
 * Adapts `@ship-happens/sb-client` `rates.resolve` into the fill StarboardRatesPort.
 * Zod inside `resolve` validates equipment / locodes at runtime.
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
      return result.rates.map((rate) => ({
        id: typeof rate.id === "string" ? rate.id : undefined,
        carrier_name: rate.carrier_name ?? null,
        resolved_buy_total: rate.resolved_buy_total,
        resolved_currency: rate.resolved_currency,
        resolved_surcharges: (rate.resolved_surcharges ?? []).map((s) => ({
          name: s.name,
          amount: s.amount,
          currency: s.currency,
          source: s.source,
        })),
      }))
    },
  }
}
