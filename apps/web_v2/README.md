# web_v2

Next.js + [eve](https://eve.dev) agent app with Better Auth (email/password) and a local SQLite database. Mirrors the `eve-nextjs` starter inside this monorepo.

## Prerequisites

- Node.js 24+ (eve requires it; see `.nvmrc`)
- Anthropic API key (or other model credentials as required by your eve setup)

## Setup

From the monorepo root:

```bash
pnpm install
cp apps/web_v2/.env.example apps/web_v2/.env.local
# Set BETTER_AUTH_SECRET (openssl rand -base64 32) and BETTER_AUTH_URL
pnpm --filter web_v2 db:migrate
```

## Develop

```bash
cd apps/web_v2 && nvm use   # Node 24+
pnpm --filter web_v2 dev
```

Starts Next.js (port **3001**) with the eve agent via `withEve()`. Open [http://localhost:3001](http://localhost:3001), sign up at `/sign-up`, then chat at `/s`.

The `dev` script unsets `ANTHROPIC_BASE_URL` / `ANTHROPIC_AUTH_TOKEN` so a global OpenRouter proxy does not override `.env.local` (that combo 404s on `/api/messages`).

Agent-only REPL:

```bash
pnpm --filter web_v2 dev:eve
```

## Project layout

| Path | Purpose |
| --- | --- |
| `agent/` | eve agent (instructions, model, channel auth) |
| `app/` | Next.js Web Chat UI and auth pages |
| `lib/auth.ts` | Better Auth config (SQLite + email/password) |
| `lib/eve-auth.ts` | Maps Better Auth sessions to eve channel principals |
| `data/sqlite.db` | Local SQLite database (created by migrate) |

## Auth flow

1. Users sign up / sign in through Better Auth at `/api/auth/*`.
2. Next.js pages and `proxy.ts` require a session cookie for chat routes.
3. `agent/channels/eve.ts` verifies the same cookie and attaches a user principal before agent turns run.

## Deploy

Local SQLite is for development. For production, switch Better Auth to a hosted database before deploying.

```bash
pnpm --filter web_v2 deploy
```
