import { describe, expect, it, vi } from "vitest"
import { createStarboardRatesPort } from "./starboard-rates-adapter"

describe("createStarboardRatesPort", () => {
  it("maps transit_time + origin_free_time through adapter → port", async () => {
    const resolve = vi.fn().mockResolvedValue({
      rates: [
        {
          id: "hit_1",
          carrier_name: "MSC",
          transit_time: 18,
          service_name: "Pendulum",
          effective_from: "2024-01-01",
          expires_on: "2024-12-31",
          resolved_buy_total: 1500,
          resolved_currency: "USD",
          resolved_surcharges: [],
          rate_items: [
            { name: "origin_free_time", free_usage: 7, usage_unit: "day" },
          ],
        },
      ],
    })
    const port = createStarboardRatesPort(
      async () =>
        ({
          rates: { resolve },
          carriers: { lookupScac: vi.fn().mockResolvedValue("MSCU") },
        }) as never
    )

    const out = await port.resolve({
      service_type: "ocean_fcl",
      origin_locodes: ["CNSHA"],
      destination_locodes: ["USLAX"],
      cargo: { cargo_type: "container", container_types: ["40HC"] },
    })

    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({
      id: "hit_1",
      carrier_name: "MSC",
      carrier_scac: "MSCU",
      resolved_buy_total: 1500,
      transit_time_days: 18,
      service_name: "Pendulum",
      effective_from: "2024-01-01",
      expires_on: "2024-12-31",
      free_time: {
        originDays: 7,
        destDays: null,
        detentionOrigin: null,
        detentionDest: null,
        demurrageOrigin: null,
        demurrageDest: null,
      },
    })
  })
})
