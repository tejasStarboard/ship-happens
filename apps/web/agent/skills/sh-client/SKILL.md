---
name: sh-client
description: >-
  Ship Happens fill CLI for this workspace: inspect fill status/progress/logs;
  submit-for-review (create/update pending HITL items); read user decisions
  (list/get approved|edited|rejected); mark resolved after ack. Load when the
  user asks to check fill status, open a wait, list decisions, or resolve after
  Confirm/Edit/Reject. Prefer this over inventing review state in chat.
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
# optional: --fill <id>  (defaults to SH_FILL_ID)
```

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

After the human Confirm / Edit / Reject path on Overview, status becomes
`approved`, `edited`, or `rejected`. **Read those before resolving** — do not
guess from chat.

```bash
sh-client reviews list
sh-client reviews list --status approved
sh-client reviews list --status edited
sh-client reviews list --status rejected
sh-client reviews get --id rev_…
```

Use `get` / filtered `list` to confirm `status`, `decisionNote`, and any edited
`proposal` before acknowledging.

## 4. Mark resolved after ack

Only after status is `approved` | `edited` | `rejected`:

```bash
sh-client reviews resolve --id rev_… --body '{"resolution":{"applied":true}}'
```

`reviews resolve` on `pending` **must fail** — that is correct. Do not invent a
decision from chat; wait for the UI decision path (or another explicit decision
write). Never set `resolved` based on free-text agreement in the conversation.

## Lifecycle (do not invent)

1. Agent **`reviews create`** → `pending` (“Waiting on you”) + short chat notify with Overview deep-link
2. Human on Overview → `approved` / `edited` / `rejected`
3. Agent **reads** decision via `list` / `get`
4. Agent **`reviews resolve`** → `resolved`

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
