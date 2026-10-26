import {
  DomainError,
  type LogLevel,
  type CreateReviewItemInput,
  type UpdateReviewItemInput,
} from "@ship-happens/fill"
import { createAppContext } from "@/lib/di/create-app-context"
import { assertFillAccess, type ShApiKeyContext } from "@/lib/auth/sh-api-key"

const LOG_LEVELS = new Set(["debug", "info", "warn", "error"])

function asLogLevel(value: string | null): LogLevel | undefined {
  if (!value) return undefined
  if (!LOG_LEVELS.has(value)) {
    throw new DomainError(`Invalid log level: ${value}`, "VALIDATION")
  }
  return value as LogLevel
}

export async function getFillStatus(ctx: ShApiKeyContext, fillId: string) {
  assertFillAccess(ctx, fillId)
  const app = createAppContext()
  const fill = await app.repos.rfps.findByIdForOrganization(
    ctx.organizationId,
    fillId
  )
  if (!fill) {
    throw new DomainError(`Fill not found: ${fillId}`, "NOT_FOUND")
  }
  return {
    id: fill.id,
    organizationId: fill.organizationId,
    name: fill.name,
    customer: fill.customer,
    status: fill.status,
    errorMessage: fill.errorMessage,
    startedAt: fill.startedAt,
    completedAt: fill.completedAt,
    createdAt: fill.createdAt,
    updatedAt: fill.updatedAt,
  }
}

export async function getFillProgress(ctx: ShApiKeyContext, fillId: string) {
  assertFillAccess(ctx, fillId)
  const app = createAppContext()
  const fill = await app.repos.rfps.findByIdForOrganization(
    ctx.organizationId,
    fillId
  )
  if (!fill) {
    throw new DomainError(`Fill not found: ${fillId}`, "NOT_FOUND")
  }
  const [steps, pending] = await Promise.all([
    app.pipeline.listSteps(fillId),
    app.reviews.list(ctx.organizationId, fillId, { status: "pending" }),
  ])
  const blockedKeys = new Set(
    pending
      .map((item) => item.stepKey)
      .filter((key): key is string => key != null && key.length > 0)
  )
  return {
    fillId,
    steps: steps.map((step) => ({
      ...step,
      blockedByReview: blockedKeys.has(step.key),
    })),
  }
}

export async function getFillLogs(
  ctx: ShApiKeyContext,
  fillId: string,
  options?: { limit?: number; level?: string | null }
) {
  assertFillAccess(ctx, fillId)
  const app = createAppContext()
  const fill = await app.repos.rfps.findByIdForOrganization(
    ctx.organizationId,
    fillId
  )
  if (!fill) {
    throw new DomainError(`Fill not found: ${fillId}`, "NOT_FOUND")
  }
  const logs = await app.pipeline.listLogs(fillId, {
    limit: options?.limit,
    level: asLogLevel(options?.level ?? null),
  })
  return { fillId, logs }
}

export async function listReviews(
  ctx: ShApiKeyContext,
  fillId: string,
  options?: { status?: string }
) {
  assertFillAccess(ctx, fillId)
  const app = createAppContext()
  const items = await app.reviews.list(ctx.organizationId, fillId, options)
  return { fillId, items }
}

export async function getReview(
  ctx: ShApiKeyContext,
  fillId: string,
  reviewId: string
) {
  assertFillAccess(ctx, fillId)
  const app = createAppContext()
  return app.reviews.get(ctx.organizationId, fillId, reviewId)
}

export async function createReview(
  ctx: ShApiKeyContext,
  fillId: string,
  body: CreateReviewItemInput
) {
  assertFillAccess(ctx, fillId)
  const app = createAppContext()
  return app.reviews.create(ctx.organizationId, fillId, body)
}

export async function updateReview(
  ctx: ShApiKeyContext,
  fillId: string,
  reviewId: string,
  body: UpdateReviewItemInput
) {
  assertFillAccess(ctx, fillId)
  const app = createAppContext()
  return app.reviews.update(ctx.organizationId, fillId, reviewId, body)
}

export async function resolveReview(
  ctx: ShApiKeyContext,
  fillId: string,
  reviewId: string,
  body?: { resolution?: Record<string, unknown> }
) {
  assertFillAccess(ctx, fillId)
  const app = createAppContext()
  return app.reviews.resolve(ctx.organizationId, fillId, reviewId, body)
}

/** Resolve mapped lanes via Starboard, apply overlays, advance Progress. */
export async function resolveFillRates(ctx: ShApiKeyContext, fillId: string) {
  assertFillAccess(ctx, fillId)
  const app = createAppContext()
  const result = await app.rates.resolveMappedLanes({
    organizationId: ctx.organizationId,
    fillId,
  })
  const overlay = await app.overlays.applyForFill({
    organizationId: ctx.organizationId,
    fillId,
  })
  return {
    fillId: result.fillId,
    hitCount: result.hitCount,
    noHitCount: result.noHitCount,
    errorCount: result.errorCount,
    detail: result.detail,
    overlay: {
      appliedCount: overlay.appliedCount,
      unchangedCount: overlay.unchangedCount,
      floorBreachCount: overlay.floorBreachCount,
      detail: overlay.detail,
    },
    cells: overlay.cells.map((cell) => ({
      outcome: cell.outcome,
      value: cell.value ?? null,
      reason: cell.reason ?? null,
      columnKey: cell.columnKey ?? null,
      rowIndex: cell.rowIndex ?? null,
      sheetName: cell.sheetName ?? null,
      metadata: cell.metadata ?? {},
    })),
  }
}
