---
description: >-
  Cut token cost and keep context lean for RFP / spreadsheet work. Load when
  handling large xlsx/CSV, long tool output, multi-file exploration, or when
  replies or tool dumps risk bloating the session. Prefer progressive disclosure,
  CLI summaries, and capped reads over dumping whole files into chat.
---

# Token efficiency

Context is a working desk, not a filing cabinet. Skills already use progressive disclosure (metadata always → `SKILL.md` on load → references/scripts only when read). Apply the same discipline to **files, sheets, and tool output**.

## Rules (always)

1. **Never paste a whole workbook into the model.** Probe structure → search/filter → read small ranges.
2. **Prefer CLI / scripts over `read_file` for `.xlsx`.** Binary sheets are useless as raw bytes; use `agent-xlsx` (see that skill) or a short Python/Node script and keep only the summary in context.
3. **Cap every dump.** Default: ≤50–100 rows, ≤20 columns, or a named range. Paginate with offset/limit.
4. **Aggregate, don’t enumerate.** Prefer counts, unique values, null rates, min/max, and matched cell addresses over full grids.
5. **One skill at a time.** `load_skill` only when needed; don’t preload every skill for a greeting or a one-line answer.
6. **Compress before dropping.** When a path failed, keep the conclusion (“wrong sheet name; use Rates”), not the full error scroll.
7. **Trim after ~75% of useful context.** Drop failed attempts, replaced drafts, and verbose listings first. Protect: task brief, current error, active file/range, hard constraints (no invented rates).

## Spreadsheet workflow (token-cheap)

```
probe --brief  →  search (limit)  →  read range/limit  →  write only changed cells
```

- Start: `uvx agent-xlsx probe file.xlsx --brief` (or `--types`). No `--full` unless needed.
- Find cells: `search … --limit 25` with `--columns` / `--range` when known.
- Read: explicit ranges (`A1:G50`) or `--limit` / `--offset`. Multi-range in one call beats many calls.
- Export huge sheets to CSV **on disk**, then sample with `head` / `wc` / a filter script — don’t stream megabytes into chat.
- After filling: summarize filled/skipped/review cells; don’t reprint the whole sheet.

## Tool / bash hygiene

- Prefer `jq` / small scripts so stdout is a short JSON summary.
- Redirect large artifacts to `/workspace/…` and report the path + shape (rows, cols, keys).
- Avoid recursive `find` / `cat` of entire trees; list narrowly, then open one file.

## Response hygiene

- Default to short, actionable answers for RFP work.
- Don’t restate the full skill body or dump CLI help unless debugging.
- When the user didn’t ask for depth, skip tutorials and alternatives.

## Anti-patterns

| Waste                                      | Prefer                                        |
| ------------------------------------------ | --------------------------------------------- |
| Full sheet → chat                          | `probe` + targeted `read`                     |
| Loading 5 skills up front                  | Load one when the task needs it               |
| Pasting 500-line test logs                 | One failing assertion / last error            |
| Re-reading the same big file every turn    | Cache path + schema in a one-line note        |
| Generating openpyxl from scratch each time | `agent-xlsx` write / existing filled template |

## Fallback without `agent-xlsx`

If `uvx agent-xlsx` is unavailable, use a **short** sandbox script (pandas/openpyxl or Node) that prints:

- sheet names + dimensions
- header row
- `head(n)` sample

Never print `df.to_string()` for the full frame into the model.
