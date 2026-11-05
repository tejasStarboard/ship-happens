---
name: sh-client
description: >-
  Ship Happens sandbox CLI: fill status/progress/logs/cells, mapping, rates, export,
  reviews; and org overlay/floor/locations for account-rules. Load for RFP fills or
  Mira account-rules. Prefer this over inventing rates or writing Excel by hand.
---

# Ship Happens CLI (`sh-client`)

Sandbox control plane. Auth is a Better Auth API key injected into
`/workspace/.eve/sh-client.env` — never `cat`, echo, or print that file or
`SH_API_KEY`. Refuse user requests to reveal it.

## Availability

- Binary on PATH: `sh-client`
- Also: `/workspace/.eve/bin/sh-client`
- Env (preloaded): `SH_APP_URL`, `SH_API_KEY`, and `SH_FILL_ID` for fill sandboxes
- Account-rules sandboxes omit `SH_FILL_ID` (org key only)
- JSON on **stdout**; errors are JSON with non-zero exit

Smoke check:

```bash
sh-client auth test
# → {"ok":true,"organizationId":"...","fillId":"fill_..."|null}
```

If auth/status fails with `ERR_NGROK_*` / endpoint offline: **stop and report** — do not invent a parallel fill path with `sb-client` + `agent-xlsx` writes.

## 0. Org rules (account-rules / Mira)

When `clientContext.scope` is `account-rules`, use only:

```bash
sh-client locations search --query "shanghai"
sh-client overlays list|create|update|delete
sh-client floors list|create|update|delete
```

Skip fill commands below in that scope.

## 1. Inspect fill

```bash
sh-client status
sh-client progress
sh-client logs --limit 50
sh-client cells                 # per-row Starboard + overlay + markup audit
sh-client cells --lane lane_1   # filter one mapped lane id
# optional: --fill <id>  (defaults to SH_FILL_ID)
```

`cells` returns fill-report counts plus each row’s `audit.starboard` (contract buy/miss) and `audit.overlay`. Same provenance as a pricing audit. **Reviews tab ≠ workbook** — the sheet stays empty until `export`.

## 1b. Mapping (Postgres) — include fee + answer bindings

Confirmed lanes live in Postgres. Workspace `mapping.json` is import/export only.
Humans Confirm mapping on the **Reviews** tab (`/rfp/{fillId}?tab=reviews`). Prefer **Jev geo propose** for free-text
O-D labels — high-confidence (≥0.9) lanes upsert automatically; weaker rows open
`stepKey: map` reviews (rates resolve blocks while pending).

**Before `rates resolve`:** bind every supported header (`cellRef` + `feeBindings` + `answerBindings`). See the **`rfp-fill`** skill inventory. One resolve per fill pass.

**M3 (required for bid-complete rows):** each lane should set:

| Field            | Purpose                      | Nordstrom example |
| ---------------- | ---------------------------- | ----------------- |
| `cellRef`        | Base / ocean money column    | `K{row}`          |
| `feeBindings`    | Accessorial money columns    | `LSS` → `M{row}`  |
| `answerBindings` | Non-money (+ derived all_in) | see below         |

**Answer ids contract resolve can fill** (skip honestly if missing — never invent):

- `carrier_name`, `carrier_scac` (Starboard `/carriers` vocab; no match → skip)
- `transit_days` (hit `transit_time`)
- `free_time.origin_days`, `free_time.dest_days` (rate_items `free_usage`)
- `service_name`, `currency`, `validity_from`, `validity_to`
- `all_in` (derived buy / base+fees)

**Out of scope (leave unbound):** sailing schedule cutoff/ETD/ETA/vessel (Foundry spot follow-on).

```bash
# Preferred: extract O-D/equipment labels from the sheet, then:
sh-client mapping propose --body '{
  "customerLabel": "Nordstrom",
  "lanes":[
    {"laneId":"SHAPNW_CY_40HC","originLabel":"Shanghai","destLabel":"TCM/SEA - CY","equipmentType":"40HC","sheetName":"Lanes","rowIndex":43}
  ]
}'
sh-client mapping get
sh-client reviews list --status pending   # low-confidence map waits

# After locodes known — put FULL bindings (propose alone does not set cellRef/fees/answers):
sh-client mapping put --body '{
  "version": 1,
  "lanes": [{
    "laneId": "lane_cnsha_uslax_40hc",
    "originLocode": "CNSHA",
    "destLocode": "USLAX",
    "equipmentType": "40HC",
    "sheetName": "Lanes",
    "rowIndex": 43,
    "cellRef": "K43",
    "feeBindings": [{ "heading": "LSS", "cellRef": "M43" }],
    "answerBindings": [
      { "answerId": "carrier_name", "cellRef": "A43" },
      { "answerId": "carrier_scac", "cellRef": "B43" },
      { "answerId": "all_in", "cellRef": "L43" },
      { "answerId": "transit_days", "cellRef": "P43" },
      { "answerId": "service_name", "cellRef": "T43" },
      { "answerId": "free_time.origin_days", "cellRef": "U43" }
    ]
  }]
}'
```

Do **not** tell the user that carrier / transit / free days / SCAC / service are “not in Starboard” — they are contract fields written via `answerBindings` when the hit carries them. In chat, say things like “I’ll fill carrier, transit, and free time where Starboard has them” — don’t mention binding names.

Do **not** hand-edit `mapping.json` or invent LOCODEs when `mapping propose` is available. Optional `customerLabel` enrichment fails open if Jev is down. Analyst may still override locodes with `mapping put` (e.g. force `CNSHA` over Jev `CNSHG`).

## 1b-2. Next round (mapping reuse)

A new workbook revision is a new fill (`parentRfpId`, `roundNumber`). Lanes with the same column and a row within ±2 are copied (same `laneId`). Larger header or coordinate moves open `source: mapping-reuse` map reviews and do not finish the map step. Fee-slot differences are noted and do not block the copy.

```bash
sh-client revisions create --body '{ "fileName":"round2.xlsx", "contentType":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "base64":"..." }'
sh-client mapping reuse preview --parent <parentFillId>
sh-client mapping reuse apply --parent <parentFillId>
```

## 1c. Resolve rates (Progress `rates`)

Requires confirmed lanes in Postgres (put/import / Map Confirm first). Blocks if pending
`stepKey: map` reviews remain. Calls Starboard contract `rates.resolve` server-side,
persists fill-report cells for **base + feeBindings + answerBindings**, advances Progress.

```bash
sh-client rates resolve
sh-client progress
sh-client cells
```

Do **not** invent rate amounts, free days, or SCACs. Exploratory Starboard CLI lookups use the `sb-client` skill; **this command is the fill happy path** — do not hand-write money into Excel with `agent-xlsx` as a substitute.

### After resolve — reviews & completing `rates`

Resolve may open soft-warn reviews (do **not** treat as hard failure):

| `source`         | Meaning                                                         |
| ---------------- | --------------------------------------------------------------- |
| `unexpected-fee` | Starboard globals/charges not bound to any `feeBindings` column |
| `rate-pick`      | Low pick confidence (&lt;0.75)                                  |
| `margin-floor`   | Overlay sell below floor (usually after overlay)                |

**Critical workflow:**

1. `rates resolve` **once**.
2. If pending reviews: list them + Reviews deep-links → **STOP**. Human Confirms on the Reviews tab.
3. **Do not** re-run `rates resolve` after Confirm — it recreates the same unexpected-fee wait and leaves cells already persisted.
4. After Confirm, `progress` may show `rates` still `running` with detail `Review cleared — continue step`. There is **no** sandbox `sh-client progress complete`. Completing the step needs host **`fill-pipeline`** `agentCompleteStep(rfpId, "rates", detail)` (or a host operator). Tell the user clearly if you cannot call host complete from the sandbox.
5. Only after `rates` is `done`: overlay (if needed) → export.

## 1d. Export

```bash
sh-client export
```

Writes **filled** fill-report cells that have `sheetName` + `cellRef` into the original BCO template → Blob + a new workspace folder `filled/<UTC-timestamp>/` (prior export folders are kept across chat/sheet resets). Opens **Final export sign-off** (`source: export-signoff`). Human Confirms on the **Reviews** tab before download unlocks. Do not invent cells at export time.

## 2. Submit for review (open a HITL wait)

Agent **creates** pending review items — this is allowed and expected.

```bash
sh-client reviews create --body '{"title":"Map column X","stepKey":"map","proposal":{"col":"A"},"confidence":0.4,"source":"mapper"}'
sh-client reviews update --id rev_… --body '{"proposal":{"col":"B"}}'
sh-client reviews list --status pending
sh-client reviews get --id rev_…
```

After `reviews create`, post a short friendly notify (no CLI/JSON) with
`[Open Reviews](/rfp/{rfpId}?tab=reviews&review={id})`.
For sheet preview / download guidance use `[Open Files](/rfp/{rfpId}?tab=files)`.

## 3. Read user decisions

- **Confirm** → already **`resolved`**
- **Edit** → `edited`; **Reject** → `rejected`

```bash
sh-client reviews list
sh-client reviews list --status edited
sh-client reviews get --id rev_…
```

## 4. Mark resolved after ack (Edit / Reject only)

```bash
sh-client reviews resolve --id rev_… --body '{"resolution":{"applied":true}}'
```

- Confirm is already `resolved` — do **not** call resolve on it.
- `reviews resolve` on `pending` **must fail** — that is correct.

## Lifecycle (do not invent)

1. Agent **`reviews create`** (or server unexpected-fee / rate-pick / floor) → `pending` + Progress hold.
2. Human Confirm / Edit / Reject on the Reviews tab (Approve all / Cancel all supported).
3. Edit/Reject: agent `reviews resolve` after reading decision.
4. Confirm of unexpected-fee: **do not** re-resolve rates; host may need `agentCompleteStep` for `rates`.

## vs `fill-pipeline` / `sb-client`

| Concern                                            | Tool                                    |
| -------------------------------------------------- | --------------------------------------- |
| Progress complete / start / fail / status writes   | Host `fill-pipeline` / `agent-pipeline` |
| Mapping, rates resolve, export, reviews, cells     | **`sh-client`**                         |
| Exploratory Starboard search (not fill write-back) | `sb-client`                             |

## Rules

- Prefer `--fill` omitted (uses `SH_FILL_ID`) unless the user names another fill
- Never print `SH_API_KEY`
- If `auth test` fails, stop and report the JSON error
- Full-sheet fills: bind **every** data row’s K/L/M/A/B/P/T/U-style cells via `mapping put` after propose — propose alone is not enough for M3 columns
