# Product Requirement Document (PRD): Ship Happens
## Autonomous Ocean Freight RFP Bid Sheet Filler (Starboard Tech)

---

## 1. Executive Summary & Product Vision

### 1.1 Overview
**Ship Happens** is an autonomous AI-powered digital worker developed by **Starboard Logistics Technology**, designed to revolutionize how ocean freight forwarders and Non-Vessel Operating Common Carriers (NVOCCs) handle complex Beneficial Cargo Owner (BCO) Request for Proposal (RFP) bid sheets.

It runs **on top of Starboard**—Starboard’s rate library, FCLv6 ingest, contract/spot search, CRM, and email surfaces are the system of record for buy rates and relationships. Ship Happens owns the BCO tender workbook problem: map customer templates, apply projected overlays, review with humans, and write cell-compliant responses.

### 1.2 Mission Statement
To eliminate manual spreadsheet friction, prevent margin erosion, and arm independent freight forwarders with enterprise-grade AI technology—enabling them to respond to complex ocean freight tenders in minutes rather than days.

### 1.3 Key Value Proposition
* **Turnaround Acceleration**: Reduces RFP processing time from 24–48 hours down to **under 20 minutes**.
* **Margin Recovery**: Recovers **3–5% in gross margin** by optimizing multi-source rate selection (Starboard contract + spot, plus projected overlays) and eliminating human data entry errors.
* **Capacity Scaling**: Expands pricing desk bid capacity by **3x** during peak Trans-Pacific RFP season without increasing headcount.

---

## 2. Problem Statement & Market Context

### 2.1 The Trans-Pacific RFP Season Crunch
In US ocean freight, import contracts from Asia run on an annual cycle from **May 1 to April 30**. RFPs flood forwarder pricing desks in massive seasonal waves:
* **December – January**: Large retailers (e.g., Walmart, Target, Nike) release early bids requiring 8–12 week lead times.
* **Post-Chinese New Year (February – April)**: The bulk of mid-to-small BCO RFPs arrive simultaneously.
* **Daily Peaks**: Pricing desks routinely face up to **12 complex RFPs due on a single day**, with ~15% arriving as urgent requests with 24–48 hour deadlines.

### 2.2 Unstructured Spreadsheets & Platform Fragmentation
BCOs use diverse procurement platforms (Jaggaer, TIContract/Transporeon, Coupa, InforNexus, SAP Ariba) or custom Excel workbooks. These bid sheets feature:
* **50 to 100+ Columns**: Requesting base freight rates, itemized surcharges (BAF, GRI, PSS, LSS, ISPS), transit times, origin/destination port aliases, vessel cutoffs, and transshipment rules.
* **Strict Formatting Controls**: Locked cells, custom dropdown validation rules, mandatory decimal precision, and specific day-of-week abbreviations.

### 2.3 The Multi-Round "Layout Drift" Nightmare
Tenders span 2 to 6 negotiation rounds. BCOs frequently issue Round 2 or Round 3 templates where input cells are blanked out, **columns are reordered, and rows are sorted into completely different sequences**. Manual VLOOKUPs break, leading to catastrophic mis-pasting across dozens of columns.

### 2.4 Blind Quoting & Projected Rate Reliance
BCOs demand 12-month fixed rate commitments 3–6 months before ocean carrier buy-rates are finalized in March/April. As a result, forwarders rely on **projected market rates ~75% of the time** during early rounds, creating an urgent need for pricing history auditability when market rates shift.

### 2.5 Two Different Spreadsheet Problems
Forwarders already struggle with **vendor/carrier rate sheets** (buy-side) and separately with **BCO RFP bid sheets** (sell-side tenders). Starboard solves the former (ingest → schema → searchable rates → quotes). Ship Happens solves the latter (map BCO templates → fill from Starboard rates + projected overlays → export into the original workbook).

---

## 3. User Personas & Stakeholder Needs

### 3.1 Primary Persona: Julie Adams (Pricing & Procurement Director)
* **Background**: 30+ years in ocean freight procurement; former Pricing Director at UWL.
* **Core Need**: Fast, compliant, and accurate completion of BCO bid sheets without working 16-hour days during RFP season—using rates already managed in Starboard.
* **Key Pain Points**:
  * Manual copy-pasting across 70+ columns across multiple workbooks.
  * Inability to remember original rate assumptions when managers ask 3 months later "How was this priced?".
  * Broken Excel macros when shippers reshuffle template structures between rounds.

### 3.2 Secondary Persona: Sumeet Trehan (CEO & Forwarder Partner Lead)
* **Background**: Founder & CEO of Starboard; former Flexport Canada Operations Lead.
* **Core Need**: Extend Starboard with an autonomous BCO tender worker so independent forwarders can compete against mega-forwarders without replacing their core Systems of Record.
* **Key Pain Points**:
  * Forwarder net margins are razor-thin (1–2%); manual labor in pricing eats gross profit.
  * Quoting delays (24–48h) lose business to faster competitors in first-responder markets.

---

## 4. Desired Solution & Product Scope

### 4.0 Platform Dependency: Starboard
**Starboard is the rate, CRM, and email OS.** Ship Happens does not reimplement Starboard capabilities; it consumes them.

| Starboard capability | Ship Happens use |
| :--- | :--- |
| Rate sheet ingestion & contract rates (FCL, LCL, air, drayage, cartage) | Buy-rate pool for bid lines |
| Contract + spot multi-lane rate search / quoting | Source rates per RFP lane |
| Outlook / Gmail add-in (email as first-class input) | Optional intake for RFP or rate-sheet attachments; web upload is MVP default |
| CRM (customer/vendor companies, pricing contacts) | Org context, tender ownership, vendor sourcing |
| **FCLv6** (agentic unstructured vendor/carrier sheet → Starboard schema → base rates + surcharges) | Keep contract rates fresh in Starboard; Ship Happens may trigger or reuse this pipeline—not rebuild it |

**Terminology alignment (Starboard concepts):** lane, leg, cargo, `vendor_rate_doc`, contract vs spot, surcharge / rate item, pricing contact (char), buy / sell / markup.

**Ship Happens–native concepts:** BCO RFP / bid sheet, projected rate overlay, layout drift across tender rounds, cell-compliant write-back into the original customer workbook.

### 4.1 Product Description
**Ship Happens** is an autonomous AI digital worker for **BCO annual tender workbooks**. It ingests raw BCO bid sheets, maps columns and lanes to Starboard schema concepts via LLMs, fills rates from Starboard contract/spot search plus forwarder **projected rate overlays**, runs human-in-the-loop review, and exports cell-compliant Excel into the original BCO template.

### 4.2 Core Functional Modules

**Built in Ship Happens (competition differentiator)**
1. **BCO Tender Ingestion Engine**: Native parsing of complex BCO `.xlsx` / `.csv` files from portals or upload (email add-in intake is stretch).
2. **BCO Semantic Schema Mapper**: Maps non-standard customer column headers, port aliases (Yantian ↔ Shekou, Ho Chi Minh ↔ Cai Mep), equipment sizes, and surcharge slots onto Starboard lane / rate-item concepts.
3. **Projected Overlay & Margin Layer**: Applies user-defined projected rates (~75% of early-round reliance) and floor-margin guardrails on top of Starboard buy rates.
4. **Multi-Round Layout Drift Memory** *(post-competition / out of October MVP)*: Retains pricing logic across rounds 1–6 despite row/column reshuffles.
5. **Cell-Compliant Excel Exporter**: Writes rates into designated response cells while preserving locks, dropdowns, and formulas.

**Consumed from Starboard (do not reimplement)**
1. **Contract & spot rate search** across modes (ocean FCL/LCL, air, drayage, cartage).
2. **Vendor rate document store** after FCLv6 (or prior FCL) ingest of carrier/vendor sheets.
3. **CRM** companies, vendors, and pricing contacts.
4. **Outlook / Gmail** surfaces for email-native workflows (stretch for competition demo).

### 4.3 Scope Boundaries (What Ship Happens DOES NOT Do)
* **Does NOT replace Starboard**: Not a new rate database, CRM, quote system, or email client.
* **Does NOT reimplement FCLv6**: Vendor/carrier rate-sheet ingest stays in Starboard; Ship Happens may call or reuse that agentic pipeline.
* **Does NOT take legal/commercial risk decisions**: Final rate sign-off remains with human pricing directors.
* **Does NOT replace the TMS**: CargoWise, CargoEZ, or SAP TM remain systems of record for execution; Starboard remains the rate/CRM layer.
* **Does NOT bypass portal authentication**: Operates on exported/imported files; does not break platform security protocols.
* **Does NOT guarantee carrier capacity**: Manages rate compliance and routing rules, not physical vessel space allocation.

---

## 5. Market Analysis & Ecosystem Positioning

### 5.1 Market Ecosystem Mapping
* **Starboard (platform)**: System of record for vendor rate ingest (incl. FCLv6), contract/spot search, multi-lane quotes, CRM, and Outlook/Gmail RFQs. Does **not** productize annual BCO tender workbook completion. Ship Happens is the dedicated worker for that gap.
* **Digital Forwarders (e.g., Flexport)**: Execute freight directly; Ship Happens + Starboard arm *independent* forwarders with superior tech to beat them on service and speed.
* **Marketplaces & eBooking (e.g., Freightos, WebCargo, cargobase)**: Focus on spot eBooking and rate distribution; do not solve back-office BCO annual tender sheet completion.
* **Rate Management Systems (e.g., Freightify, CargoEZ, Magaya)**: Function as internal rate libraries; still require manual re-keying into BCO bid sheets.
* **AI Carrier Rate Quoters (e.g., Wisor.ai, FreightMynd)**: Automate reading *carrier* rate sheets for spot requests; do not handle 100-column BCO customer bid sheets or projected rate modeling.

---

## 6. Strategic Targets & Goals

| Metric Category | Baseline (Manual) | Target (Ship Happens) | Business Impact |
| :--- | :--- | :--- | :--- |
| **Response Time** | 24 – 48 Hours | **< 20 Minutes** | First-responder advantage; higher win rates |
| **Gross Margin Recovery** | Standard / Eroded | **+3% to +5%** | Eliminates pricing errors & selects optimal rates |
| **Analyst Bid Capacity** | 3–4 RFPs / Day | **12+ RFPs / Day (3x)** | Enables participation in more annual tenders |
| **Format Compliance** | High Error Risk | **100% Cell-Compliant** | Zero portal upload rejections |

---

## 7. Requirements Specification

### 7.1 Functional Requirements (FR)

* **FR-1: BCO File Ingestion & Formatting Preservation**
  * Support BCO tender `.xlsx`, `.xls`, and `.csv` files up to 100,000 rows and 150 columns.
  * Maintain absolute integrity of background Excel structures: macros, locked sheets, formulas, and data validation rules.
  * Distinguish BCO bid sheets (Ship Happens) from vendor/carrier rate sheets (Starboard / FCLv6).

* **FR-2: BCO LLM Semantic Schema Alignment**
  * Automatically identify and normalize BCO columns into Starboard-aligned concepts:
    * Origin & Destination port aliases (e.g., Shanghai, Ningbo, Yantian, Long Beach, Los Angeles).
    * Surcharge / rate-item fields (Base Ocean Freight, BAF, GRI, PSS, LSS, ISPS, Documentation).
    * Equipment types (20' GP, 40' GP, 40' HC, 45' HC, Reefer).
  * Handle non-standard column header phrasing without fixed cell coordinate rules.
  * Vendor sheet → Starboard schema remains **FCLv6**; do not duplicate that agent in Ship Happens.

* **FR-3: Starboard Rate Lookup + Projected Overlays**
  * Query Starboard for contract buy rates (`vendor_rate_doc` / rate search) and spot recommendations.
  * Support multi-mode lookup where relevant (ocean FCL primary for MVP; LCL/air/drayage/cartage via Starboard as available).
  * Support user-defined **Projected Rate Overlays** (~75% reliance in Round 1).
  * Automatically enforce floor-rate guardrails (e.g., Minimum Margin = +$150/FEU or 5% gross margin).
  * Do **not** build parallel scrapers or a second rate database inside Ship Happens.

* **FR-4: Operational Routing Constraints & Filters**
  * Filter carrier vessel options based on customer-specified constraints:
    * Direct sailings vs. Transshipment routes.
    * Maximum acceptable transit times.
    * Specific container/document cutoff days.
  * Prefer Starboard rate/search metadata where available; Ship Happens applies BCO-template constraints on top.

* **FR-5: Multi-Round Layout Drift Memory** *(post-October MVP)*
  * Assign unique internal lane IDs based on origin-destination-equipment tuples (aligned with Starboard lane concepts).
  * Retain pricing history across Rounds 1 through 6, mapping prior rate decisions even when BCO templates reshuffle rows and columns.

* **FR-6: Cell-Compliant Excel Export**
  * Write generated rates strictly into designated response cells in the original BCO template.
  * Automatically adapt output formatting (e.g., number decimal precision, uppercase vs. abbreviated day names) to match BCO sheet validation rules.

* **FR-7: Human-in-the-Loop Review Dashboard**
  * Flag low-confidence schema matches (<90% confidence) or margin exception breaches for human review prior to export.
  * Provide auditability per row: Starboard buy-rate source (`vendor_rate_doc` / spot), projected overlay (if any), and markup / sell logic.

* **FR-8: Starboard CRM Context** *(light touch for MVP)*
  * Associate tenders with Starboard customer companies and pricing contacts where authenticated integration exists.

### 7.2 Non-Functional Requirements (NFR)

* **NFR-1: Performance & Latency**
  * Process standard 500-line RFP sheet mapping/fill pipeline in **< 30 seconds** of automated engine time (end-to-end analyst turnaround target remains **< 20 minutes** including review).
  * Parallel execution support for multi-tab workbooks.

* **NFR-2: Data Security & Governance**
  * Enterprise SOC 2 Type II compliance (align with Starboard org controls where Ship Happens is co-deployed).
  * Air-gapped execution environment; strictly zero training of third-party LLMs on proprietary forwarder rate sheets.
  * Role-Based Access Control (RBAC) separating sales, pricing, and admin users—prefer Starboard identity/org where integrated.

* **NFR-3: Reliability & Availability**
  * **99.9% uptime** during peak Trans-Pacific RFP season (December 1 – May 15).

* **NFR-4: Integration Architecture**
  * **Primary**: Starboard Public API / handshake-backed webapp APIs for rate search, quotes, CRM (companies/contacts), and optional FCLv6 trigger; MCP (`sb-mcp`) when available.
  * **Secondary / later**: TMS platforms (CargoWise, CargoEZ) and external CRM (Salesforce) as needed beyond competition MVP.

---

## 8. Competitive Analysis Grid

| Capability / Feature (Y-Axis) | **Ship Happens** | **Wisor.ai** | **Freightify** | **CargoEZ** | **Freightos / WebCargo** |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **1. Unstructured BCO RFP Sheet Ingestion** | **10** | 6 | 4 | 5 | 4 |
| **2. Semantic Schema Alignment (LLMs)** | **10** | 7 | 3 | 3 | 5 |
| **3. Projected Rate Modeling (~75% Reliance)** | **10** | 3 | 2 | 2 | 2 |
| **4. Multi-Round Layout Drift Memory** | **10** | 2 | 2 | 1 | 2 |
| **5. Operational Routing Filter (Direct vs. Transship)** | **9** | 6 | 5 | 6 | 5 |
| **6. Cell-Compliant Excel Export Engine** | **10** | 5 | 4 | 4 | 4 |
| **7. Native Starboard Rate/CRM Leverage** | **10** | 1 | 2 | 2 | 1 |

---

## 9. Key Performance Indicators (KPIs) & Success Metrics

### 9.1 Operational KPIs
* **Average Time per RFP Response**: Target < 20 minutes (vs. 24–48 hours baseline).
* **Schema Mapping Accuracy**: Target > 98% first-pass accuracy on non-standard BCO templates.
* **Layout Re-alignment Success Rate**: Target 100% accurate row/column matching across multiple rounds *(post-MVP)*.
* **Starboard Rate Hit Rate**: Target high % of bid lines filled from Starboard contract/spot before falling back to projected-only.

### 9.2 Financial & Commercial KPIs
* **Gross Margin Recovery**: Target +3% to +5% improvement in quoted gross margin.
* **Bid Volume Capacity**: Target 3x increase in total RFPs processed per analyst.
* **RFP Win Rate Lift**: Target +20% increase in awarded lanes due to first-mover submission advantage.
* **Customer Retention Rate**: Target > 95% annual subscription renewal among forwarder clients.

---

## 10. Product Release Roadmap

Competition project: ship an MVP across **4 weeks in October**, using Starboard as the rate/CRM/email resource. Enterprise features (multi-round layout drift memory, deep TMS integrations, full audit/analytics) are out of scope for this sprint.

```
Week 1 (Oct): Foundations, Starboard Wire-Up & BCO Ingestion
├── App shell, auth, and workspace basics
├── Starboard env / handshake (read-only rate + CRM smoke)
├── BCO Unstructured Ingestion (.xlsx / .csv)
└── File upload → parse → preview flow

Week 2 (Oct): BCO Schema Mapping
├── LLM Semantic Mapping of BCO columns → Starboard lane / equipment / surcharge concepts
├── Low-confidence match flagging for human review
├── Mapped column / lane preview in UI
└── Optional: seed demo contract rates via Starboard FCLv6 (do not rebuild ingest)

Week 3 (Oct): Rates from Starboard + Projected Overlays
├── Contract + spot lookup via Starboard rate search
├── Projected Rate Overlays + floor-margin guardrails
└── Per-row audit trail (Starboard source + overlay + markup)

Week 4 (Oct): Export & Demo Hardening
├── Cell-Compliant Excel Export into original BCO templates
├── Human-in-the-loop review before download
├── End-to-end demo polish and competition submission
└── Stretch: Outlook/Gmail intake via Starboard add-in surfaces
```
