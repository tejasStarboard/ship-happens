# Ship Happens

Customer-facing RFP sheet filler with an eve agent workspace for filling spreadsheets.

**Primary app:** `apps/web` — Next.js + eve + Better Auth (orgs) + Postgres/Drizzle + Redis.

## Prerequisites

| Tool | Version / notes |
| --- | --- |
| Node | **24+** for `apps/web` / eve (`apps/web/.nvmrc`). Root `engines` allow ≥20; use 24 locally. |
| pnpm | `10.33.4` (see root `packageManager`) |
| Docker | For Postgres + Redis via `docker-compose.yml` |
| Git | Clone from GitHub; default integration branch is `dev` |

## Agent quick setup

For AI agents (and humans) after cloning — run from the **repo root**, in order:

```bash
# 1. Env files (do not commit secrets)
cp .env.example .env
cp .env apps/web/.env.local
# Edit .env if needed — defaults match docker-compose host ports below.

# 2. Infra (non-default host ports — see table)
docker compose up -d
docker compose ps   # expect ship-happens-postgres :54325, ship-happens-redis :63799

# 3. Install + DB schema
pnpm install
pnpm db:push

# 4. Node 24 for the web app
cd apps/web && nvm use   # or: fnm use / asdf / volta — match .nvmrc
cd ../..

# 5. Dev server
pnpm --filter web dev    # → http://localhost:3000
```

**Verify**

```bash
# Ports must match compose (not GitHub Actions 5432/6379)
nc -z 127.0.0.1 54325 && echo postgres_ok
nc -z 127.0.0.1 63799 && echo redis_ok

# Optional Starboard smoke (needs STARBOARD_* filled in .env)
pnpm --filter @starboard/sb-client build
pnpm --filter web starboard:smoke-rates
```

Sign up → create/select org → RFPs. Open an RFP → **Agent** tab for the eve workspace (id = RFP id). Standalone workspace URL: `/w/{rfpId}`.

## Docker ports (local vs CI)

Local `docker-compose.yml` maps **non-default** host ports so they do not clash with other stacks:

| Service | Container | Host port | Local URL |
| --- | --- | --- | --- |
| Postgres | `ship-happens-postgres` | **54325** | `postgresql://postgres:postgres@localhost:54325/ship_happens` |
| Redis | `ship-happens-redis` | **63799** | `redis://localhost:63799` |

These values are already in `.env.example`. **Do not** point local tools at `localhost:5432` or `localhost:6379` — those are GitHub Actions `services:` ports only. Using them locally causes `ECONNREFUSED` even when compose is healthy.

## Environment

| File | Role |
| --- | --- |
| `.env.example` | Template — commit this |
| `.env` | Root secrets (copy from example) — gitignored |
| `apps/web/.env.local` | App copy (often same as `.env`) — gitignored |

`apps/web/env.ts` loads root `.env` then app-local overrides via dotenv.

**Minimum for `pnpm --filter web dev`:** `POSTGRES_URL`, `POSTGRES_SSL`, `REDIS_URL`, `BETTER_AUTH_SECRET` (≥32 chars), `BETTER_AUTH_DOMAIN`, `APP_URL`, `NEXT_PUBLIC_APP_URL`, email + blob placeholders (see `.env.example`).

**Starboard client** (rate search / CLI): `STARBOARD_APP_DOMAIN`, `STARBOARD_HANDSHAKE_KEY`, plus `SB_CLIENT_CLIENT_ID` + `SB_CLIENT_CLIENT_SECRET` (or `SB_CLIENT_COMPANY_ID` for local-only).

**Email intake (Integrations):** `JEV_API_KEY` (TypeSafe Jev). Gmail needs `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` plus `GMAIL_PUBSUB_TOPIC` (and a public HTTPS webhook at `/api/webhooks/gmail`). Outlook needs `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET` and Graph notifications to `/api/webhooks/outlook`. Fill-desk upload remains the default intake path.

## Stack

- Next.js App Router + eve (agent sandbox / chat)
- Better Auth (email/password, optional Google, organizations)
- Drizzle + Postgres
- `@starboard/sb-client` (`packages/sb-client` — library + CLI for Starboard Public API)
- Redis (session secondary storage)
- Vercel Blob + AI Gateway
- `@workspace/ui` (shadcn)

## Scripts

| Command | What |
| --- | --- |
| `pnpm --filter web dev` | Primary app on :3000 |
| `pnpm db:push` | Push Drizzle schema (from `apps/web/lib/db/schema`) |
| `pnpm db:studio` | Drizzle Studio |
| `pnpm format` / `pnpm format:check` | Prettier via turbo |
| `pnpm lint` | ESLint via turbo |
| `pnpm typecheck` | Typecheck via turbo |
| `pnpm build` | Production build (needs compose URLs in env) |
| `pnpm test:e2e` | Playwright against `apps/web` |
| `pnpm --filter web sb-client -- …` | Starboard CLI |
| `pnpm --filter web starboard:smoke-rates` | Read-only contract+spot smoke |
| `pnpm --filter @starboard/sb-client build` | Build CLI/library (`tsup` → `dist/`) |

## Local CI mirror

Before handing off a ticket PR, agents should run the same checks as GitHub’s required job (`format · lint · typecheck · build`). Full command list and env rules live in:

**`.agents/skills/development-workflow/SKILL.md`** (section 6)

Summary: keep `POSTGRES_URL` / `REDIS_URL` on **compose host ports** (`54325` / `63799`); never export Actions ports `5432` / `6379` on a laptop with `docker compose` running.

## Starboard client

Workspace package `@starboard/sb-client` (`packages/sb-client`). Details: [`packages/sb-client/README.md`](packages/sb-client/README.md).

```bash
pnpm --filter @starboard/sb-client build
pnpm --filter web sb-client -- auth test
pnpm --filter web starboard:smoke-rates
pnpm --filter web sb-client -- rates resolve --body '...'
```

Server code: `import { createStarboardClient } from "@/lib/starboard/client"`. Read-only rate search: `@/lib/starboard/rate-search`.

Local eve agent uses **microsandbox**: prepare installs Node, open injects `sb-client` onto PATH, and Starboard env is preloaded. Load skill `sb-client` in the agent for the CLI workflow.

## Development workflow (agents)

Default coding / Linear ticket / PR / promote-to-prod flow:

**`.agents/skills/development-workflow/SKILL.md`**

- Branch off `origin/dev` as `SB-XXXX` with `--no-track`
- PR into `dev`; promote to `main` only via cherry-pick deployment PRs
- Never push directly to `dev` or `main`

Ticket investigation details: `.agents/skills/ticket-resolution/SKILL.md`.

## Layout

```
apps/web                 # Primary Next.js + eve app
packages/db              # @workspace/db — Drizzle schema + createDb()
packages/fill            # @ship-happens/fill — intake + fill pipeline
packages/ui              # Shared UI kit
packages/sb-client       # Starboard Public API library + CLI
.agents/skills/          # Agent skills (development-workflow, etc.)
docker-compose.yml       # Postgres :54325 + Redis :63799
.env.example             # Env template aligned with compose ports
```

## Architecture

Shared packages: `@workspace/db`, `@ship-happens/fill`. App wiring + DI: `apps/web/lib/di`. See [`docs/architecture.md`](docs/architecture.md).
