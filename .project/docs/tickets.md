# Linear tickets — Auto RFP sheet Filler

**Project:** [Auto RFP sheet Filler](https://linear.app/starboard-biz/project/auto-rfp-sheet-filler-a1f6a57574a7) (`P-SB-49`)  
**Snapshot:** 2026-11-03 · + M3 epic SB-7307 (T1–T6 = SB-7308…7313) · Lead Tejas Ladhe

Refresh with Linear MCP / UI; this file is a working mirror.

## M3 — Bid-complete rows (contract answers) · parent [SB-7307](https://linear.app/starboard-biz/issue/SB-7307)

| ID | Title | Status |
| --- | --- | --- |
| SB-7308 | T1 Extend resolve port with contract service facts | Todo → implement |
| SB-7309 | T2 Answer bindings on mapped lanes + Map UI | Todo → implement |
| SB-7310 | T3 Resolve emits fill-report cells for answer bindings | Todo → implement |
| SB-7311 | T4 All-in dual-write + fee binding demo harden | Todo → implement |
| SB-7312 | T5 Carrier SCAC lookup via Starboard vocab | Todo → implement |
| SB-7313 | T6 Nordstrom + second Bid Example golden QA gate | Todo → implement |

---

## By status

| Status | Count | IDs |
| --- | ---: | --- |
| Done | 25 | SB-6639…6653, 6655…6661, 6663, 6649, 6650, 7066, 7067 |
| In Dev | 18 | SB-6662, 6664…6673, 7078…7081, 7084…7086 |
| Code Review | 1 | SB-7083 |
| Backlog | 5 | SB-7088…7092 |

---

## Phase 1 — Foundations (Done) · parent [SB-6649](https://linear.app/starboard-biz/issue/SB-6649)

| ID | Title | Status |
| --- | --- | --- |
| SB-6639 | App shell: auth, orgs, sidebar IA | Done |
| SB-6640 | RFP/template schema + migrations | Done |
| SB-6641 | Template upload + list/detail Office preview | Done |
| SB-6642 | New fill intake → Blob source files | Done |
| SB-6643 | Seed fill progress steps + intake logs | Done |
| SB-6644 | Fill Overview dashboard (preview + progress + logs) | Done |
| SB-6645 | Office embed check + Empty on failure | Done |
| SB-6646 | Hydrate Agent workspace source from Blob | Done |
| SB-6647 | Auto-open source workbook in Agent | Done |
| SB-6648 | Agent Office viewer via Blob publicUrl | Done |

## Phase 2 — Starboard client, HITL, mapping · parent [SB-6650](https://linear.app/starboard-biz/issue/SB-6650)

### 2a Starboard client

| ID | Title | Status |
| --- | --- | --- |
| SB-6651 | Starboard client scaffold (env, auth, base URL) | Done |
| SB-6652 | Read-only rate search smoke (contract + spot) | Done |
| SB-6653 | Wire Rates page to Starboard client | Done |

### 2b HITL control plane

| ID | Title | Status |
| --- | --- | --- |
| SB-6655 | DB: review items + wait/status model | Done |
| SB-6656 | Backend fill CLI (status, logs, reviews) | Done |
| SB-6657 | Agent skills wrapping fill CLI | Done |
| SB-6658 | Overview Waiting on you panel | Done |
| SB-6659 | Review detail panel (Confirm / Edit / Reject) | Done |
| SB-6660 | Agent chat notify + deep-link to review | Done |
| SB-6661 | Optional per-item micro-thread | Done |
| SB-6662 | Resolve path (UI and/or agent via CLI) | **In Dev** |
| SB-6663 | Block Progress while waits open + empty states | Done |

## Phase 3 — Rate fill, overlays, audit · parent [SB-6664](https://linear.app/starboard-biz/issue/SB-6664)

| ID | Title | Status |
| --- | --- | --- |
| SB-6664 | Starboard rate fill, overlays & audit trail | **In Dev** |
| SB-6665 | Resolve mapped lanes via Starboard client | **In Dev** |
| SB-6666 | Projected overlay model + Overlays UI | **In Dev** |
| SB-6667 | Floor-margin exceptions → review queue | **In Dev** |
| SB-6668 | Per-row audit trail (source + overlay + markup) | **In Dev** |

## Phase 4 — Export, sign-off, demo · parent [SB-6670](https://linear.app/starboard-biz/issue/SB-6670)

| ID | Title | Status |
| --- | --- | --- |
| SB-6670 | Cell-compliant export, final sign-off & demo | **In Dev** |
| SB-6669 | Cell-compliant write-back into original BCO template | **In Dev** |
| SB-6671 | Final export sign-off via review queue | **In Dev** |
| SB-6672 | Download filled workbook from Overview | **In Dev** |
| SB-6673 | Demo harden: real templates + empty/error polish | **In Dev** |

## Cross-cutting / polish

| ID | Title | Status |
| --- | --- | --- |
| SB-7066 | Persist agent Excel edits to Blob and refresh UI preview | Done |
| SB-7067 | Recover Agent chat when eve session is no longer active | Done |
| SB-7078 | Schema confirm UI for BCO column/lane mapping | **In Dev** |
| SB-7079 | Persist fill mapping in Postgres (replace workspace mapping.json) | **In Dev** |
| SB-7080 | Fix New fill dialog copy that still says later phases | **In Dev** |
| SB-7081 | Stretch: email intake for BCO sheets via Starboard surfaces | **In Dev** |
| SB-7083 | Jev mapping: geo resolve, confidence & HITL | **Code Review** |
| SB-7084 | Rate-pick confidence in audit & review queue | **In Dev** |
| SB-7085 | Fill pipeline events + ops analytics MVP | **In Dev** |
| SB-7086 | Analytics: rate coverage, margins & mapping quality | **In Dev** |

## Backlog

| ID | Title | Status |
| --- | --- | --- |
| SB-7088 | Map BCO fee/accessorial columns via Starboard rate items | Backlog |
| SB-7089 | Surface Starboard rate provenance on pricing audit | Backlog |
| SB-7090 | Fill due date, won/lost outcomes & analytics | Backlog |
| SB-7091 | Multi-round fills: reuse mapping across workbook revisions | Backlog |
| SB-7092 | Lane bid priority from hit/skip/margin signals | Backlog |

---

## Links

- Project: https://linear.app/starboard-biz/project/auto-rfp-sheet-filler-a1f6a57574a7  
- PRD doc: https://linear.app/starboard-biz/document/prd-ship-happens-f6aa7f513259  
