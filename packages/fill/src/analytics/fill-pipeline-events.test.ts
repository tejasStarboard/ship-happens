import { describe, expect, it } from "vitest"
import {
  FILL_PIPELINE_EVENT_TYPES,
  pipelineEventForStepDone,
} from "./fill-pipeline-events"

describe("pipelineEventForStepDone", () => {
  it("maps milestone steps to lifecycle events", () => {
    expect(pipelineEventForStepDone("ingest")).toBe("intake.completed")
    expect(pipelineEventForStepDone("map")).toBe("mapping.confirmed")
    expect(pipelineEventForStepDone("rates")).toBe("rates.completed")
    expect(pipelineEventForStepDone("export")).toBe("export.signed_off")
  })

  it("ignores non-milestone steps", () => {
    expect(pipelineEventForStepDone("overlay")).toBeNull()
    expect(pipelineEventForStepDone("review")).toBeNull()
    expect(pipelineEventForStepDone("unknown")).toBeNull()
  })

  it("exposes the five AC event types", () => {
    expect(FILL_PIPELINE_EVENT_TYPES).toEqual([
      "intake.completed",
      "mapping.confirmed",
      "rates.completed",
      "review.resolved",
      "export.signed_off",
    ])
  })
})
