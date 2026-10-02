# Ship Happens

Customer-facing RFP sheet filler. Current scaffold: **auth + org + dashboard + settings**.

## Stack

- TanStack Start (Vite) + React
- Better Auth (email/password, optional Google, organizations)
- Drizzle + Postgres
- Redis (session secondary storage)
- `@workspace/ui` (shadcn)

## Setup

```bash
# 1. Env
cp .env.example .env
cp .env apps/web/.env   # Vite loads from apps/web

# 2. Infra
docker compose up -d

# 3. Install + schema
pnpm install
pnpm db:push

# 4. Dev
pnpm --filter web dev
# → http://localhost:3000
```

Sign up → create/select org → dashboard. Google OAuth is optional (leave blank in `.env`).

## Scripts

| Command | What |
| --- | --- |
| `pnpm --filter web dev` | App on :3000 |
| `pnpm db:push` | Push Drizzle schema |
| `pnpm db:studio` | Drizzle Studio |
| `pnpm typecheck` | Typecheck via turbo |

## Layout

```
apps/web          # TanStack Start app
packages/ui       # Shared UI kit
project-one-dev/  # Reference only (Linear clone) — ignore for product work
```
