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
sb-client locations resolve-lane --origin "CNSHA" --destination "Chicago via LA"
sb-client rates search-contract --body '...'
sb-client rates search-spot --body '{"carrier":"cma",...}'
sb-client rates resolve --body '...'
sb-client rates recommend --body '{"rates":[...],"preferred_carriers":[]}'
sb-client globals list --service ocean_fcl --defaults-only
sb-client globals classify --name "AMS"
sb-client globals rollup --body '{"charges":[...]}'
sb-client margins apply --body '{"buy":1000,"pct":5}'
sb-client margins check-floor --body '{"buy":1000,"sell":1100,"min_amount":150}'
```

## Preferred bid-line flow

1. `sb-client locations resolve-lane --origin "…" --destination "…"`
2. `sb-client rates resolve --body '{ "service_type":"ocean_fcl", "origin_locodes":[…], "destination_locodes":[…], "cargo":{ "cargo_type":"container", "container_types":["40HC"] }, "effective_from":"…", "expires_on":"…" }'`
3. `sb-client rates recommend --body '{"rates":[...]}'` (or pick preferred carrier)
4. `sb-client margins apply` / `margins check-floor` for sell + guardrails
5. `sb-client globals classify` / `rollup` for sheet headings
6. Write filled values into `/workspace` Excel/CSV — **never invent money cells**

## Rules

- Company tenancy comes from auth — never pass another company’s id as override
- Prefer `rates resolve` over raw search when filling sheets (includes matching global defaults)
- If `auth test` fails, stop and report the JSON error; do not guess rates

## Out of scope

- Creating/saving Starboard quotes
- Projected rate overlays owned by Ship Happens only
- FCLv6 vendor ingest
