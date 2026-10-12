# web (primary app)

Next.js + eve product app: auth marketing, sidebar, RFPs/templates/rates/settings,
with the eve agent workspace embedded in **RFP → Agent**.

## Stack

- Next.js App Router + eve
- Better Auth (Postgres + org plugin + Redis secondary storage)
- Drizzle schema under `lib/db/schema` (owned by root `drizzle.config.ts`)
- Workspace files on disk: `.ship-happens/workspaces/{rfpId}` (local); `/tmp/.ship-happens/workspaces/{rfpId}` (Vercel)
- Chat metadata: `rfps.metadata.workspaceChats` + primary `rfp_chats` row

## Setup

```bash
# From monorepo root
cp .env.example .env
cp .env apps/web/.env.local
docker compose up -d
pnpm install
pnpm db:push

# Node 24+ required for eve
cd apps/web && nvm use
pnpm --filter web dev   # http://localhost:3000
```

Unset OpenRouter Anthropic overrides when using Anthropic directly (`dev` script already runs `env -u ANTHROPIC_BASE_URL -u ANTHROPIC_AUTH_TOKEN`).

## Key routes

| Path                                  | Purpose                                         |
| ------------------------------------- | ----------------------------------------------- |
| `/rfp`, `/rfp/[id]`                   | Product RFP UI; Agent tab embeds eve workspace  |
| `/w/[workspaceId]`                    | Standalone workspace IDE (workspaceId = rfp id) |
| `/templates`, `/rates`, `/settings/*` | Product surfaces (mock data parity)             |

## E2E

```bash
pnpm --filter web test:e2e      # or pnpm test:e2e from repo root
pnpm --filter web test:e2e:ui
```

Requires Postgres + Redis (see root README) and `pnpm db:push`.

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
