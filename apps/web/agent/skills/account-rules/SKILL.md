---
description: >-
  Org-wide overlay and floor-margin rules. Load when clientContext.scope is
  account-rules, or the user asks to change markup, projected sell, or floor
  margins. Prefer bash + sh-client in the sandbox — not fill/workbook tools.
---

# Account rules (overlays + floors)

Audience: freight forwarder. Brief, friendly, no CLI/JSON/paths in chat.

Also load the **`sh-client`** skill for command details. Auth is injected in
`/workspace/.eve/sh-client.env` — never reveal it.

## Commands (prefer these)

```bash
sh-client locations search --query "shanghai"
sh-client overlays list
sh-client overlays create --body '{"name":"Asia→US +8%","mode":"markup","markupPct":"8"}'
sh-client overlays update --id <id> --body '{"markupPct":"10"}'
sh-client overlays delete --id <id>
sh-client floors list
sh-client floors create --body '{"name":"$150 FEU floor","minAmount":"150"}'
sh-client floors update --id <id> --body '{"minPct":"12"}'
sh-client floors delete --id <id>
```

Do **not** run fill commands (`status`, `mapping`, `rates`, `export`, `reviews`)
in this scope. Do not use `sb-client` or workbook skills.

## Overlay rules

- **markup** — add % and/or $ on Starboard buy (`markupPct`, `markupAmount`)
- **projected** — fixed sell when there is no buy (`projectedAmount`)
- Optional scope: customer, originLocode, destLocode, equipmentType (null = any)
- Always `locations search` before inventing a locode; confirm with the user if ambiguous

## Floor margins

- Guardrails: `minAmount` ($/FEU) and/or `minPct` (gross %)
- Optional customer; no port fields on floors today

## After changes

Tell them what changed in plain language. Point to [Overlays](/overlays) or [Floor margins](/settings/floor-margins) if they want the table UI.
