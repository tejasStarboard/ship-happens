# web (primary app)

Next.js + eve product app: auth marketing, sidebar, RFPs/templates/rates/settings,
with the eve agent workspace embedded in **RFP → Agent**.

## Setup

**Follow the monorepo root guide** — [README.md](../../README.md) (Agent quick setup).

That doc covers env files, Docker host ports (`54325` / `63799`), `pnpm install`, `db:push`, and Node 24. Do not use GitHub Actions ports `5432` / `6379` locally.

```bash
# From monorepo root (summary)
cp .env.example .env && cp .env apps/web/.env.local
docker compose up -d
pnpm install && pnpm db:push
cd apps/web && nvm use && cd ../..
pnpm --filter web dev   # http://localhost:3000
```

Unset OpenRouter Anthropic overrides when using Anthropic directly (`dev` script already runs `env -u ANTHROPIC_BASE_URL -u ANTHROPIC_AUTH_TOKEN`).

## Stack

- Next.js App Router + eve
- Better Auth (Postgres + org plugin + Redis secondary storage)
- Drizzle schema under `lib/db/schema` (owned by root `drizzle.config.ts`)
- Workspace files on disk: `.ship-happens/workspaces/{rfpId}` (local); `/tmp/.ship-happens/workspaces/{rfpId}` (Vercel)
- Chat metadata: `rfps.metadata.workspaceChats` + primary `rfp_chats` row
- Starboard: `@/lib/starboard/client`, `@/lib/starboard/rate-search`

## Key routes

| Path                                  | Purpose                                         |
| ------------------------------------- | ----------------------------------------------- |
| `/rfp`, `/rfp/[id]`                   | Product RFP UI; Agent tab embeds eve workspace  |
| `/w/[workspaceId]`                    | Standalone workspace IDE (workspaceId = rfp id) |
| `/templates`, `/rates`, `/settings/*` | Product surfaces (`/rates` = live Starboard)    |
| `/api/starboard/rates/search`         | Auth’d Rates page contract + spot search        |
| `/api/starboard/rates/smoke`          | Auth’d read-only rate search smoke              |

## E2E

```bash
pnpm --filter web test:e2e      # or pnpm test:e2e from repo root
pnpm --filter web test:e2e:ui
```

Requires Postgres + Redis (root README / compose ports) and `pnpm db:push`.

**Fast local runs:** keep the app up first, then run tests (Playwright reuses `:3000`):

```bash
pnpm --filter web dev   # terminal 1
pnpm test:e2e           # terminal 2 — skips cold Next boot
```

Without a running server, Playwright starts `next dev` itself (slow first compile).

## Deploy

```bash
pnpm --filter web deploy   # eve deploy
```
