---
name: development-workflow
description: >-
  Default Ship Happens development workflow: local clone setup (Docker ports,
  env), plan and implement Linear tickets (SB-XXXX), branch off origin/dev, open
  PRs to dev, run CI, then promote to production via cherry-pick PRs onto main.
  Use for any feature, bug fix, setup, implementation, commit/PR copy,
  branching, merge, deploy, or promote-to-prod work in this repo unless the user
  names a different skill.
---

# Ship Happens development workflow

**This is the default workflow** for coding in this repository. Follow it for
Linear tickets, features, bugs, PRs, and production promotion.

## 0. Local setup (clone / new machine)

**Source of truth:** root [`README.md`](../../../README.md) → **Agent quick setup**.

Before any ticket work on a fresh clone:

1. Follow README setup (`cp .env.example`, `docker compose up -d`, `pnpm install`, `pnpm db:push`, Node 24, `pnpm --filter web dev`).
2. Confirm Docker host ports from `docker-compose.yml` / `.env.example`:
   - Postgres **`54325`** → `postgresql://postgres:postgres@127.0.0.1:54325/ship_happens`
   - Redis **`63799`** → `redis://127.0.0.1:63799`
3. Never use GitHub Actions ports `5432` / `6379` locally — that causes `ECONNREFUSED` while compose is healthy.

If the user asks only to “set up the repo,” stop after README verify steps succeed.

## Branch model

| Branch | Role | Vercel |
|--------|------|--------|
| `dev` | Integration / regular development | `ship-happens-dev` (preview/dev app) |
| `main` | User-facing production | `ship-happens` (prod) |

**Hard rules**

- Never commit or push directly to `dev` or `main` (GitHub rulesets require a PR).
- Never set a ticket branch’s upstream to `origin/dev`.
- One Linear ticket → one feature branch → one PR into `dev`.
- Production gets changes only by promoting already-merged `dev` commits onto `main`.

Required status check on both `dev` and `main` PRs: **`format · lint · typecheck · build`**.
CI also runs **e2e**; keep it green when possible. Rulesets block deletion and force-push
on `dev` / `main`.

---

## Progress checklist (per ticket)

```
- [ ] 0. Local setup if needed (README Agent quick setup; compose ports 54325/63799)
- [ ] 1. Pull Linear ticket (SB-XXXX)
- [ ] 2. Investigate codebase
- [ ] 3. Plan fix/feature (+ clarifying questions if needed)
- [ ] 4. Branch SB-XXXX off origin/dev
- [ ] 5. Implement
- [ ] 6. Run GitHub CI mirror (format · lint · typecheck · build) — must pass
- [ ] 7. Deliver live QA + commit title + PR title + PR description
- [ ] 8. Open PR → dev (only if user asks)
- [ ] 9. After merge to dev + green CI: promote to main when asked
```

---

## 1–3. Plan

1. Fetch the Linear issue (`SB-XXXX`). Restate the goal in 1–2 sentences.
2. Investigate with targeted reads/searches. Do not code yet.
3. Present a short plan: **in scope**, **out of scope**, **approach**, **risks**.
4. Ask clarifying questions when scope is ambiguous; wait on blockers.

If the user already said “implement X”, skip re-asking settled points.

**Domain layering:** portable DB/fill logic goes in `@workspace/db` / `@ship-happens/fill`. App adapters use Repository + Service (+ Manager) via `createAppContext()` (`apps/web/lib/di`). Thin `"use server"` / route adapters only. See `docs/architecture.md`. Never add god modules in `lib/server/actions` or unscoped `getServerSession` on data routes — use `requireOrgSession` / `requireOrgWorkspaceAccess`.

---

## 4. Branch off `dev`

**Critical:** the new branch must **not** track `origin/dev`. Git’s default
`branch.autoSetupMerge` often sets upstream to `origin/dev` when you branch from
that ref — then `git push` tries to push to protected `dev` and fails.

Always use `--no-track`:

```bash
git fetch origin
git checkout --no-track -b SB-XXXX origin/dev
```

Verify before coding:

```bash
git status -sb
# Expect: ## SB-XXXX   (no [origin/dev] tracking)
# Bad:     ## SB-XXXX...origin/dev
```

If tracking is wrong, fix it:

```bash
git branch --unset-upstream
```

- Branch name is exactly the ticket id: `SB-6652` (not `feat/SB-6652`).
- If the branch already exists locally with the ticket work, reuse it.
- First push sets upstream to the **ticket** remote branch only:

```bash
git push -u origin SB-XXXX
# Never: git push origin HEAD:dev
```

---

## 5. Implement

- Stay in ticket scope; match repo patterns; prefer existing skills (shadcn, auth, etc.).
- No drive-by refactors or unsolicited docs.
- Do not commit / push / open a PR unless the user asks.

### `packages/sb-client` (and Starboard API wiring)

When changing `@starboard/sb-client`, rate search/resolve, margins, globals,
locations, Public API auth, or any Ship Happens code that calls Starboard:

1. Treat **starboard-2** as the source of truth for endpoints, payloads, and
   product behavior — do not invent request/response shapes from memory.
2. Local clone (sibling of this repo):

   `/Users/sanskrutibadnore/Desktop/Starboard/starboard-2`

3. Before implementing: search that tree for the matching route/controller,
   serializer, and any FI / quote-view isolation rules that must **not** leak
   into RFP fill pricing.
4. Align env with Starboard **dev** (`STARBOARD_APP_DOMAIN`, handshake,
   Public API client id/secret) per `packages/sb-client/README.md`.

---

## 6. Run GitHub CI mirror (required before handoff)

After implementation, **run the same commands as the required CI job**
`format · lint · typecheck · build` in `.github/workflows/ci.yml`. Do **not**
hand off commit/PR copy until these pass locally.

Ports and env defaults: **root README** (Docker ports + Agent quick setup).  
Compose must be up. Prefer existing `.env` / `.env.local`. Only stub missing
non-DB secrets. **Never** export Actions `5432` / `6379` over compose URLs.

```bash
# From repo root — ensure compose URLs (README), then:
docker compose up -d

# Unset stale CI-port exports if a prior shell forced 5432/6379
unset POSTGRES_URL REDIS_URL 2>/dev/null || true
# Load .env if present; otherwise fall back to compose host ports from README
set -a && [ -f .env ] && . ./.env; set +a
export POSTGRES_SSL="${POSTGRES_SSL:-false}"
export POSTGRES_URL="${POSTGRES_URL:-postgresql://postgres:postgres@127.0.0.1:54325/ship_happens}"
export REDIS_URL="${REDIS_URL:-redis://127.0.0.1:63799}"
export BETTER_AUTH_SECRET="${BETTER_AUTH_SECRET:-ci-better-auth-secret-min-32-characters-long}"
export BETTER_AUTH_DOMAIN="${BETTER_AUTH_DOMAIN:-localhost}"
export APP_URL="${APP_URL:-http://127.0.0.1:3000}"
export NEXT_PUBLIC_APP_URL="${NEXT_PUBLIC_APP_URL:-http://127.0.0.1:3000}"
export RESEND_API_KEY="${RESEND_API_KEY:-re_ci_placeholder}"
export EMAIL_SENDER_NAME="${EMAIL_SENDER_NAME:-Ship Happens CI}"
export EMAIL_SENDER_ADDRESS="${EMAIL_SENDER_ADDRESS:-noreply@example.com}"
export BLOB_STORE_ID="${BLOB_STORE_ID:-local}"
export BLOB_READ_WRITE_TOKEN="${BLOB_READ_WRITE_TOKEN:-vercel_blob_local_placeholder}"

# Reject accidental CI ports (common agent mistake)
case "$REDIS_URL" in *://127.0.0.1:6379|*://localhost:6379)
  echo "Refuse: REDIS_URL uses CI port 6379; use 63799 (see README)" >&2; exit 1 ;;
esac
case "$POSTGRES_URL" in *://127.0.0.1:5432*|*://localhost:5432*)
  echo "Refuse: POSTGRES_URL uses CI port 5432; use 54325 (see README)" >&2; exit 1 ;;
esac

pnpm format          # optional autofix (CI only runs format:check)
pnpm format:check
pnpm lint
pnpm typecheck
pnpm build
```

GitHub Actions still uses `127.0.0.1:5432` / `:6379` via workflow `services:` —
correct **in CI only**.

| Step | Command | CI job |
|------|---------|--------|
| Format | `pnpm format:check` | required |
| Lint | `pnpm lint` | required |
| Typecheck | `pnpm typecheck` | required |
| Build | `pnpm build` | required |
| e2e | `pnpm test:e2e` (needs Postgres + Redis + `pnpm db:push`) | runs in CI; run when UI/auth/flows touched |

**Rules**

- Fix all failures before presenting QA / commit / PR copy.
- Prefer full-repo turbo scripts above (what CI runs), not “changed files only.”
- If new required env vars were added, update `.github/workflows/ci.yml` stub `env` too **and** `.env.example` / root README.
- Local Redis/Postgres must use compose ports (`63799` / `54325`); see README.

---

## 7. Handoff artifacts (always at end of implementation)

Produce all four — do not open the PR unless asked:

1. **Commit title**
2. **PR title** (same shape as commit; may be slightly more descriptive)
3. **PR description** (template below)
4. **Live QA instructions** for a local instance (`pnpm --filter web dev` / app URL)

### Commit / PR title → `dev`

```
feat(SB-XXXX): <short imperative summary>
fix(SB-XXXX): <short imperative summary>
```

Use `feat` or `fix` (or `chore` only when neither fits). No brackets around the type.

### PR description → `dev`

```markdown
## Summary
- <1–3 bullets: what landed and why>

## Test plan
- [ ] <live QA step against local instance>
- [ ] <edge case / regression>
- [ ] CI: format · lint · typecheck · build green
```

### Live QA

Numbered steps: setup if needed, happy path, important edges, anything that will not work yet.

---

## 8. PR into `dev`

```bash
git push -u origin SB-XXXX
gh pr create --base dev --head SB-XXXX \
  --title "feat(SB-XXXX): …" \
  --body "$(cat <<'EOF'
## Summary
- …

## Test plan
- [ ] …
EOF
)"
```

Wait for CI. Merge only after required checks pass (and user asks / approves merge).

After merge, `dev` deploys to **ship-happens-dev**.

---

## 9. Promote to production (`main`)

Only after the ticket’s PR is merged into `dev` and CI on `dev` is green.

1. Identify the merge commit(s) on `dev` to promote (one or more tickets).
2. Branch from `main` (reuse historical name when batching):

```bash
git fetch origin
git checkout -b promote/dev-to-main origin/main
# Do NOT set upstream to origin/main as the tracking intent for work;
# push -u origin promote/dev-to-main when ready.
git cherry-pick <dev-merge-commit-sha>…   # or range of commits being promoted
git push -u origin promote/dev-to-main
```

3. Open PR **into `main`**:

**Title**

```
DEPLOYMENT dev -> main: SB-XXXX SB-YYYY SB-ZZZZ
```

List every ticket id included in the cherry-pick, space-separated.

**Description**

```markdown
## Summary
- Promote <SB-XXXX …> from `dev` to production (`main`)
- <one line on user-visible impact>

## Test plan
- [ ] CI green on this PR (`format · lint · typecheck · build`)
- [ ] Smoke on `ship-happens` Production after deploy
- [ ] <ticket-specific prod checks>
```

4. Merge only after required checks pass. Production = **ship-happens** on Vercel.

---

## Quick reference

| Action | Do |
|--------|----|
| Fresh clone / setup | Root `README.md` → Agent quick setup |
| Local DB/Redis ports | Postgres `54325`, Redis `63799` (never CI `5432`/`6379`) |
| sb-client / Starboard APIs | Read sibling `/Users/sanskrutibadnore/Desktop/Starboard/starboard-2` first |
| Start ticket | `git checkout --no-track -b SB-XXXX origin/dev` |
| Upstream | Ticket branch → `origin/SB-XXXX` only (never `origin/dev`) |
| Land on staging/dev app | PR → `dev` → title `feat\|fix(SB-XXXX): …` |
| Land on prod | Cherry-pick onto branch from `main` → PR → `main` → title `DEPLOYMENT dev -> main: SB-…` |
| Commit/PR without ask | Never |

## Related

- **Local setup / ports / env:** root [`README.md`](../../../README.md) (canonical for agents cloning the repo).
- **Starboard API / sb-client:** sibling repo
  `/Users/sanskrutibadnore/Desktop/Starboard/starboard-2` — read that codebase
  when implementing or debugging `@starboard/sb-client` (see §5). Package docs:
  [`packages/sb-client/README.md`](../../../packages/sb-client/README.md).
- Ticket investigation loop: `ticket-resolution` — **branch naming, PR titles, and deployment follow this skill**.
- CI: `.github/workflows/ci.yml`
- Linear tickets for this product use ids like `SB-6652`.
- Compose: `docker-compose.yml` · Env template: `.env.example`
