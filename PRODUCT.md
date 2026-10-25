# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: pricing & procurement directors and pricing analysts at independent ocean freight forwarders / NVOCCs (persona: Julie Adams). They work under Trans-Pacific RFP season pressure—many BCO bid sheets due the same day, often with 24–48h urgents.

Secondary: forwarder leadership who need capacity and margin without replacing Starboard as rate/CRM OS.

## Product Purpose

Ship Happens is an autonomous AI worker for **BCO annual tender workbooks**. It ingests customer bid sheets, maps them to Starboard lane/rate concepts, fills cells from Starboard contract/spot search plus projected overlays, supports human review, and exports cell-compliant Excel into the original template.

Success: turnaround under ~20 minutes (vs 24–48h manual), fewer re-key errors, higher bid capacity during peak season.

## Positioning

Starboard owns rates, CRM, and email. Ship Happens owns the **sell-side BCO bid sheet** problem (map → fill → review → write-back)—not a second rate database, not FCLv6, not a TMS.

## Operating Context

- Org-scoped web app (Better Auth orgs): Fills (RFP jobs), Templates, Starboard Rates search, Agent/workspace chat, Settings/Members.
- Analysts upload Excel/CSV tenders; fill runs in an isolated sandbox; overview shows progress/logs; download completed workbook.
- Peak season mental model: desk crowded with parallel fills, long carrier/port names, dense tables.

## Capabilities and Constraints

- Consumes Starboard Public API for contract/spot rate search; does not scrape or store parallel rate libraries.
- Map / Review / Overlays product tabs may be stubbed until wired—UI must stay honest.
- Client components must not import server/db packages; use browser-safe types only.
- Human sign-off remains required; product does not take legal/commercial risk decisions.

## Brand Commitments

- Product name: **Ship Happens** (Starboard Logistics Technology).
- Existing mark/wordmark assets in `apps/web/components/brand/`.
- Voice: operational, freight-trade vocabulary (fills, lanes, bid sheets, surcharges)—not generic SaaS (“items”, “records”).

## Evidence on Hand

- Product truth: `docs/PRD.md`, `docs/architecture.md`.
- Runnable UI: `apps/web` + design primitives `packages/ui`.
- Do **not** fabricate customers, win-rate %, or SOC2 claims in UI copy beyond what PRD states as targets.

## Product Principles

1. **Starboard is SoR for rates**—Ship Happens surfaces fill work, not a competing rate OS.
2. **Trade language over template nouns**—labels match the pricing desk.
3. **Honest states**—empty, stub, loading, and missing values stay truthful.
4. **Density for operators**—tables and status before decoration.
5. **One product face**—auth, shell, and agent share one visual system.
