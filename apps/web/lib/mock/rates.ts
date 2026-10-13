export type MockRateRow = {
  id: string
  origin: string
  destination: string
  carrier: string
  containerType: string
  rateUsd: number
  validUntil: string
}

/** Placeholder rows for the rates query UI — replace with Starboard DB later. */
export const MOCK_RATE_RESULTS: MockRateRow[] = [
  {
    id: "rate_1",
    origin: "CNSHA",
    destination: "USLAX",
    carrier: "OOCL",
    containerType: "40HC",
    rateUsd: 1850,
    validUntil: "2026-10-31",
  },
  {
    id: "rate_2",
    origin: "CNSHA",
    destination: "USLAX",
    carrier: "MSC",
    containerType: "40HC",
    rateUsd: 1925,
    validUntil: "2026-10-28",
  },
  {
    id: "rate_3",
    origin: "CNNGB",
    destination: "USNYC",
    carrier: "COSCO",
    containerType: "40GP",
    rateUsd: 2410,
    validUntil: "2026-11-15",
  },
]
