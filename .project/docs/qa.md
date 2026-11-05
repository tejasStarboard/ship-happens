# Live QA — Ship Happens

**Env:** https://ship-happens-dev.vercel.app (Phase tickets verified on `dev`)  
**Local:** `pnpm --filter web dev` → http://localhost:3000 (Postgres `:54325`, Redis `:63799`)

Scope below = Phase 1–4 demo loop + **M3 answer write-back** (SB-7307: contract facts → BCO columns).

---

## A. Auth & shell

1. Sign up / sign in → create or select org.  
2. Sidebar: Fills, Templates, Rates, Overlays, Settings, Help.  
3. Fills-first navigation works.

## B. Templates

1. Upload `.xlsx` → list + detail Office preview (or Empty on embed fail).  
2. Optional: use template into new fill.

## C. New fill intake

1. New fill → name required, optional customer, file ≤25MB.  
2. Overview: Office preview, progress (ingest done), intake logs.

## D. Overview + Agent

1. Overview: preview, progress timeline, logs.  
2. Open Agent (`/w/{rfpId}`): `source/` hydrated from Blob, auto-open workbook, Office viewer.  
3. Agent Excel edit persists to Blob and refreshes preview (SB-7066).  
4. Dead eve session recovers (SB-7067).

## E. Rates (Phase 2a)

1. Rates page → contract search returns live Starboard results.  
2. Spot channel may return empty — **Foundry scrapers are not correctly driven** from SH; do not treat empty spot as “no Starboard spot product.”  
3. Fill path uses **contract resolve only**.

## F. HITL (Phase 2b)

1. Create/open a pending review (agent `sh-client reviews create` or real map/rate wait).  
2. Appears under **Waiting on you** → Confirm / Edit / Reject.  
3. Chat notifies + deep-link.  
4. Progress blocks while waits open.

## G. Map → resolve → export (incl. M3 answer columns)

1. `sh-client mapping propose` with O-D labels (Jev).  
2. Confirm map on Map tab: **base `cellRef`**, **feeBindings** (e.g. LSS→M), **answerBindings** (carrier/transit/free days/all_in).  
3. `sh-client rates resolve` — contract hits/misses; answer cells filled or skipped with honest reason.  
4. `sh-client export` → Final export sign-off → Confirm → Download.  
5. Excel opens; money ⊆ Starboard; unbound / missing Starboard facts stay blank (never invented).

---

## M3 golden gate — Nordstrom

**File:** `tmp/fwdfwbidexamples/Bid Examples/2024_Ocean_RFP_-_Bid_Worksheet.xlsx`  
**Sheet:** `Lanes` · header row 2 · data from row 3

| Column | Concept | Binding |
| --- | --- | --- |
| A | Carrier name | `answerBindings`: `carrier_name` |
| B | Carrier SCAC (optional) | `answerBindings`: `carrier_scac` |
| K | Base Rate | lane `cellRef` |
| L | All-In | `answerBindings`: `all_in` |
| M | LSS | `feeBindings`: heading `LSS` / `BAF` |
| P | Transit days | `answerBindings`: `transit_days` |
| U | Free days | `answerBindings`: `free_time.origin_days` (or dest) |

### Pass criteria

1. Required answer columns **filled** when Starboard hit carries the fact, else **skipped** with reason (not invented).  
2. Downloaded workbook opens; Base + All-In (+ LSS when present) written to bound `cellRef`s.  
3. Review / fill report shows provenance (hit id, carrier, buy, fee allocations).  
4. Money ⊆ Starboard (no invented prices or free days).

### Prompt 1 — inspect

```
This fill is Nordstrom's 2024 Ocean RFP bid worksheet.
Confirm Cover + Lanes; Lanes header row 2, data from row 3.
Summarize row counts, container types, destination ports.
Use sh-client status / progress / logs. Do not invent rates.
```

### Prompt 2 — map (M3 bindings)

```
Propose mapping with sh-client mapping propose (Jev geo).
originLabel from Origin City; destLabel from Destination Port as written;
equipmentType from Container Type (40' Standard→40GP, 20'→20GP, 40' HC→40HC, 45'→45GP);
sheetName Lanes; rowIndex = Excel row; laneId = Lane ID + equipment.
customerLabel Nordstrom.
Base cellRef = column K. Fee: LSS → column M cellRef.
Answers: carrier_name→A, all_in→L, transit_days→P, free_time.origin_days→U
(optional carrier_scac→B). Confirm on Map tab. Do not invent rates.
```

### Prompt 3 — resolve

```
mapping get, then sh-client rates resolve. Summarize hits/misses for
Shanghai→PNW 40', Mumbai→NY/NJ 40', Hong Kong→PNW 40HC.
Confirm fill report has transit/carrier/free days when Starboard carried them.
List pending reviews. Do not invent money.
```

### Prompt 4 — export

```
When waits are clear, sh-client export. Open export sign-off and deep-link Overview.
Confirm download shows Base + All-In (+ LSS when present). Do not invent values.
```

---

## Second golden — Big Lots (fee-heavy)

**File:** `tmp/fwdfwbidexamples/Bid Examples/2024-25 Big Lots Bid Sheet. NVO.xlsx`

### Pass criteria

1. Map fee columns via `feeBindings` (BAF/LSS/THC-style headings as sheet asks).  
2. Unexpected Starboard fees → soft-warn review (Settings can hard-block export).  
3. Answer columns bound where headers exist; otherwise leave unbound.  
4. Excel opens; money ⊆ Starboard.

### Agent prompt

Prefer the full paste-ready prompt in [demo-fill-prompts.md](./demo-fill-prompts.md) (all region tabs, leave All-in formula, coverage gate). Short form:

```
Fill all Big Lots region bid tabs (Major China-Vietnam-India Ports, Other Asia, ISC, EUROPE, LAT AM).
Write BASE / ARB / BFS when Starboard has them; leave ALL-IN as the sheet formula; fill transit when available.
Skip Instructions / Reference / DC / Other Equipment. Dedupe O–D before resolve. Do not invent rates.
```

---

## What not to expect yet

- Foundry spot schedule (ETD/ETA/cutoff/vessel/voyage) — follow-on epic  
- Inland/dray sheet completion via ocean resolve  
- Inventing SCACs when carrier vocab has no match  
