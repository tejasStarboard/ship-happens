# Ship Happens

Customer-facing RFP sheet filler with an eve agent workspace for filling spreadsheets.

## Primary app

**`apps/web`** — Next.js + eve + Better Auth (orgs) + Postgres/Drizzle + Redis.

## Stack

- Next.js App Router + eve (agent sandbox / chat)
- Better Auth (email/password, optional Google, organizations)
- Drizzle + Postgres
- `@starboard/sb-client` (`packages/sb-client` — library + CLI for Starboard Public API)
- Redis (session secondary storage)
- Vercel Blob + AI Gateway
- `@workspace/ui` (shadcn)

## Setup

```bash
# 1. Env
cp .env.example .env
cp .env apps/web/.env.local
# Fill AI Gateway / Anthropic as needed

# 2. Infra
docker compose up -d

# 3. Install + schema
pnpm install
pnpm db:push

# 4. Dev (Node 24+ for eve)
cd apps/web && nvm use   # if using .nvmrc
pnpm --filter web dev    # → http://localhost:3000
```

Sign up → create/select org → RFPs. Open an RFP → **Agent** tab for the eve workspace (id = RFP id). Standalone workspace URL: `/w/{rfpId}`.

## Scripts

| Command | What |
| --- | --- |
| `pnpm --filter web dev` | Primary app on :3000 |
| `pnpm db:push` | Push Drizzle schema (from `apps/web/lib/db/schema`) |
| `pnpm db:studio` | Drizzle Studio |
| `pnpm typecheck` | Typecheck via turbo |
| `pnpm test:e2e` | Playwright against `apps/web` |
| `pnpm --filter web sb-client -- auth test` | Starboard CLI |
| `pnpm --filter @starboard/sb-client build` | Build CLI/library (`tsup` → `dist/`) |

## Starboard client

Workspace package `@starboard/sb-client` (`packages/sb-client`).

```bash
pnpm --filter @starboard/sb-client build
pnpm --filter web sb-client -- auth test
pnpm --filter web sb-client -- rates resolve --body '...'
```

Local eve agent uses **microsandbox**: prepare installs Node, open injects `sb-client` onto PATH, and Starboard env is preloaded. Load skill `sb-client` in the agent for the CLI workflow.

Server code: `import { createStarboardClient } from "@/lib/starboard/client"`.

Env (see `.env.example`): `STARBOARD_APP_DOMAIN`, `STARBOARD_HANDSHAKE_KEY`, `SB_CLIENT_CLIENT_ID` + `SB_CLIENT_CLIENT_SECRET` (or `SB_CLIENT_COMPANY_ID` for local-only).

## Layout

```
apps/web              # Primary Next.js + eve app
packages/ui           # Shared UI kit
packages/sb-client    # Starboard Public API library + CLI
```
