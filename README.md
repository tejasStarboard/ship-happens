# Ship Happens

Customer-facing RFP sheet filler. Current scaffold: **auth + org + dashboard + settings**.

## Stack

- TanStack Start (Vite) + React (fullstack for now)
- Better Auth (email/password, optional Google, organizations)
- Drizzle + Postgres (+ `STARBOARD_DB_URL` for rate adapter)
- Redis (session secondary storage)
- Vercel Blob + AI Gateway
- **Inngest** (async jobs) + **E2B** (Python sandbox for Excel fillers)
- `@workspace/ui` (shadcn)

## Setup

```bash
# 1. Env
cp .env.example .env
cp .env apps/web/.env   # Vite loads from apps/web
# Fill E2B_API_KEY, AI_GATEWAY_API_KEY; Inngest keys optional locally

# 2. Infra
docker compose up -d

# 3. Install + schema
pnpm install
pnpm db:push

# 4. Dev (two terminals)
pnpm --filter web dev          # → http://localhost:3000
pnpm inngest:dev               # → http://localhost:8288  (syncs /api/inngest)
```

Sign up → create/select org → dashboard. Google OAuth is optional (leave blank in `.env`).

## Scripts

| Command | What |
| --- | --- |
| `pnpm --filter web dev` | App on :3000 |
| `pnpm inngest:dev` | Inngest Dev Server → `/api/inngest` |
| `pnpm db:push` | Push Drizzle schema |
| `pnpm db:studio` | Drizzle Studio |
| `pnpm typecheck` | Typecheck via turbo |
| `pnpm test:e2e` | Playwright e2e (headless) |
| `pnpm test:e2e:ui` | Playwright UI mode |

## E2E tests

Playwright lives in `apps/web/e2e`. Requires Postgres + Redis (same as local Docker).

```bash
docker compose up -d
pnpm db:push
pnpm test:e2e          # headless
pnpm test:e2e:ui       # interactive UI
```

Specs cover auth (sign-up / sign-in / org / logout), app navigation, settings, and mock RFP / rates / templates surfaces. CI runs the same suite against Postgres and Redis service containers.

## Layout

```
apps/web          # TanStack Start app
packages/ui       # Shared UI kit
project-one-dev/  # Reference only (Linear clone) — ignore for product work
```
