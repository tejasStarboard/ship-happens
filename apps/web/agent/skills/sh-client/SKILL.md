---
name: sh-client
description: >-
  Use the Ship Happens sh-client CLI in the sandbox to inspect a fill
  (status/progress/logs) and manage HITL review items (create/list/update/resolve).
  Load when the user asks to check fill status, submit something for review,
  list waits, or resolve after a human decision. Prefer this over inventing
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

## Inspect (read)

```bash
sh-client status
sh-client progress
sh-client logs --limit 50
# optional: --fill <id>  (defaults to SH_FILL_ID)
```

## Reviews (agent writes create/list/update; resolve only after human decision)

```bash
# Open a HITL wait (agent proposal) — this IS allowed and expected
sh-client reviews create --body '{"title":"Map column X","stepKey":"map","proposal":{"col":"A"},"confidence":0.4,"source":"mapper"}'

sh-client reviews list
sh-client reviews list --status pending
sh-client reviews get --id rev_…

# Update proposal while still pending
sh-client reviews update --id rev_… --body '{"proposal":{"col":"B"}}'

# ONLY after Overview Confirm/Edit/Reject → status approved|edited|rejected
sh-client reviews resolve --id rev_… --body '{"resolution":{"applied":true}}'
```

## Lifecycle (do not invent)

1. Agent **`reviews create`** → `pending` (“Waiting on you”)
2. Human on Overview → `approved` / `edited` / `rejected`
3. Agent **`reviews resolve`** → `resolved`

`reviews resolve` on `pending` **must fail** — that is correct. Do not invent a
decision from chat; wait for the UI decision path.

## vs `fill-pipeline` skill

| Concern                                            | Tool                                                          |
| -------------------------------------------------- | ------------------------------------------------------------- |
| Progress step / run status / append log **writes** | Host `fill-pipeline` / `agent-pipeline` (FillPipelineManager) |
| Inspect status/progress/logs + review CRUD         | **`sh-client`** in sandbox                                    |

Do **not** refuse `reviews create` as an “ad-hoc write” — it is the supported
HITL submit path for the sandbox agent.

## Rules

- Prefer `--fill` omitted (uses `SH_FILL_ID`) unless the user names another fill
- Never print `SH_API_KEY`
- If `auth test` fails, stop and report the JSON error
- When the user asks to “test sh-client” or run QA commands, run the full
  sequence they request (including create + intentional resolve-from-pending error)
