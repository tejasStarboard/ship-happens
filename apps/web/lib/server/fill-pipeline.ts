import { randomUUID } from "node:crypto"
import { asc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { rfpLogs, rfpProgressSteps } from "@/lib/db/schema"

export const FILL_PROGRESS_STEPS = [
  { key: "ingest", label: "Ingest / parse", sortOrder: 0 },
  { key: "map", label: "Map columns", sortOrder: 1 },
  { key: "rates", label: "Rates resolved", sortOrder: 2 },
  { key: "overlay", label: "Overlay applied", sortOrder: 3 },
  { key: "review", label: "Review", sortOrder: 4 },
  { key: "export", label: "Export", sortOrder: 5 },
] as const

export type ProgressStepKey = (typeof FILL_PROGRESS_STEPS)[number]["key"]
export type ProgressStatus =
  "pending" | "running" | "done" | "failed" | "skipped"
export type LogLevel = "debug" | "info" | "warn" | "error"

function stepId() {
  return `step_${randomUUID().replaceAll("-", "").slice(0, 16)}`
}

function logId() {
  return `log_${randomUUID().replaceAll("-", "").slice(0, 16)}`
}

export async function seedFillProgressSteps(
  rfpId: string,
  options?: { ingestStatus?: ProgressStatus; ingestDetail?: string }
) {
  const ingestStatus = options?.ingestStatus ?? "done"
  const now = new Date()

  await db.insert(rfpProgressSteps).values(
    FILL_PROGRESS_STEPS.map((step) => {
      const isIngest = step.key === "ingest"
      return {
        id: stepId(),
        rfpId,
        key: step.key,
        label: step.label,
        sortOrder: step.sortOrder,
        status: isIngest ? ingestStatus : ("pending" as ProgressStatus),
        detail: isIngest ? (options?.ingestDetail ?? null) : null,
        startedAt: isIngest ? now : null,
        completedAt: isIngest && ingestStatus === "done" ? now : null,
      }
    })
  )
}

export async function appendRfpLog(input: {
  rfpId: string
  message: string
  level?: LogLevel
  stepKey?: string | null
  source?: string | null
  metadata?: Record<string, unknown>
}) {
  await db.insert(rfpLogs).values({
    id: logId(),
    rfpId: input.rfpId,
    message: input.message,
    level: input.level ?? "info",
    stepKey: input.stepKey ?? null,
    source: input.source ?? "intake",
    metadata: input.metadata ?? {},
  })
}

export async function listRfpProgressSteps(rfpId: string) {
  return db
    .select()
    .from(rfpProgressSteps)
    .where(eq(rfpProgressSteps.rfpId, rfpId))
    .orderBy(asc(rfpProgressSteps.sortOrder))
}

export async function listRfpLogs(rfpId: string) {
  return db
    .select()
    .from(rfpLogs)
    .where(eq(rfpLogs.rfpId, rfpId))
    .orderBy(asc(rfpLogs.createdAt))
}
