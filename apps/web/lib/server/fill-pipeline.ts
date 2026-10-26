/**
 * @deprecated Prefer `createAppContext().pipeline` (FillPipelineManager).
 * Re-exports kept for existing callers during migration.
 */
import { createAppContext } from "@/lib/di/create-app-context"
import {
  FILL_PROGRESS_STEPS,
  type LogLevel,
  type ProgressStatus,
  type ProgressStepKey,
} from "@/lib/domain/pipeline/fill-pipeline.manager"

export {
  FILL_PROGRESS_STEPS,
  type LogLevel,
  type ProgressStatus,
  type ProgressStepKey,
}

export async function seedFillProgressSteps(
  rfpId: string,
  options?: { ingestStatus?: ProgressStatus; ingestDetail?: string }
) {
  return createAppContext().pipeline.seedSteps(rfpId, options)
}

export async function appendRfpLog(input: {
  rfpId: string
  message: string
  level?: LogLevel
  stepKey?: string | null
  source?: string | null
  metadata?: Record<string, unknown>
}) {
  return createAppContext().pipeline.appendLog(input)
}

export async function listRfpProgressSteps(rfpId: string) {
  return createAppContext().pipeline.listSteps(rfpId)
}

export async function listRfpLogs(rfpId: string) {
  return createAppContext().pipeline.listLogs(rfpId)
}

/** Agent / tools: advance a pipeline step through the sole writer. */
export async function startFillStep(
  rfpId: string,
  key: ProgressStepKey,
  detail?: string
) {
  return createAppContext().pipeline.startStep(rfpId, key, detail)
}

export async function completeFillStep(
  rfpId: string,
  key: ProgressStepKey,
  detail?: string
) {
  return createAppContext().pipeline.completeStep(rfpId, key, detail)
}

export async function failFillStep(
  rfpId: string,
  key: ProgressStepKey,
  message: string
) {
  return createAppContext().pipeline.failStep(rfpId, key, message)
}
