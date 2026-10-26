---
name: fill-pipeline
description: >-
  Update RFP fill progress steps, logs, and status through the sole writer
  (FillPipelineManager). Use when advancing ingest/map/rates/overlay/review/export.
  For inspect + HITL review items in the sandbox, use the sh-client skill instead.
---

# Fill pipeline (progress writer)

Do **not** write `rfps.status`, `rfp_progress_steps`, or `rfp_logs` directly.

Import from the app domain (host runtime / server tools):

```ts
import {
  agentStartStep,
  agentCompleteStep,
  agentFailStep,
  agentSetRfpStatus,
  agentAppendLog,
} from "@/lib/domain/pipeline/agent-pipeline"
```

Step keys (in order): `ingest` → `map` → `rates` → `overlay` → `review` → `export`.

Typical flow:

1. `agentStartStep(rfpId, "map")`
2. Do work
3. `agentCompleteStep(rfpId, "map", "Mapped 12 columns")` or `agentFailStep(...)`
4. When the fill finishes: `agentSetRfpStatus(rfpId, "done")` or `"needs_review"` / `"failed"`

## Open review waits

`sh-client reviews create` force-holds Progress (fill → `needs_review`; step with
`stepKey` stays running until pending waits clear). Do **not** call
`agentCompleteStep` for a step that still has open (`pending`) reviews — it
errors. After the human leaves pending (Confirm / Edit / Reject), continue or
complete the step yourself.

## Not this skill

Sandbox **inspect**, **submit-for-review**, **read decisions**, and **resolve after ack**
use the **`sh-client`** CLI skill. Creating a review item is the supported HITL
submit path — it is not an ad-hoc DB write.
