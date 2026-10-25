export type RfpStatus =
  "queued" | "running" | "needs_review" | "done" | "failed"

export const RFP_STATUS_LABEL: Record<RfpStatus, string> = {
  queued: "Queued",
  running: "Running",
  needs_review: "Needs review",
  done: "Done",
  failed: "Failed",
}

export type RfpListItem = {
  id: string
  name: string
  customer: string
  status: RfpStatus
  templateName: string
  updatedAt: string
  owner: string
}

export type RfpProgressStepView = {
  id: string
  key: string
  label: string
  status: string
  detail: string | null
  sortOrder: number
  startedAt: string | null
  completedAt: string | null
}

export type RfpLogView = {
  id: string
  level: string
  message: string
  stepKey: string | null
  source: string | null
  createdAt: string
}

export type RfpSourceFileView = {
  id: string
  fileName: string
  mimeType: string
  sizeBytes: number
  fileUrl: string
  sheetNames: string[]
  createdAt: string
}

export type RfpDetailView = RfpListItem & {
  progressSteps: RfpProgressStepView[]
  logs: RfpLogView[]
  sourceFiles: RfpSourceFileView[]
  filledFileUrl: string | null
}

export function asRfpStatus(value: string): RfpStatus {
  switch (value) {
    case "queued":
    case "running":
    case "needs_review":
    case "done":
    case "failed":
      return value
    case "cancelled":
      return "failed"
    default:
      return "queued"
  }
}
