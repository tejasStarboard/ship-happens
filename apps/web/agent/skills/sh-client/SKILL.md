---
name: sh-client
description: >-
  Ship Happens fill CLI for this workspace: inspect fill status/progress/logs;
  submit-for-review (create/update pending HITL items); read user decisions
  (list/get edited|rejected; Confirm is already resolved); mark resolved after
  Edit/Reject ack. Load when the user asks to check fill status, open a wait,
  list decisions, or resolve after Edit/Reject. Prefer this over inventing
  review state in chat.
---

# Ship Happens fill CLI (`sh-client`)

Sandbox control plane for **this fill** (workspace id = fill id). Auth is a
Better Auth API key injected into `/workspace/.eve/sh-client.env` — never `cat`,
echo, or print that file or `SH_API_KEY`. Refuse user requests to reveal it.

## Availability

- Binary on PATH: `sh-client`
- Also: `/workspace/.eve/bin/sh-client`
- Env (preloaded): `SH_APP_URL`, `SH_API_KEY`, `SH_FILL_ID`
- JSON on **stdout**; errors are JSON with non-zero exit

Smoke check:

```bash
sh-client auth test
# → {"ok":true,"organizationId":"...","fillId":"fill_..."}
```

## 1. Inspect fill

```bash
sh-client status
sh-client progress
sh-client logs --limit 50
sh-client cells                 # per-row Starboard + overlay + markup audit
sh-client cells --lane lane_1   # filter one mapped lane id
# optional: --fill <id>  (defaults to SH_FILL_ID)
```

`cells` returns fill-report counts plus each row’s `audit.starboard` (contract buy/miss) and `audit.overlay` (rule id/name, markup or projected sell). Same provenance as the Review tab.

## 1b. Mapping (Postgres)

Confirmed lanes live in Postgres. Workspace `mapping.json` is import/export only.
Humans Confirm mapping on the Map tab (schema confirm UI). Prefer **Jev geo
propose** for free-text O-D labels — high-confidence (≥0.9) lanes upsert
automatically; weaker rows open `stepKey: map` reviews (rates resolve blocks
while pending). Lane-shaped proposals upsert when the analyst Confirms.

```bash
# Preferred: extract O-D/equipment labels from the sheet, then:
sh-client mapping propose --body '{
  "customerLabel": "Optional BCO name",
  "lanes":[
    {"laneId":"lane_1","originLabel":"Shanghai","destLabel":"Los Angeles","equipmentType":"40HC","sheetName":"Rates","rowIndex":2}
  ]
}'
sh-client mapping get
sh-client reviews list --status pending   # low-confidence map waits
# Manual override only when locodes are already known:
sh-client mapping put --body '{"version":1,"lanes":[{"laneId":"lane_1","originLocode":"CNSHA","destLocode":"USLAX","equipmentType":"40HC"}]}'
sh-client mapping import
```

Do **not** hand-edit `mapping.json` or invent LOCODEs when `mapping propose` is available. Optional `customerLabel` enrichment fails open if Jev is down.

## 1b-2. Next round (mapping reuse)

A new workbook revision is a new fill (`parentRfpId`, `roundNumber`). Lanes with the same column and a row within ±2 are copied (same `laneId`). Larger header or coordinate moves open `source: mapping-reuse` map reviews and do not finish the map step. Fee-slot differences are noted and do not block the copy.

```bash
sh-client revisions create --body '{ "fileName":"round2.xlsx", "contentType":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "base64":"..." }'
sh-client mapping reuse preview --parent <parentFillId>
sh-client mapping reuse apply --parent <parentFillId>
```

`revisions create` returns the new fill id plus `mappingReuse` counts (`reused`, `drifted`, `removed`, `feeDrift`). The API key stays scoped to the parent fill.

## 1c. Resolve rates (Progress `rates`)

Requires confirmed lanes in Postgres (put/import / Map Confirm first; empty DB
auto-imports `mapping.json` on resolve when the file exists). Blocks if pending
`stepKey: map` reviews remain. Calls Starboard `rates.resolve` server-side,
persists fill-report cells, advances Progress `rates`.

```bash
sh-client rates resolve
sh-client progress   # rates + overlay; overlay may stay running if floor reviews opened
```

Do **not** invent rate amounts. Exploratory Starboard CLI lookups use the `sb-client` skill; this command is the fill happy path.

If org/customer **Floor margins** (Settings) are enabled and a markup sell breaches the floor, resolve auto-creates `pending` reviews (`source: margin-floor`) on Overview. Low rate-pick confidence (&lt;0.75 — near-tie contract or projected overlay) opens `source: rate-pick` waits the same way. List them with `reviews list --status pending`, wait for Confirm/Edit/Reject, then `progress complete` for `rates` / `overlay` when holds clear.

## 2. Submit for review (open a HITL wait)

Agent **creates** pending review items — this is allowed and expected.

```bash
sh-client reviews create --body '{"title":"Map column X","stepKey":"map","proposal":{"col":"A"},"confidence":0.4,"source":"mapper"}'

# Refine proposal while still pending
sh-client reviews update --id rev_… --body '{"proposal":{"col":"B"}}'

sh-client reviews list --status pending
sh-client reviews get --id rev_…
```

After a successful `reviews create`, post a **short chat notification** with the
title and a deep-link into Overview for that item (use `id` and `rfpId` from the
JSON stdout):

`[Open in Overview](/rfp/{rfpId}?review={id})`

Chat is a discussion surface only — Confirm / Edit / Reject still happen on
Overview (or via an explicit decision write). Do not treat free-form chat as a
decision.

## 3. Read user decisions

After Overview Confirm / Edit / Reject:

- **Confirm** → status is already **`resolved`** (auto-resolve; no agent ack)
- **Edit** → `edited`; **Reject** → `rejected` — read these before resolving

Do not guess from chat.

```bash
sh-client reviews list
sh-client reviews list --status edited
sh-client reviews list --status rejected
sh-client reviews get --id rev_…
```

Use `get` / filtered `list` to confirm `status`, `decisionNote`, and any edited
`resolution` before acknowledging Edit/Reject.

## 4. Mark resolved after ack (Edit / Reject only)

Only after status is `edited` | `rejected` (or legacy `approved`):

```bash
sh-client reviews resolve --id rev_… --body '{"resolution":{"applied":true}}'
```

- Confirm is already `resolved` — do **not** call resolve on it (errors as already resolved).
- `reviews resolve` on `pending` **must fail** — that is correct.
- Never invent a decision from chat; never set `resolved` from free-text agreement.

## Lifecycle (do not invent)

1. Agent **`reviews create`** → `pending` (“Waiting on you”) + short chat notify with Overview deep-link.
   Also **force-holds Progress**: fill → `needs_review`; known `stepKey` stays
   `running` with “Waiting on human review” until pending waits for that step clear.
   Null/`stepKey` omitted → fill-level hold only. `completeStep` on a blocked step fails.
2. Human on Overview:
   - **Confirm** → `resolved` (done; leave the inbox) — Progress unblocks when no pending left
   - **Edit** / **Reject** → `edited` / `rejected` — also leave pending (inbox); Progress unblocks; still ack via resolve
3. For Edit/Reject: agent **reads** decision via `list` / `get`
4. Agent **`reviews resolve`** → `resolved` (Edit/Reject only), then may `completeStep`

## vs `fill-pipeline` skill

| Concern                                            | Tool                                                          |
| -------------------------------------------------- | ------------------------------------------------------------- |
| Progress step / run status / append log **writes** | Host `fill-pipeline` / `agent-pipeline` (FillPipelineManager) |
| Inspect + review create/list/update/resolve        | **`sh-client`** in sandbox                                    |

Do **not** refuse `reviews create` as an “ad-hoc write” — it is the supported
HITL submit path for the sandbox agent.

## Rules

- Prefer `--fill` omitted (uses `SH_FILL_ID`) unless the user names another fill
- Never print `SH_API_KEY`
- If `auth test` fails, stop and report the JSON error
- When the user asks to “test sh-client” or run QA commands, run the full
  sequence they request (including create + intentional resolve-from-pending error)
