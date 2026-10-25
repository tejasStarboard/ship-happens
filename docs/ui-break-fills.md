# Break-ui — Fills list

Toggle: **Demo data / Worst case** (development only) on `/rfp`.

## Findings & fixes applied

| Break | Cause | Fix |
| --- | --- | --- |
| Long fill / customer / template names blow row height | Unbounded text in cells | `truncate` + `max-w-*` + `title` tooltip |
| Empty customer / template looked blank | Falsy strings | Render `—` |
| Worst-case rows navigated to fake ids | Fixture ids | Disable click when worst-case active |
| Status colours competed with chrome | Badge fills | Status pills (tint + ink) instead of filled badges |

## Still open (acceptable)

- Owner is not shown in the list columns (fixture has long owner emails) — add a column only if product needs it.
- Unpaginated huge lists (1k+) not simulated — Rates already paginate; Fills should paginate when volume warrants.
