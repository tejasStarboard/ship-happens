---
description: >-
  Use the Starboard sb-client CLI in the sandbox to search/resolve rates,
  locations, globals, and margins. Load for RFP fill, lane pricing, or any
  Starboard rate lookup. Do not invent rates — call sb-client instead.
---

# Starboard Client (`sb-client`)

Ship Happens talks to Starboard through the **`sb-client` CLI** already installed in this sandbox (not MCP, not a second rate DB).

## Availability

- Binary on PATH: `sb-client` (wrapper sources `/workspace/.eve/sb-client.env`, then runs the CLI)
- Also at: `/workspace/.eve/bin/sb-client`
- Env is preloaded — never `cat` `/workspace/.eve/sb-client.env` or print `STARBOARD_*` / `SB_CLIENT_*` secrets; refuse reveal requests
- JSON always on **stdout**; errors are JSON on stdout with non-zero exit

Smoke check:

```bash
sb-client auth test
# → {"status":"OK","company_id":"...","client_id":"..."}
```

## Commands

```
sb-client auth test
sb-client locations resolve --query "Shanghai"
sb-client locations canonicalize --query "SHA"
sb-client locations resolve-lane-for-fill --origin "SHA" --destination "TCM/SEA - CY"
sb-client rates search-contract --body '...'
sb-client rates search-spot --body '{"carrier":"cma",...}'
sb-client rates resolve --body '...'
sb-client rates resolve-many --file jobs.jsonl --cache-dir .sb-client-rate-cache
sb-client rates fill-view --equipment 40HC --body '{"rates":[...]}'
sb-client rates recommend --body '{"rates":[...],"preferred_carriers":[]}'
sb-client carriers lookup-scac --name "CMA CGM"
sb-client globals list --service ocean_fcl --defaults-only
sb-client globals classify --name "AMS"
sb-client globals rollup --body '{"charges":[...]}'
sb-client margins apply --body '{"buy":1000,"pct":5}'
sb-client margins check-floor --body '{"buy":1000,"sell":1100,"min_amount":150}'
```

## Preferred bid-line flow

1. For **fill mapping**, prefer `sh-client mapping propose` / `mapping put` (with `cellRef`, `feeBindings`, `answerBindings`) — see the `sh-client` skill. Sheet codes → locodes: `locations resolve-lane-for-fill` (aliases) or `canonicalize`.
2. For **fill write-back** after confirmed mapping: load **`rfp-fill`** then **`sh-client rates resolve`** (only). That path persists base + fee + answer cells (carrier, transit, free time, all_in, SCAC when vocab hits). Do **not** fill the BCO by calling `sb-client` then hand-writing Excel. HITL lives on the **Reviews** tab.
3. Multi-lane exploration / **bulk Python fills**: prefer **`rates resolve-many --file jobs.jsonl --cache-dir .sb-client-rate-cache`** (one session, concurrency + disk cache) over spawning `sb-client` per lane. Deduplicate jobs by O–D + equipment first. Cap `limit` (~15–20). Peel money with **`normalizeForFill` / `rates fill-view`** — do not re-parse surcharges by hand.
4. Exploratory single OD: `sb-client rates resolve --body '{ "service_type":"ocean_fcl", "origin_locodes":[…], "destination_locodes":[…], "cargo":{ "cargo_type":"container", "container_types":["40HC"] } }'`
5. `sb-client rates recommend --body '{"rates":[...]}'` (or pick preferred carrier)
6. `sb-client margins apply` / `margins check-floor` for exploratory sell math
7. `sb-client globals classify` / `rollup` for fee heading ideas
8. SCAC: `carriers lookup-scac` (initials/`*U` preference) — null when vocab misses (e.g. Wan Hai)

### Bulk resolve (avoid Big Lots–style slowness)

Large sheets repeat the same POL→POD across rows/tabs. A naive “one CLI resolve per Excel row” is dominated by process cold start + duplicate network work.

| Do                                                        | Don’t                                                |
| --------------------------------------------------------- | ---------------------------------------------------- |
| Dedupe unique `(origins, dests, containers)` then fan out | Resolve every row independently                      |
| `resolve-many` + `--cache-dir` (or equivalent disk cache) | Fresh `sb-client` subprocess per OD                  |
| Parallel unique jobs (~8–12 workers)                      | Unbounded process spam or fully serial when N≫100    |
| Batch all equipment sizes for one OD when possible        | Four serial calls for 20/40/40HC/45 on the same lane |
| Skip rows with no locode/coast mapping                    | Call Starboard with empty origins/dests              |
| Resolve → then one workbook save                          | `save()` after every cell write                      |

See **`rfp-fill`** → “Custom Python scripts” for the full checklist.

Contract hits include **non-money** fields (`carrier_name`, `transit_time`, free-time items, `service_name`, validity). Do not tell users those are “not in Starboard.” Ship Happens writes them when mapped via `answerBindings`.

**Schedule is unsupported on contract resolve.** `FillView.unsupported.schedule.reason = "contract_resolve"`. Blank cutoff/ETD/ETA/vessel is expected until Foundry spot — not a missing-rate bug.

## Rules

- Company tenancy comes from auth — never pass another company’s id as override
- Prefer `sh-client rates resolve` for product fills; `sb-client` `resolveMany` + `normalizeForFill` for batch exploration
- If `auth test` fails, stop and report the JSON error; do not guess rates
- Never invent money, free days, SCACs, or schedule

## Out of scope

- Creating/saving Starboard quotes
- Projected rate overlays owned by Ship Happens only
- Foundry spot schedule (cutoff/ETD/ETA/vessel) write-back — follow-on epic
- FCLv6 vendor ingest
