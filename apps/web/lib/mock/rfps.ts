export type RfpStatus =
  "queued" | "running" | "needs_review" | "done" | "failed"

export type MockRfp = {
  id: string
  name: string
  customer: string
  status: RfpStatus
  templateName: string
  updatedAt: string
  owner: string
}

export const MOCK_RFPS: MockRfp[] = [
  {
    id: "rfp_nordstrom_q2",
    name: "Nordstrom FCL Q2",
    customer: "Nordstrom",
    status: "needs_review",
    templateName: "Nordstrom bid sheet v3.xlsx",
    updatedAt: "2026-10-02T18:20:00.000Z",
    owner: "Tejas Ladhe",
  },
  {
    id: "rfp_target_asia",
    name: "Target Asia lanes",
    customer: "Target",
    status: "running",
    templateName: "Target rate RFP.xlsx",
    updatedAt: "2026-10-03T01:05:00.000Z",
    owner: "Tejas Ladhe",
  },
  {
    id: "rfp_walmart_us",
    name: "Walmart US West",
    customer: "Walmart",
    status: "done",
    templateName: "Walmart FCL template.xlsx",
    updatedAt: "2026-09-28T14:10:00.000Z",
    owner: "Tejas Ladhe",
  },
  {
    id: "rfp_demo_failed",
    name: "Demo failed run",
    customer: "Internal",
    status: "failed",
    templateName: "Sample sheet.xlsx",
    updatedAt: "2026-09-20T09:00:00.000Z",
    owner: "Tejas Ladhe",
  },
]

export function getMockRfp(id: string) {
  return MOCK_RFPS.find((rfp) => rfp.id === id) ?? null
}

export const RFP_STATUS_LABEL: Record<RfpStatus, string> = {
  queued: "Queued",
  running: "Running",
  needs_review: "Needs review",
  done: "Done",
  failed: "Failed",
}
