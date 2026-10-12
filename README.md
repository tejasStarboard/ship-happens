# Ship Happens

Customer-facing RFP sheet filler with an eve agent workspace for filling spreadsheets.

## Primary app

**`apps/web`** — Next.js + eve + Better Auth (orgs) + Postgres/Drizzle + Redis.

## Stack

- Next.js App Router + eve (agent sandbox / chat)
- Better Auth (email/password, optional Google, organizations)
- Drizzle + Postgres (+ `SANDBOX_STARBOARD_DB_URL` for rate adapter)
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

## Layout

```
apps/web          # Primary Next.js + eve app
packages/ui       # Shared UI kit
```
