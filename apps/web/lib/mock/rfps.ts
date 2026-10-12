export type RfpStatus =
  "queued" | "running" | "needs_review" | "done" | "failed"

export const RFP_STATUS_LABEL: Record<RfpStatus, string> = {
  queued: "Queued",
  running: "Running",
  needs_review: "Needs review",
  done: "Done",
  failed: "Failed",
}
