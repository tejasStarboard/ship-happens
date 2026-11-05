# Demo fill prompts (4 Bid Examples)

Paste-ready chat prompts for in-app fills that target the same coverage as the offline reference workbooks under `tmp/filled/`.

Sources: `tmp/fwdfwbidexamples/Bid Examples/`.  
Agent skills: `rfp-fill` (max coverage, formula/validity rules, coverage gate).

## Before you start

1. App up (`pnpm --filter web dev` or https://ship-happens-dev.vercel.app)
2. Org with Starboard rates (QA company used for offline fills: `1b5a4e8d-…`)
3. Prefer **Templates → Upload → Use in fill**, or Fills → New fill

## Loop (each fill)

1. Open fill → **Chat**
2. Paste the **inspect** prompt for that sheet, then `start on it` (or say fill it)
3. **Confirm** Map / rate-pick / export waits on **Reviews**
4. After export sign-off → download from Files / header
5. Spot-check: money ⊆ Starboard; blanks = miss; formulas still formulas

Demo order: **Rize → iDesign → S2S**; **Big Lots** last (slow, multi-tab).

| # | Fill name | Customer | Upload | Sheet(s) | Offline target |
| --- | --- | --- | --- | --- | --- |
| 1 | Rory Home FCL 2024 | Rory Home | `Rory Home RFP.xlsx` | `Rates` | **20/20** |
| 2 | iDesign Ocean 2024-25 | iDesign | `iDesign Freight Rates 2024-2025 Clean Copy.xlsx` | `Ocean Freight Rates 2024-2025` | ~**30** filled / 3 miss |
| 3 | S2S Global Ocean 2024-25 | S2S | `S2S Global Ocean RFP_2024-25_4-24-2024.xlsx` | `(RFQ)` | ~**84** filled / 19 miss |
| 4 | Big Lots NVO 2024-25 | Big Lots | `2024-25 Big Lots Bid Sheet. NVO.xlsx` | region tabs | ~**991** filled / many miss |

---

## 1 — Rory / Rize Home

**Expect ~20 rate rows** (4 origins × Cleveland / Houston / Tampa / St Louis, including duplicate Cleveland rows without POD).

```
Fill the Rates sheet — every origin×destination row (Cleveland, Houston, Tampa, St Louis), including duplicate Cleveland rows with blank POD.
Equipment: 40HC. Write base (F) and bunker (G) when Starboard has them; leave Ocean Total (H) as the sheet formula (=F+G); fill transit (E) when available.
Do not change Effective/Expires when already filled — that is the bid window, not rate validity.
Skip Drayage and UWL T&C.
Before export, confirm mapped lanes ≈ data rows on Rates (expect ~20). Do not invent rates.
```

Then: `start on it`

---

## 2 — iDesign

**Expect ~33 equipment rows** across origin blocks; offline hit ~30 / miss ~3.

```
Fill Ocean Freight Rates 2024-2025 — every origin block and every equipment row under it (20', 40'GP, 40'HC, 45'), not just the first line of each block.
Destinations include inland (e.g. Cleveland) — resolve via coast/POD when needed.
Write Ocean Transportation (fixed LTA columns), carrier, transit when Starboard has them; BAF/LSF/security only when present.
Fill Total from Starboard all-in when that column is an empty input (not a live formula). Prefer the fixed-rate column set; leave the floating twin blank unless asked.
Skip nothing on this sheet. Before export, mapped equipment rows should be in the ~30s. Do not invent rates.
```

Then: `start on it`

---

## 3 — S2S Global

**Expect ~100+ lane rows** on `(RFQ)`; offline ~84 filled / 19 miss. POL/POD are already UN locodes.

```
Fill sheet (RFQ) — every data lane row (not just the first few).
POL/POD are 5-digit UN locodes — use them directly.
Write: Offered VOCC; ocean rates for 20'/40'/40HC/45' (first equipment money block); bunker in the second 20'/40'/40HC/45' block when Starboard has bunker; port-to-port transit days when available.
Leave blank (out of scope / no invent): sailings per week, rail/dray transit, drayage $ blocks, bobtail/chassis, schedule fields.
Skip the Instructions sheet. Before export, say filled vs missed vs still-unmapped vs ~100 lanes. Do not invent rates.
```

Then: `start on it`

---

## 4 — Big Lots NVO

**Expect 1000+ rows** across region tabs; offline ~991 filled / ~469 miss. Slow — dedupe + cache.

```
Fill all region bid tabs: Major China-Vietnam-India Ports, Other Asia, ISC, EUROPE, LAT AM.
Same column pattern on each: BASE (K), ARB (L), BFS/LSS (M), transit to POD (O). Leave ALL-IN (N) as the sheet formula (=K+L+M) — do not overwrite it.
Do not write Carrier SCAC when column A is a formula from Instructions.
Skip Instructions, Other Equipment or Discounts, DC Destinations, Reference.
Map every DRY (and other typed) row with POL + destination/POD; dedupe identical O–D×equipment before resolve; use cache / resolve-many — do not cold-start CLI per row.
Before export, report filled vs missed vs expected row scale (hundreds–thousands). Do not invent rates.
```

Then: `start on it`

---

## Shared follow-ups (optional)

After mapping reviews clear:

```
Continue — rates resolve once, then summarize hits/misses and any pending Reviews. Do not invent money or free days.
```

When rate/export reviews clear:

```
Export when waits are clear. Coverage must match the sheet row count we probed (minus honest Starboard misses). Then final export sign-off on Reviews.
```

---

## Sanity checks

- Reviews: export sign-off **Confirmed**
- Download: real $ only; blanks = miss / unbound; **Total/All-in formulas intact** where the blank had `=…`
- Rory: all four dest groups filled, not Cleveland-only
- Files: versioned `filled/<UTC>/…` present

## Optional golden

Nordstrom — `.project/docs/qa.md` (`2024_Ocean_RFP_-_Bid_Worksheet.xlsx`).
