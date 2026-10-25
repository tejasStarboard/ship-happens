---
name: fill-pipeline
description: >-
  Update RFP fill progress steps, logs, and status through the sole writer
  (FillPipelineManager). Use when advancing ingest/map/rates/overlay/review/export.
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
