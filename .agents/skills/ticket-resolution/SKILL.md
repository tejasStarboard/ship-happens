---
name: ticket-resolution
description: >-
  End-to-end Linear ticket resolution: pull the ticket, investigate, propose a
  fix direction (with clarifying questions if needed), implement, and hand off
  QA plus commit/PR copy. For Ship Happens branching, PR titles, and
  dev→main promotion, follow the development-workflow skill (default). Use when
  resolving a Linear ticket or when the user asks to investigate/fix/implement
  a ticket.
---

# Ticket Resolution Workflow

Follow these steps in order. Do not skip ahead to implementation before the
investigation and fix-direction steps, unless the user explicitly says to
implement immediately.

**Ship Happens repo:** branching, PR naming (`feat|fix(SB-XXXX): …`), and
promoting `dev` → `main` are defined in
[development-workflow](../development-workflow/SKILL.md). Prefer that skill for
git/PR/deploy steps; use this skill for the investigate → plan → implement →
handoff loop.

## Progress checklist

```
- [ ] 1. Pull Linear ticket
- [ ] 2. Investigate
- [ ] 3. Fix direction (+ clarifying questions if needed)
- [ ] 4. Branch off `dev` as `SB-XXXX` (see development-workflow)
- [ ] 5. Implement
- [ ] 6. Run GitHub CI mirror (format · lint · typecheck · build)
- [ ] 7. Live QA instructions
- [ ] 8. Commit title, PR title, PR description
```

---

## 1. Pull the Linear ticket

1. Resolve the ticket id from the user (`SB-6652`, URL, or title search).
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

Follow **development-workflow** (`--no-track` so upstream is never `origin/dev`):

```bash
git fetch origin
git checkout --no-track -b SB-XXXX origin/dev
git status -sb   # must NOT show ...origin/dev
git push -u origin SB-XXXX   # first push only
```

Rules:

- Base is always `origin/dev`; branch name = Linear id (`SB-6652`).
- Never track `origin/dev` — protected; direct pushes to `dev` fail.
- If already on the correct branch with relevant work, reuse it.
- Never commit or open a PR unless the user asks.
- Production promotion (`DEPLOYMENT dev -> main: …`) is only in development-workflow.

---

## 5. Implement

- Stay inside the agreed in-scope work.
- Match existing patterns; use project skills when relevant.
- Keep diffs focused; no drive-by refactors or unsolicited markdown docs.
- Update Linear description only when the user asks to sync ticket text.

---

## 6. Run GitHub CI mirror

Follow **development-workflow §6** exactly (and root **README.md** for local
Docker ports `54325` / `63799`). From repo root run `pnpm format:check`,
`pnpm lint`, `pnpm typecheck`, and `pnpm build`. Do not hand off until they
pass. Never point local builds at CI ports `5432` / `6379`.

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

### Commit title / PR title / PR description

Use **development-workflow** templates:

- Dev PR: `feat(SB-XXXX): …` or `fix(SB-XXXX): …`
- Body: `## Summary` + `## Test plan` (checklist)
- Main promo: `DEPLOYMENT dev -> main: SB-XXXX SB-YYYY …`

---

## Hard rules

1. **Pull → investigate → plan** before coding (unless user skips to implement).
2. **Branch from `origin/dev`** as `SB-XXXX` (see development-workflow).
3. **Format/lint on changed files only**; **build the whole app**.
4. End with **live QA** + **commit/PR titles** + **PR description**.
5. Do not commit, push, or open a PR unless the user asks.
6. Do not push directly to `dev` or `main`.
