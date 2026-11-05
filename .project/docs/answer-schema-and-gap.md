# Answer schema & BCO column gap

Evidence: inventory of `tmp/fwdfwbidexamples/Bid Examples/` (~20 workbooks, ~30 bid-like sheets) + starboard-2 contract/spot surfaces + current SH fill/export behavior. Interactive canvas: workspace canvases `bid-examples-starboard-gap.canvas.tsx`.

## The gap in one line

Ship Happens today writes **~one money cell per lane** (contract buy → overlay sell). BCO sheets ask for **20+ concepts**. Starboard already has many of them; SH does not export them.

## PRD answer schema vs SH write behavior

| Answer id (PRD) | Starboard source | SH today (M3 SB-7307) |
| --- | --- | --- |
| `ocean_base.*` | Contract resolve / spot rate_items | **Fills** (base `cellRef`) |
| `baf` / `lss` / accessorials | Surcharges + globals | **feeBindings** → fee cells |
| `carrier_name` / `carrier_scac` | Hit `carrier_name`; SCAC via `/carriers` vocab | **answerBindings** (SCAC skip if no vocab) |
| `transit_days` | Contract `transit_time` | **answerBindings** |
| `free_time.*` | Hit `rate_items` free_usage | **answerBindings** |
| `all_in` | Derive buy (+ peeled fees) | **answerBindings** dual-write with base |
| `currency` / validity / `service_name` | Hit fields | **answerBindings** |
| Schedule (ETD/ETA/cutoff/vessel) | Spot Foundry `OceanFCLOffer` | **Not wired** (follow-on epic) |
| `unsupported` | Honest empty | Skip + reason — never invent |

## Concepts BCOs ask for (Bid Examples)

| Concept | Asked in (approx) | Starboard | How to fill (starboard-2) | SH |
| --- | --- | --- | --- | --- |
| Base ocean rate | High | Yes | `qv2/rates/search` + resolve; spot rate_items | Fills |
| All-in rate | Medium | Derive | Sum buy + surcharges / offer totals | answerBindings `all_in` |
| Bunker / BAF / LSS | High | Yes | Surcharges + feeBindings | Fee-bound |
| THC / AMS / PSS / other fees | Medium–high | Yes / partial | Ontology + globals + bindings | Fee-bound |
| Chassis | Medium | Partial | Globals / inland — unreliable on ocean hit | No |
| Free time / D&D days | High | Yes | Contract free_time; spot `free_usage` | answerBindings |
| Transit days | High | Yes | `transit_time` on hit/offer | answerBindings |
| Cutoff / ETD / ETA | Medium | Spot-heavy | Foundry scrapers / CMA | No |
| Vessel / voyage / service string | Medium | Spot / partial | Offer fields | No |
| Sailing frequency | Medium | **NA** | Not a rate field | No |
| Carrier name | Medium | Yes | `carrier_name` | answerBindings |
| Carrier SCAC | Low | Partial | `/carriers` vocab | answerBindings (skip if miss) |
| Equipment / O-D geo | Ubiquitous | Yes | Mapping + locations / Jev | Read-only |
| Validity / currency | Medium | Yes | Rate window + currency | answerBindings |
| Inland / door / dray | Medium+ | Separate product | Not ocean FCL resolve | No |
| Volume / Lane ID / bid rank | High / med | **NA** (BCO-owned) | Leave blank / copy | Read-only |
| Notes / commodity / incoterm | Medium | Partial | Remark / filters | Rarely |

## Starboard fill paths

### Contract (SH primary)

`POST /api/qv2/rates/search` → surcharges, totals, transit, validity, free_time when on ingested sheets → `sb-client` `rates.resolve` (+ globals).

### Spot / Foundry (needed for schedule depth)

BFF `/api/vendor_rates/spot/[carrier]` → Python `vendor_rates/ocean/spot/{carrier}` → **DBOS Foundry** scrapers (`hapag`, `msc`, `one`, `oocl`, `evergreen`, `maersk`) or **CMA API**. Requires company credentials (`has_foundry_credentials`). Returns `OceanFCLOffer` (transit, sailing/arrival, cutoffs, vessel, voyage, service_name, rate_items).

SH Rates “spot” today is a thin POST with the wrong payload shape and does **not** equal a Foundry scrape.

## Export rule (why sheets stay empty)

`selectExportCells` writes only cells with:

- `outcome === "filled"`
- non-empty `value`
- both `sheetName` and `cellRef`

Map confirm must set **Base Rate** (e.g. Nordstrom `Lanes!K{row}`) as `cellRef`. Without it, Review may show numbers while the workbook stays blank.

## Unexpected fees (T4)

When Starboard returns charge lines not requested by `feeBindings`, resolve opens a soft-warn review (`unexpected-fee`). Settings → Fill export can hard-block export. Matched fees peel from buy for base; `all_in` = base + allocated fee sum (or full buy when no fee peel).

## Recommended sequencing

1. ~~Finish Phase 3–4 demo loop~~ / ~~M3 contract answer write-back (SB-7307)~~  
2. Wire Foundry spot for schedule columns (follow-on epic).  
3. Inland/dray as separate initiative.  
