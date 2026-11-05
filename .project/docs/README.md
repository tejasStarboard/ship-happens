# Ship Happens — project docs

Working docs for Linear project **[Auto RFP sheet Filler](https://linear.app/starboard-biz/project/auto-rfp-sheet-filler-a1f6a57574a7)** (`P-SB-49`), product name **Ship Happens**.

Synced from Linear + repo state as of **2026-11-03**. Prefer this folder for agent/human onboarding; keep `docs/` at repo root for longer-form published PRD/architecture that may lag tickets.

| Doc | Purpose |
| --- | --- |
| [PRD](./PRD.md) | Problem, users, goals, success criteria (from Linear PRD + shipped reality) |
| [Architecture](./architecture.md) | Runtime stack, packages, fill pipeline, Starboard integration |
| [Roadmap](./roadmap.md) | Phases 1–4, In Dev / Backlog priorities |
| [Tickets](./tickets.md) | Full Linear ticket inventory by phase/status |
| [Answer schema & column gap](./answer-schema-and-gap.md) | What BCOs ask vs Starboard vs what SH writes today |
| [QA](./qa.md) | Live QA on `dev` for Done scope + Nordstrom fixture prompts |
| [Demo fill prompts](./demo-fill-prompts.md) | Paste-ready chat prompts for Rory / iDesign / S2S / Big Lots (max coverage) |
| [Environments](./environments.md) | Local / Vercel / Linear / Starboard pointers |

**Execution:** [`.project/todo`](../todo/README.md) (In Dev + merged-to-`dev` = done). Stale Linear Backlog that landed in git: [`.project/done`](../done/README.md). Expand new work under [`.project/tickets`](../tickets/README.md).

**Team:** Tejas (lead), Oscar, Sumeet · **Eng team:** SB  
**Dev:** https://ship-happens-dev.vercel.app · **Prod:** https://ship-happens-one.vercel.app  
**Linear PRD:** [PRD - Ship Happens](https://linear.app/starboard-biz/document/prd-ship-happens-f6aa7f513259)

## Status snapshot (Linear)

| Status | Count |
| --- | ---: |
| Done | 25 |
| In Dev | 18 |
| Code Review | 1 |
| Backlog | 5 |
| **Total** | **49** |

Phase 1 + Phase 2 (mostly) **Done**. Phase 3 rate fill / overlays and Phase 4 export **In Dev**. Known product gap: most BCO columns beyond base ocean $ are not yet written (see answer-schema doc).
