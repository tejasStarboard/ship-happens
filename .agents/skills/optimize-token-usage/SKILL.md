---
name: optimize-token-usage
description: >-
  Cut Cursor / agent token burn: lean context, progressive skill reads, capped
  tool output, no always-on AGENTS.md dumps. Use when usage spikes, requests
  exceed ~50k tokens, Auto/agent loops feel expensive, or the user mentions
  tokens, context bloat, or optimizing agent cost.
---

# Optimize token usage

Every agent turn pays for: system prompt + **always-applied rules** + skill
catalog + conversation + tool results. Cut the permanent tax first; then
behave lean during the turn.

## Diagnose (this repo)

```bash
# Always-applied landmines: Cursor injects every */AGENTS.md under skills
find .agents/skills -name 'AGENTS.md' -exec wc -c {} \;

# Prefer on-demand: SKILL.md + rules/*.md + reference/*
find .agents/skills -name 'compiled-full.md' -o -path '*/rules/*.md' | head
```

If any skill still has a large `AGENTS.md`, **move it** to
`reference/compiled-full.md` (do not leave `AGENTS.md` in the skill root).
Re-running skill installers may restore `AGENTS.md` — re-run:

```bash
.agents/skills/optimize-token-usage/scripts/neutralize-agents-md.sh
```

## Hard rules (agent behavior)

1. **Load one skill at a time.** Read `SKILL.md` only when the task matches
   its description. Never preload “just in case.”
2. **Progressive disclosure.** Open `rules/` or `reference/` files only for
   the specific rule you need — not the compiled full dump.
3. **Cap reads.** Prefer `Grep` / path-targeted search over reading whole
   packages. Use `Read` with `offset`/`limit` for large files. Default
   sample: ≤100–200 lines unless the task needs more.
4. **Cap tool dumps.** Redirect large stdout to a file; report path + shape
   (line count, keys). Never paste megabyte logs into chat.
5. **No exploratory thrash.** Batch independent tool calls. Stop discovery
   once the edit target is clear. Don’t re-read files you already have.
6. **Short replies.** Answer the ask; skip restating the task, dumping
   alternatives, or repeating skill bodies.
7. **Subagents sparingly.** Each spawn duplicates context. Prefer local
   tools unless the task truly needs isolation.
8. **New chat for new work.** Long threads re-send history every turn; start
   fresh when the topic changes.

## Skill authoring (keep installs cheap)

| Do | Don’t |
|----|--------|
| Short `SKILL.md` (<500 lines) + `rules/` or `reference/` | Giant root `AGENTS.md` (always injected) |
| Description = WHAT + WHEN triggers | Vague “helper” skills that always match |
| One concern per skill | Bundling React + RN + animations in one always-on doc |
| Link to detail files | Inline full encyclopedias in SKILL.md |

## User levers (outside the agent)

- Prefer **Ask** / scoped edits over long **Agent** loops for small questions.
- Disable unused skills; uninstall skill packs you rarely need.
- Avoid Auto + long-running agent loops on huge monorepos without a narrow ask.
- After `npx skills add` / skill updates, re-check for restored `AGENTS.md`.

## Related

- Eve RFP/xlsx sessions: `apps/web/agent/skills/token-efficiency/SKILL.md`
- Always-on lean defaults: `.cursor/rules/lean-agent-context.mdc`
