# Design system — Ship Happens

<!-- Pilot house Operate world (v3, 2026-10-25). -->

## World

**Pilot house.** Calm cool-slate desk for long RFP sessions. Mint/teal phosphor used as a **signal** (selection, primary, filled cells) — not washed across the chrome. Soft radius, readable Figtree, no uppercase stencils, no COR-TEN orange, no cold trading-terminal gray.

## Type

- **UI / brand:** Figtree 400–700, slight negative tracking on titles
- **Figures:** JetBrains Mono via `.tabular`

## Colour

| Role | Light | Dark |
| --- | --- | --- |
| Ground | `#f4f6f8` | `#0b1220` |
| Card | `#ffffff` | `#111a2b` |
| Primary / signal | `#0d9488` | `#2dd4bf` |
| Muted | `#5b6b7c` | `#93a4b8` |

Tokens: [`packages/ui/src/styles/globals.css`](packages/ui/src/styles/globals.css).

## Shell

Shared `PageChrome`, empty/stub patterns, icon rail, theme via user menu + Preferences. Brand mark: slate tile + mint filled cell.
