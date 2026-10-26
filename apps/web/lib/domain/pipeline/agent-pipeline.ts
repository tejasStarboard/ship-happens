/**
 * Agent-facing entry points for fill progress.
 * All mutations go through FillPipelineManager (sole writer).
 */
import { createAppContext } from "@/lib/di/create-app-context"
import type {
  ProgressStepKey,
  RfpRunStatus,
} from "@/lib/domain/pipeline/fill-pipeline.manager"

export async function agentStartStep(
  rfpId: string,
  key: ProgressStepKey,
  detail?: string
) {
  return createAppContext().pipeline.startStep(rfpId, key, detail)
}

export async function agentCompleteStep(
  rfpId: string,
  key: ProgressStepKey,
  detail?: string
) {
  return createAppContext().pipeline.completeStep(rfpId, key, detail)
}

export async function agentFailStep(
  rfpId: string,
  key: ProgressStepKey,
  message: string
) {
  return createAppContext().pipeline.failStep(rfpId, key, message)
}

export async function agentSetRfpStatus(
  rfpId: string,
  status: RfpRunStatus,
  errorMessage?: string | null
) {
  return createAppContext().pipeline.setRfpStatus(rfpId, status, {
    errorMessage,
  })
}

export async function agentAppendLog(input: {
  rfpId: string
  message: string
  stepKey?: string | null
  level?: "debug" | "info" | "warn" | "error"
}) {
  return createAppContext().pipeline.appendLog({
    ...input,
    source: "agent",
  })
}
