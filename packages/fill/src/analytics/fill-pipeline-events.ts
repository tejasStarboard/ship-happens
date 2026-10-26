/** Durable fill lifecycle event types (ops analytics MVP). */
export const FILL_PIPELINE_EVENT_TYPES = [
  "intake.completed",
  "mapping.confirmed",
  "rates.completed",
  "review.resolved",
  "export.signed_off",
  "outcome.decided",
] as const

export type FillPipelineEventType = (typeof FILL_PIPELINE_EVENT_TYPES)[number]

/** Progress step `done` → lifecycle event (review resolve is item-scoped). */
export const STEP_DONE_PIPELINE_EVENT = {
  ingest: "intake.completed",
  map: "mapping.confirmed",
  rates: "rates.completed",
  export: "export.signed_off",
} as const satisfies Partial<Record<string, FillPipelineEventType>>

export function pipelineEventForStepDone(
  stepKey: string
): FillPipelineEventType | null {
  if (stepKey in STEP_DONE_PIPELINE_EVENT) {
    return STEP_DONE_PIPELINE_EVENT[
      stepKey as keyof typeof STEP_DONE_PIPELINE_EVENT
    ]
  }
  return null
}
