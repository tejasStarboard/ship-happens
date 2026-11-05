---
description: >-
  Max-coverage RFP sheet fill without inventing data. Load when the user asks to
  fill, price, or map a bid workbook. Orchestrates agent-xlsx probe, sh-client
  mapping + rates resolve, and sb-client exploration. Never invent money, free
  days, SCACs, or schedule.
---

# RFP fill (max coverage, honest skips)

Product UI is **Chat | Files | Reviews** on `/rfp/{fillId}`. One chat per fill.
HITL waits appear on the **Reviews** tab (`/rfp/{fillId}?tab=reviews&review={id}`).

## Talking to the user

Audience: experienced freight forwarder, not a developer.

- Brief, friendly, freight-native language.
- Outcomes + next step only. No CLI, JSON, paths, cell refs, or skill names in chat.
- Guide with links: `[Open Reviews](/rfp/{fillId}?tab=reviews)`, `[Open Files](/rfp/{fillId}?tab=files)`, or a specific review link.
- Example: “Mapped the lanes. A few ports need your Confirm — [Open Reviews](/rfp/…). After that I’ll pull rates.”

## When to load

User says fill / price / map this sheet / run the RFP. Not for greetings.

Also load as needed: **`agent-xlsx`**, **`sh-client`**, **`sb-client`**, **`fill-pipeline`**.

## Happy path (once asked) — internal

```
1. `agent-xlsx probe <file> --brief` (preinstalled on PATH — do not `uvx`) → inventory sheets / header row / O-D / equipment columns
2. Count money/data rows (expected coverage). Note formula vs input columns.
3. Header → bindings inventory (see below) — bind EVERY supported input column
4. sb-client locations resolve-lane-for-fill (aliases) when sheet codes ≠ UNLOCODE
5. sh-client mapping propose for ALL data rows (unless user said only/just/limit to) → Reviews Confirm → mapping put with full bindings
6. sh-client rates resolve ONCE
7. Stop on Reviews (unexpected fee / rate pick / floor / export) — do not re-resolve
8. Coverage gate: if mapped/filled ≪ expected data rows, keep going or tell the user — do not call it done
9. sh-client export → export sign-off on Reviews → user downloads from header/Files
10. Summarize filled vs skipped vs expected in plain language — never paste the whole sheet
```

## Scope (max coverage by default)

- Default: fill **every** money/data row on bid sheets the user cares about (or the whole workbook’s bid tabs).
- Mentions of destinations, PODs, or example lanes in the user message usually **describe** the sheet — they are **not** an exclusive scope unless the user says **only / just / limit to / skip the rest**.
- Skip tabs only when asked (e.g. Drayage, Instructions, T&C) or when they have no rate columns.
- Duplicate O–D rows (blank POD, second equipment line, repeated POL): **map them too**. Reuse the same locode resolve; do not drop them.
- Inland dest + coast POD (e.g. Cleveland + USWC): resolve via coast POD. Labels like `Houston (port)` → port locode.

## Coverage gate

After probe, record expected data-row count (or unique O–D × equipment). Before export (and in the user summary):

- Compare mapped lanes / filled outcomes to that count.
- If coverage is clearly partial (e.g. 4 of ~20), **do not** export as complete — map the remaining rows first, or say what is still unmapped and ask whether to continue.
- Honest misses (no Starboard hit) count as attempted coverage; unmapped rows do not.

## Binding inventory (do this before resolve)

From headers, map what the BCO asks for:

| BCO concept                 | Binding                               | Notes                                           |
| --------------------------- | ------------------------------------- | ----------------------------------------------- |
| Ocean / base rate           | `cellRef`                             | Required for money rows                         |
| LSS / BAF / bunker          | `feeBindings` heading                 | Only when column exists                         |
| Origin/dest arbitrary       | `feeBindings`                         | When present                                    |
| Carrier name                | `answerBindings` `carrier_name`       |                                                 |
| SCAC                        | `carrier_scac`                        | Vocab only — never invent                       |
| Transit days                | `transit_days`                        |                                                 |
| Free time origin/dest       | `free_time.origin_days` / `dest_days` |                                                 |
| Service / string            | `service_name`                        |                                                 |
| Currency / validity         | `currency`, `validity_*`              | See validity rule below                         |
| All-in                      | `all_in`                              | **Only if the cell is an input**, not a formula |
| Cutoff / ETD / ETA / vessel | **leave unbound**                     | Schedule unsupported on contract resolve        |

### Formula columns — do not overwrite

If Total / All-in / Ocean Total is already `=Base+Bunker` (or similar), **leave it unbound**. Write base + fee inputs only; let the sheet calculate. Binding `all_in` over a formula replaces it with a static number — wrong.

### Validity / Effective–Expires

Bind `validity_*` only when the column is empty or clearly means **rate validity**. If Effective/Expires (or similar) is already filled as the **bid/contract window**, leave those cells alone — do not overwrite with Starboard rate dates.

If a header has no supported binding: leave blank and note in the summary. Do **not** invent values.

Exploration helpers (not write-back):

```bash
sb-client locations canonicalize --query "SHA"
sb-client locations resolve-lane-for-fill --origin "SHA" --destination "TCM/SEA - CY"
sb-client rates resolve-many --file jobs.jsonl --cache-dir .sb-client-rate-cache
sb-client rates fill-view --equipment 40HC --body '{"rates":[...]}'
sb-client carriers lookup-scac --name "CMA CGM"
```

**Write money/answers only via `sh-client rates resolve`.** Never `agent-xlsx write` or hand-edit cells for rates.

## Custom Python scripts (large / multi-tab sheets)

Prefer the happy path above. If you **must** write a sandbox Python script (openpyxl + Starboard lookups) — e.g. exploratory bulk fill, offline QA, or a sheet too large for a naive loop — **optimize queries**. Big Lots–scale tabs (1000+ rows, repeated O–Ds) were slow when each row spawned a cold resolve.

### Query / I/O rules

1. **Deduplicate before resolve** — group rows by normalized `(origin_locodes, dest_locodes, container_types)`. One Starboard call per unique key; fan results out to every matching row. Never N sequential resolves for N identical Shanghai→LAX 40HC lines.
2. **Skip unmappable rows early** — no POL/POD (or coast fallback) → mark miss, **do not** call Starboard.
3. **Batch equipment on one OD** — pass all needed `container_types` in a single resolve when the API allows, instead of one call per equipment size.
4. **Cap `limit`** — ~15–20 hits per OD is enough to pick; higher limits waste latency and payload.
5. **Disk cache** — key = hash(origins, dests, containers, limit). Write JSON under a workspace cache dir (e.g. `.rate-cache/`). Re-runs and shared lanes must hit cache before network.
6. **Parallelize unique jobs** — `ThreadPoolExecutor` (≈8–12 workers) or `sb-client rates resolve-many --file jobs.jsonl --cache-dir …`. Bound concurrency; do not open unlimited processes.
7. **Avoid per-lane CLI cold start** — do **not** `subprocess` a fresh `sb-client`/`node` for every OD. Prefer `resolve-many`, a long-lived worker pool, or one Node process that handles many requests. Cold start dominated Big Lots wall time.
8. **Resolve all → write once** — finish the rate map, then write cells and `workbook.save` once (or per sheet). Saving openpyxl after every row is very expensive.
9. **Normalize locodes once** — cache `canonicalize` / `resolve-lane-for-fill` results for repeated city/port labels.
10. **Progress logs** — print `fetched i/n` every ~20–50 unique ODs so long jobs look alive; summarize filled/missed at the end.

### Still never invent

Same honesty rules: money, free days, SCACs, schedule only from Starboard hits. Misses stay blank with a reason in the report JSON.

### Prefer product write-back when possible

Custom scripts are for exploration / offline QA. For in-product fills, still push results through **`sh-client rates resolve` + export** when mapping exists — do not treat a Python fill as a substitute for Reviews sign-off.

## Rules

- Never invent money, free days, SCACs, or schedule
- Max coverage by default; destination names in chat are descriptive unless scoped with only/just/limit to
- Do not overwrite sheet formulas (Total/All-in) or pre-filled bid-window dates
- One `rates resolve` per fill pass; after Confirm on Reviews, do not re-run resolve
- Chat does not approve — human uses Reviews (Approve all / per-item)
- After `reviews create`, one short notify + `[Open Reviews](/rfp/{rfpId}?tab=reviews&review={id})` — no technical dump
- Prefer skip-with-reason over guessing when Starboard misses; explain skips in freight terms (“no contract rate for that lane”)
- Before export: coverage gate vs probe row count; say filled / missed / still-unmapped
- Large custom Python fills: dedupe + cache + parallel `resolve-many` / worker pool; never N cold CLI calls

## Out of scope

- Foundry spot schedule write-back
- Creating Starboard quotes
- Multi-chat tabs (one chat per fill)
