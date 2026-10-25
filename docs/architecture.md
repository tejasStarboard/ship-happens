# Ship Happens architecture

Production layering for `apps/web` (Next.js + eve + Better Auth + Drizzle) plus shared packages for a second runtime.

## Packages

| Package | Role |
| --- | --- |
| [`@workspace/db`](../packages/db) | Drizzle schema + `createDb()` — tsup → `dist/` |
| [`@ship-happens/fill`](../packages/fill) | Intake + fill pipeline — tsup → `dist/`; inject blob/workspace ports. Client UI: `@ship-happens/fill/browser` only |
| `@starboard/sb-client` | Starboard Public API + CLI |
| `@workspace/ui` | Design system primitives only |

```ts
import { createDb } from "@workspace/db"
import { FillPipelineManager, IntakeService, RfpRepository } from "@ship-happens/fill"

const { db, pool } = createDb(process.env.POSTGRES_URL!)
// wire BlobStore + WorkspaceHost for your host (Next, worker, CLI)
```

Migrations stay at repo root (`drizzle.config.ts` → `packages/db` schema → `./migrations`).

## Layers (apps/web)

| Layer | Location | Owns |
| --- | --- | --- |
| **Adapters** | `app/api/*`, `lib/server/actions/*`, eve hooks | HTTP / `"use server"` / agent events only |
| **Service** | `@ship-happens/fill` + `lib/domain/*` | Use-cases, invariants, DTO mapping |
| **Manager** | fill pipeline / workspace manager | Cross-cutting lifecycle |
| **Repository** | fill RFP repo + `lib/domain/templates` | Drizzle queries, org-scoped `where` |
| **Infra** | `@workspace/db`, `lib/storage`, `lib/workspace-fs.ts` | Postgres, Blob, host FS |

## Dependency injection

```ts
import { createAppContext } from "@/lib/di/create-app-context"

const ctx = createAppContext()
await ctx.intake.createFill(orgId, userId, data)
```

Tests pass fakes: `createAppContext({ db: fakeDb, blob: fakeBlob, workspace: fakeHost })`.

## Auth rules

1. Prefer `requireOrgSession()` / `requireOrgWorkspaceAccess(workspaceId)` from `@/lib/auth/session`.
2. Every org data read/write filters by `organizationId` in SQL (or `assertOrgOwnsWorkspace`).
3. Routes map `DomainError` via `jsonDomainError` — do not blanket `catch { 401 }`.

## Fill pipeline

`FillPipelineManager` (`@ship-happens/fill`) is the **sole writer** of `rfps.status`, `rfp_progress_steps`, and `rfp_logs`.

Agent entry: `@/lib/domain/pipeline/agent-pipeline` (skill `fill-pipeline`).

## Workspace chats

Source of truth: `rfp_chats` (multiple rows per RFP). Session bind stores `{ eveSessionId }` in `agent_session` for indexed lookup. Legacy `metadata.workspaceChats` is migrated on read and cleared on write.

## New domain checklist

1. Prefer putting portable logic in `@ship-happens/fill` or `@workspace/db`
2. App-only UI/adapters stay in `apps/web`
3. Wire through `createAppContext`
4. Thin action/route adapter
5. Unit test for authorize / pure helpers

## Schema note (unused tables)

`rfp_fill_reports`, `rfp_fill_report_cells`, and `rfp_messages` / votes are defined but not yet written by product flows. Implement via domain modules when needed — do not invent a second progress writer.
