# Roadmap — Auto RFP sheet Filler

Linear project status: **Planned** (tickets show active In Dev). Target date on project was **2026-10-14** (slipped). Lead: Tejas.

Progress (2026-11-03): **25 Done / 19 active (In Dev + Code Review) / 5 Backlog** of 49 issues.

---

## Phase map

```
Phase 1 Foundations ████████████ Done
Phase 2 HITL + map  ███████████░ Done* (resolve path open)
Phase 3 Rate fill   ██████░░░░░░ In Dev
Phase 4 Export/demo █████░░░░░░░ In Dev
Polish / analytics  ████░░░░░░░░ In Dev
Backlog depth       ░░░░░░░░░░░░ Backlog
```

\* SB-6662 resolve-after-decision still In Dev under Phase 2b.

---

## Now (finish demo path)

**Goal:** Nordstrom (or AutoZone) → map → contract resolve → overlay → export sign-off → download, with HITL only for real gaps.

| Priority | Ticket | Theme |
| --- | --- | --- |
| P0 | SB-6664 + SB-6665…6668 | Phase 3: resolve lanes, overlays, floor margins, per-row audit |
| P0 | SB-6670 + SB-6669…6673 | Phase 4: cell write-back, sign-off, download, demo harden |
| P0 | SB-6662 | Resolve path after Confirm/Edit/Reject |
| P0 | SB-7078 / SB-7079 | Schema confirm UI + mapping in Postgres (`cellRef` required for export) |
| P1 | SB-7083 | Jev geo propose + confidence (Code Review) |
| P1 | SB-7084 | Rate-pick confidence → review queue |
| P1 | SB-7080 | New fill dialog copy |

**Demo gate (SB-6673):** real templates under `tmp/` — Nordstrom Bid Worksheet, AutoZone, etc.

---

## Next (column depth — product gap)

BCOs ask for transit, free days, carrier, all-in, bunker columns, schedule, etc. Starboard often has the data; SH does not write it yet.

| Priority | Ticket / work | Theme |
| --- | --- | --- |
| P1 | SB-7088 | Fee/accessorial columns via rate items + ontology |
| P1 | SB-7089 | Rate provenance on pricing audit |
| P1 | (new / extend Phase 3–4) | Export transit, free_time, carrier_name, currency, validity from chosen hit |
| P2 | Foundry spot wiring | Real spot scrapes for schedule (ETD/ETA/cutoff/vessel) — not thin HTTP |
| P2 | All-in dual-write / derive | Compute from resolved surcharges |

See [answer-schema-and-gap.md](./answer-schema-and-gap.md).

---

## Later (Backlog)

| Ticket | Theme |
| --- | --- |
| SB-7081 | Email intake via Starboard surfaces (stretch, also In Dev) |
| SB-7085 / SB-7086 | Pipeline events + ops analytics |
| SB-7091 | Multi-round fills / mapping reuse across revisions |
| SB-7092 | Lane bid priority from hit/skip/margin |
| SB-7090 | Fill due date, won/lost outcomes & analytics |

---

## Explicit non-goals (near-term)

- Hardcoding Nordstrom column letters as the product  
- Replacing Starboard rate ingest  
- Treating inland/dray bid sheets as done via ocean FCL resolve alone  
- Claiming spot search works without Foundry + credentials  

---

## Suggested milestone narrative

1. **M1 — Desk MVP (largely Done):** auth, intake, Overview, Agent, HITL plane, Starboard rates page  
2. **M2 — Fill loop demo (In Dev):** map confirm → resolve → overlay → export → download on 2 goldens  
3. **M3 — Bid-complete rows:** answer-schema coverage for money + service facts (transit, free time, carrier, fees)  
4. **M4 — Spot schedule + multi-round + analytics:** Foundry spot, revision reuse, won/lost / priority  
