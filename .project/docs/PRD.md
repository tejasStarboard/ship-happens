# PRD — Ship Happens (Auto RFP sheet Filler)

**Linear:** [Auto RFP sheet Filler](https://linear.app/starboard-biz/project/auto-rfp-sheet-filler-a1f6a57574a7) · [PRD - Ship Happens](https://linear.app/starboard-biz/document/prd-ship-happens-f6aa7f513259) (Tejas, 5 Oct 2026)  
**Repo:** `ship-happens` · **Brand:** Ship Happens

This doc merges the Linear PRD with **what is actually shipping** (eve + Next.js fill pipeline). Where the Oct PRD assumed Rivet/Pi + a separate filler repo, the implemented product uses **eve agent workspaces + `@ship-happens/fill` + `sh-client` CLI**. The product goal is unchanged.

---

## 1. Problem

Big shippers (Nordstrom, AutoZone, Guitar Center, Grainger/Archlet, …) send **their** bid workbooks — different columns, equipment, surcharges, free time, multi-tabs, formulas.

Pricing teams spend hours/days collecting rates into cells. One wrong column and the bid is wrong. A fixed Starboard export template cannot win: **every shipper format is a snowflake.**

**Product surface:** the shipper’s Excel, filled in place — not “download our template.”

## 2. Who is the user

| Role | Role in product |
| --- | --- |
| **Pricing analyst / RFP coordinator** | Uploads shipper sheet, works with the agent, reviews gaps (Waiting on you), downloads and submits |
| Forwarder ops / pricing lead | Configures overlays, floor margins, org Starboard linkage |

**Not the user:** the shipper’s procurement team. They receive the filled sheet; our customer produces it.

## 3. Goal

Forwarder uploads **any** shipper RFP workbook → system maps lanes/asks to Starboard rates (contract resolve + overlays) → human reviews exceptions → downloads **the same file shape**, cell-compliant.

**Success:** real customer RFPs → host-accepted fill → chat to steer → audit trail → submit-ready workbook — **no invented money**.

**Effect:** bid turnaround days → minutes; format chaos stops blocking Starboard; Starboard owns the annual RFP desk, not only spot quoting.

**Business (from Linear PRD):** upsell RFQ Management ~**USD $75 / fill**; upper mid-market ~50–100 RFQs/year.

## 4. Product principle (format-agnostic)

Shipper workbooks vary like carrier rate sheets. Approach:

```
FCL v6:   Sheet cells ──(agent writes parser)──► Starboard rates DB
RFP fill: Starboard rates ──(agent / host fill path)──► Sheet cells
                 ▲
          Host owns answer schema + rate payload + accept/reject + HITL
```

One-shot “map columns with an LLM” does not scale across Nordstrom + AutoZone + next week’s unknown. Learning (layout reuse / mapping reuse) is required.

**Money safety:** every `$` written into the sheet must come from Starboard resolve / frozen payload / confirmed overlay — never invented by the model.

## 5. Functional requirements

1. Upload shipper RFP (`.xlsx` / supported spreadsheets) and start a fill.
2. Discover / propose fillable asks (lanes, equipment, charges, free time, …).
3. Map to Starboard concepts (geo/LOCODE, equipment, fee bindings).
4. Resolve rates from Starboard (contract path first; spot/Foundry later where needed).
5. Apply projected overlays + floor-margin guards.
6. HITL: Waiting on you (Confirm / Edit / Reject); Progress blocks on open waits.
7. Agent chat + fill CLI (`sh-client`) in the same workspace.
8. Cell-compliant write-back into original BCO template; export sign-off; download.
9. Audit: what was written, from which rate/overlay.
10. Multi-round / layout reuse (mapping reuse across workbook revisions) — backlog/In Dev.

## 6. Non-functional requirements

1. Format-agnostic across multiple real templates (not one hardcoded layout).
2. Happy-path fill (agent + review) under ~10 minutes (PRD target).
3. Money ⊆ Starboard / confirmed overlay; full provenance.
4. Output opens in Excel; formulas / locked columns preserved where possible.
5. Agent code / skills isolated from monorepo secrets; org-scoped data.
6. Second similar layout cheaper than from-scratch (fingerprint / mapping reuse).
7. Golden fixtures: Nordstrom Lanes + AutoZone (or Guitar Center) green.

## 7. Success criteria

| Metric | Target |
| --- | --- |
| Product claim | Multiple real shipper templates, not one hardcoded layout |
| Golden demos | ≥2 fixtures green (Nordstrom Lanes + AutoZone or Guitar Center) |
| Time | Happy-path demo under ~10 minutes wall time |
| Output | File opens in Excel |
| Money safety | Every filled `$` traces to rate / answer / overlay id in audit |

## 8. Answer schema (host-owned)

Starboard can answer a versioned set of **answer ids**. Sheets ask for columns; the filler binds asks → answers or `unsupported`.

| Answer id | Meaning | Typical sheet ask |
| --- | --- | --- |
| `carrier_name` / `carrier_scac` | Who we bid as | Carrier Name, SCAC |
| `ocean_base.20gp` / `.40gp` / `.40hc` / `.45gp` | Base ocean excl. fuel | Equipment rate columns |
| `baf` / `lss` | Fuel / low sulphur | BAF, LSS |
| `dest_charges` / `origin_charges` | Accessorials | Dest Charges, AMS, THC |
| `free_time.origin_days` / `.dest_days` | Free time | Free days POL/POD |
| `transit_days` | Transit | Ocean Transit Days |
| `unsupported` | Cannot answer | Alliance-only meta, portal fields |

**Today (implementation gap):** fill path primarily writes **base ocean money** (+ optional fee cells if bound). Transit, free time, carrier, schedule, all-in dual-write, etc. are mostly **not exported yet** even when Starboard has the data. See [answer-schema-and-gap.md](./answer-schema-and-gap.md).

## 9. Fixtures (proof, not product limit)

- Nordstrom Ocean RFP (Lanes) — golden  
- AutoZone (multi-tab)  
- Guitar Center (peak / non-peak)  
- Grainger / Archlet  

Local samples: `tmp/fwdfwbidexamples/` (incl. Bid Examples/).

## 10. Risks and guardrails

| Risk | Guardrail |
| --- | --- |
| Agent invents prices | Resolve/payload only; reject unknown amounts |
| Wrong lane match | HITL map reviews; geo confidence; chat steer |
| Overfit to one demo sheet | Multi-fixture gate |
| Spot looks “empty” | Ocean spot scrapers need Foundry + company creds — not a thin HTTP stub |
| Chat becomes a second brain | One agent session per fill; Overview owns Confirm/Reject |

## 11. Out of scope (near-term)

- Replacing Starboard QGS / rate ingest  
- Shipper-facing portal (BCOs don’t log into Ship Happens)  
- Full inland/dray bid sheets as first-class ocean fill (separate product surface)  
- Inventing sailing frequency / bid award decisions  
