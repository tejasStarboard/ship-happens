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
4. For **rates**: prefer `sh-client rates resolve` (server Starboard resolve + Progress `rates` + fill-report cells for base / `feeBindings` / `answerBindings`). Do not invent money, free days, or SCACs. Manual `agentStartStep`/`agentCompleteStep` for `rates` / `overlay` only when debugging **or** after HITL Confirm left `rates` stuck at `running` / “Review cleared — continue step” (sandbox has **no** `progress complete` CLI — host must `agentCompleteStep`).
5. Overlay rules are configured in the Overlays UI (org/customer). Resolve applies projected sells on no-buy lanes and markup on priced buys automatically.
6. Floor-margin rules live under **Settings → Floor margins**. After overlay apply, buy+sell lanes that breach the matched floor open Phase 2b reviews (`source: margin-floor`, `stepKey: overlay`) and hold Progress until cleared. Projected-only (no buy) lanes are not floor-checked. Confirm keeps the proposed sell; then `agentCompleteStep` for `overlay` if still open.
   6b. Rate-pick confidence (threshold `0.75`): near-tie picks open `source: rate-pick` waits. Strong rows stay unblocked.
   6c. Unexpected fees (`source: unexpected-fee`, `stepKey: rates`): Starboard globals not mapped to fee columns. Soft-warn. After human Confirm, **do not** re-run `rates resolve` — cells are already persisted; call `agentCompleteStep(rfpId, "rates", detail)` from this skill / host.
7. For **export**: prefer `sh-client export` (writes fill-report cells with `sheetName`+`cellRef` into the BCO template under a new `filled/<UTC-timestamp>/` folder; older fills stay on disk). Opens **Final export sign-off**. Do **not** `agentCompleteStep` for `export`/`review` while that wait is open. Confirm unlocks download.
8. When the fill finishes: `agentSetRfpStatus(rfpId, "done")` or `"needs_review"` / `"failed"`

## Open review waits

`sh-client reviews create` **or** server unexpected-fee / floor / rate-pick force-holds Progress
(fill → `needs_review`; step with `stepKey` stays running until pending waits
clear). Do **not** call `agentCompleteStep` for a step that still has open
(`pending`) reviews — it errors. After the human leaves pending (Confirm / Edit /
Reject), **complete the step yourself** with `agentCompleteStep` — do not tell the
sandbox agent to re-run `rates resolve` as a substitute.

## M3 answer columns

Mapping must include `answerBindings` / `feeBindings` / base `cellRef` for bid-complete rows. Contract can fill: carrier_name, carrier_scac, transit_days, free_time.*, service_name, currency, validity, all_in, fee headings (LSS/BAF…). Schedule (cutoff/ETD/ETA) is out of scope.

## Demo templates

1. Nordstrom golden: `tmp/fwdfwbidexamples/Bid Examples/2024_Ocean_RFP_-_Bid_Worksheet.xlsx` (Lanes K/L/M/P/U/A/B — see `.project/docs/qa.md`)
2. `tmp/sb-tournament/Auto Zone Bid Sheet clean.xlsx`
3. `tmp/fwdfwbidexamples/Vivint - Sun Chief Express - 4.7.25.xlsx`

Happy path: upload → `mapping propose` → Confirm map → `mapping put` with bindings → Confirm mapping → `rates resolve` **once** → Confirm unexpected-fee/rate-pick → **host `agentCompleteStep` rates if still running** → overlay if needed → `export` → Confirm sign-off → Download.

## Not this skill

Sandbox **inspect**, **submit-for-review**, **read decisions**, and **resolve after ack**
use the **`sh-client`** CLI skill. Creating a review item is the supported HITL
submit path — it is not an ad-hoc DB write.
