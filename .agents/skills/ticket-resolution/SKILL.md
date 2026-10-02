---
name: ticket-resolution
description: >-
  End-to-end Linear ticket resolution: pull the ticket, investigate, propose a
  fix direction (with clarifying questions if needed), branch off dev, implement,
  run CI-like checks, then deliver live QA steps plus commit/PR titles and
  description. Use when resolving a Linear ticket, working TC-XXX / ENG-XXX
  issues, or when the user asks to investigate/fix/implement a ticket.
---

# Ticket Resolution Workflow

Follow these steps in order. Do not skip ahead to implementation before the
investigation and fix-direction steps, unless the user explicitly says to
implement immediately.

## Progress checklist

```
- [ ] 1. Pull Linear ticket
- [ ] 2. Investigate
- [ ] 3. Fix direction (+ clarifying questions if needed)
- [ ] 4. Branch off `dev` as `TC-XXX` (or ticket id)
- [ ] 5. Implement
- [ ] 6. CI-like local checks
- [ ] 7. Live QA instructions
- [ ] 8. Commit title, PR title, PR description
```

---

## 1. Pull the Linear ticket

1. Resolve the ticket id from the user (`TC-27`, URL, or title search).
2. Fetch via Linear MCP (`get_issue` / `list_issues`). Read:
   - title, description, status, priority, assignee
   - acceptance criteria / comments that change scope
3. Restate the ticket goal in one or two sentences before digging into code.

If the ticket cannot be found, stop and ask for the id or URL.

---

## 2. Investigate

1. Map the ticket to code: routes, components, libs, env, CI.
2. Prefer targeted search/read over broad exploration.
3. Note risks: auth, data model, env/CI secrets, breaking UX.
4. Load any matching project skills (auth, shadcn, storage, etc.) before editing.

Do **not** start coding in this step.

---

## 3. Fix direction (clarify before building)

Present a short plan:

- **In scope** — what this ticket will change
- **Out of scope** — related work you will not do
- **Approach** — concrete files/APIs/UX direction
- **Risks / unknowns**

Ask clarifying questions when scope, product behavior, or trade-offs are
ambiguous. Wait for eng answers on blocking questions before implementing.

If the user already gave a clear “implement X” instruction, proceed without
re-asking settled points.

---

## 4. Branch off `dev`

Before writing code:

```bash
git fetch origin
git checkout dev
git pull origin dev
git checkout -b TC-XXX   # or: git checkout TC-XXX if it already exists
```

Rules:

- Base branch is always `dev`.
- Branch name = ticket id (e.g. `TC-27`).
- If already on the correct branch with relevant work, keep it; do not recreate.
- Never commit or open a PR unless the user asks.

---

## 5. Implement

- Stay inside the agreed in-scope work.
- Match existing patterns; use project skills when relevant.
- Keep diffs focused; no drive-by refactors or unsolicited markdown docs.
- Update Linear description only when the user asks to sync ticket text.

---

## 6. CI-like local checks

Mirror `.github/workflows/ci.yml`. After implementation:

### Format + lint — **changed files only**

From the package that owns the edits (usually `apps/web`):

```bash
# Format write, then check, on changed paths only
pnpm exec prettier --write <changed.ts/tsx...>
pnpm exec prettier --check <changed.ts/tsx...>

# Lint changed paths only
pnpm exec eslint <changed.ts/tsx...>
```

Also run typecheck for that package when TS APIs changed:

```bash
pnpm --filter web typecheck
# or from apps/web: pnpm typecheck
```

### Build — **entire app**

```bash
# From repo root; supply CI-like placeholder env (extend if new required env vars were added)
pnpm build
```

Use the same placeholder env pattern as the CI Build job. If this ticket added
required env vars, include placeholders locally **and** note that CI workflow
env must be updated.

Fix failures before presenting QA / commit copy.

---

## 7. Live QA instructions

Give a concise, ordered checklist an engineer can run against a local or
preview deploy. Include:

- Setup (env, restart, seed data) when needed
- Happy paths for each in-scope change
- Important edge cases / regressions
- Explicit “won’t work yet” notes (e.g. old data after a storage mode change)

Prefer numbered steps over prose.

---

## 8. Commit title, PR title, PR description

Produce these at the end (do not commit/push/create PR unless asked).

### Commit title

```
fix/feat/chore(TC-XXX): <message>
```

- Choose `fix` | `feat` | `chore` from the change type.
- Use the real ticket id.
- Message: short, imperative, focuses on why/what shipped.
- Do **not** wrap the type in brackets (wrong: `[feat](TC-27): …`).

Examples:

```
feat(TC-27): Redesign auth UI, org logos, and profile settings
fix(TC-31): Prevent sidebar org mark blue bleed behind logos
chore(TC-40): Add Blob env placeholders to CI build
```

### PR title

Same shape as the commit title (can be slightly more descriptive):

```
feat(TC-27): Auth UI redesign, public org logos, sidebar & profile polish
```

### PR description template

```markdown
## Summary
- <1–3 bullets of what landed and why>

## What changed
- <concrete user/dev-facing changes; group by area if helpful>

## In scope
- <ticket work included in this PR>

## Out of scope
- <related items intentionally not done, or "None">

## Test plan
- [ ] <live QA step>
- [ ] <live QA step>
- [ ] CI: format / lint / typecheck / build green
```

---

## Hard rules

1. **Pull → investigate → plan** before coding (unless user skips to implement).
2. **Branch from `dev`**, named like the ticket id.
3. **Format/lint on changed files only**; **build the whole app**.
4. End with **live QA** + **commit/PR titles** + **PR description** (summary, what changed, in/out of scope, test plan).
5. Do not commit, push, or open a PR unless the user asks.
