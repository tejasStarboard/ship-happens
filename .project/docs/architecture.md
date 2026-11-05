# Architecture — Ship Happens

Companion to repo [`docs/architecture.md`](../../docs/architecture.md). This file ties Linear phases to the running system.

## 1. High-level

```
┌─────────────────────────────────────────────────────────────┐
│ apps/web (Next.js + eve + Better Auth + Drizzle)            │
│  Fills desk · Overview · Map · Rates · Overlays · Settings  │
│  Agent workspace (/w/{rfpId}) · sh-client / sb-client skills│
└───────────────┬─────────────────────────────┬───────────────┘
                │                             │
                ▼                             ▼
     @ship-happens/fill              @ship-happens/sb-client
     intake · pipeline · mapping     Starboard Public API
     rates resolve · overlays        contract search / resolve
     export · reviews · analytics    spot HTTP (Foundry path TBD)
                │
                ▼
         @ship-happens/db (Postgres)
         Blob (workbooks) · Redis (sessions)
```

**Starboard (starboard-2)** remains system of record for buy rates. Ship Happens owns BCO tender workbook fill.

## 2. Stack (shipped)

| Layer | Choice |
| --- | --- |
| App | Next.js App Router (`apps/web`) |
| Agent | **eve** workspace + skills (`agent/skills/*`) — not Rivet/Pi from Oct PRD draft |
| Auth | Better Auth (orgs, RBAC session) |
| DB | Postgres + Drizzle (`@ship-happens/db`) |
| Fill domain | `@ship-happens/fill` — sole pipeline writer |
| Starboard | `@ship-happens/sb-client` + web `lib/starboard/*` |
| Files | Vercel Blob (`rfp_source_files`, export artifacts) |
| Cache / sessions | Redis |
| UI | `@ship-happens/ui` |

Oct Linear PRD mentioned Rivet Actor + Pi + separate `rate-sheet-filler` repo. Current product uses **eve + host fill services**; keep PRD money-safety / answer-schema ideas, treat Rivet as historical proposal unless revived.

## 3. Packages

| Package | Role |
| --- | --- |
| `@ship-happens/db` | Schema + `createDb()` |
| `@ship-happens/fill` | Intake, pipeline, mapping, rate resolve, overlays, export, reviews, analytics |
| `@ship-happens/sb-client` | Starboard client + CLI |
| `@ship-happens/ui` | Design primitives |

## 4. Fill pipeline

`FillPipelineManager` is the **sole writer** of `rfps.status`, `rfp_progress_steps`, `rfp_logs`.

Step order:

`ingest` → `map` → `rates` → `overlay` → `review` → `export`

Agent entry: `@/lib/domain/pipeline/agent-pipeline` + skill `fill-pipeline`.  
Inspect / HITL / resolve CLI: skill `sh-client` (`sh-client` binary).

Open `pending` review items **block** Progress completion for the related `stepKey`.

## 5. Core data model (product tables)

| Area | Tables (representative) |
| --- | --- |
| Auth / org | `user`, `session`, `organization`, `member`, … |
| Templates / fills | `templates`, `rfps`, `rfp_source_files`, `rfp_progress_steps`, `rfp_logs` |
| HITL | `rfp_review_items` |
| Mapping / rates | `rfp_mapped_lanes`, `rfp_fill_reports`, `rfp_fill_report_cells` |
| Overlays / floors | `overlay_rules`, `margin_floor_rules`, `fill_org_settings` |
| Agent | `rfp_chats`, workspace bind to eve session |
| Ops | `fill_pipeline_events`, email intake tables (stretch) |

## 6. Starboard integration

### Contract (primary for fill)

- `POST /api/qv2/rates/search` via handshake + company scope  
- `rates.resolve` = contract hits + matching global defaults (buy total + surcharges)  
- Used by Rates page smoke and `sh-client rates resolve`

### Spot

- starboard-2: BFF `/api/vendor_rates/spot/[carrier]` → Python scrapers on **Foundry** (or CMA API)  
- Requires company scraper credentials; not a synchronous thin lookup  
- SH Rates UI posts a simplified body today — **does not correctly drive Foundry scrapes**  
- Fill resolve path is **contract-only** (`channel: "contract"`)

### Geo

- Locations + Jev-backed `mapping propose` (SB-7083) for free-text O-D → LOCODE + confidence → HITL when weak

## 7. HITL review plane (Phase 2b)

1. Agent or server creates `rfp_review_items` (`pending`)  
2. Overview **Waiting on you** + detail Confirm / Edit / Reject  
3. Chat notifies + deep-links  
4. Resolve path (SB-6662) clears waits after decision  
5. Sources include: `mapper`, `margin-floor`, `rate-pick`, `export-signoff`, `unexpected-fee`, `mapping-reuse`, …

## 8. Export (Phase 4)

1. `selectExportCells` — only `filled` cells with `sheetName` + `cellRef`  
2. Write into original workbook via agent-xlsx / workbook writer  
3. Blob artifact + **Final export sign-off** review  
4. Download unlocked after Confirm  

Missing `cellRef` ⇒ numbers may appear in Review but **not** in the xlsx.

## 9. Environments

See [environments.md](./environments.md). Local Postgres host port **54325**, Redis **63799**.

## 10. Related Linear epics

| Phase | Parent | Status |
| --- | --- | --- |
| 1 Foundations | SB-6649 | Done |
| 2 Client + HITL + mapping | SB-6650 | Done (SB-6662 still In Dev) |
| 3 Rates + overlays + audit | SB-6664 | In Dev |
| 4 Export + demo | SB-6670 | In Dev |
