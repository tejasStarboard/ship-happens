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
4. For **rates**: prefer `sh-client rates resolve` (server Starboard resolve + Progress `rates` + logs, then overlays + Progress `overlay`). Do not invent money cells. Manual `agentStartStep`/`agentCompleteStep` for `rates` / `overlay` only if debugging.
5. Overlay rules are configured in the Overlays UI (org/customer). Resolve applies projected sells on no-buy lanes and markup on priced buys automatically.
6. Floor-margin rules live under **Settings → Floor margins**. After overlay apply, buy+sell lanes that breach the matched floor open Phase 2b reviews (`source: margin-floor`, `stepKey: overlay`) and hold Progress until cleared. Projected-only (no buy) lanes are not floor-checked. Confirm keeps the proposed sell; then `agentCompleteStep` for `overlay` if still open.
7. For **export**: prefer `sh-client export` (writes sells into the original BCO template via `agent-xlsx`, stores Blob + workspace `filled/`). Opens a Phase 2b **Final export sign-off** review (`source: export-signoff`, `stepKey: export`) and holds Progress `export` + `review` until the analyst **Confirm**s on Overview — do **not** `agentCompleteStep` for `export`/`review` while that wait is open. Confirm unlocks download and completes those steps; Reject keeps download blocked.
8. When the fill finishes: `agentSetRfpStatus(rfpId, "done")` or `"needs_review"` / `"failed"`

## Open review waits

`sh-client reviews create` **or** server floor-margin enforcement force-holds Progress
(fill → `needs_review`; step with `stepKey` stays running until pending waits
clear). Do **not** call `agentCompleteStep` for a step that still has open
(`pending`) reviews — it errors. After the human leaves pending (Confirm / Edit /
Reject), continue or complete the step yourself.

## Not this skill

Sandbox **inspect**, **submit-for-review**, **read decisions**, and **resolve after ack**
use the **`sh-client`** CLI skill. Creating a review item is the supported HITL
submit path — it is not an ad-hoc DB write.
