import {
  DomainError,
  parseMappingJson,
  toFillReportCellView,
  type LogLevel,
  type CreateReviewItemInput,
  type UpdateReviewItemInput,
} from "@ship-happens/fill"
import { createAppContext } from "@/lib/di/create-app-context"
import { assertFillAccess, type ShApiKeyContext } from "@/lib/auth/sh-api-key"
import { createWorkspaceMappingFileReader } from "@/lib/domain/rates/workspace-mapping-store"

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

/** Per-row fill-report cells with Starboard + overlay + markup audit. */
export async function getFillCells(
  ctx: ShApiKeyContext,
  fillId: string,
  options?: { laneId?: string | null }
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
  const report = await app.repos.fillReports.getReport(fillId)
  if (!report) {
    return {
      fillId,
      summary: null,
      filledCount: 0,
      skippedCount: 0,
      needsHumanCount: 0,
      errorCount: 0,
      cells: [] as ReturnType<typeof toFillReportCellView>[],
    }
  }
  let cells = report.cells.map(toFillReportCellView)
  const laneId = options?.laneId?.trim()
  if (laneId) {
    cells = cells.filter((cell) => cell.audit.laneId === laneId)
  }
  return {
    fillId,
    summary: report.summary,
    filledCount: report.filledCount,
    skippedCount: report.skippedCount,
    needsHumanCount: report.needsHumanCount,
    errorCount: report.errorCount,
    cells,
  }
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

/** List confirmed mapped lanes (Postgres). */
export async function getFillMapping(ctx: ShApiKeyContext, fillId: string) {
  assertFillAccess(ctx, fillId)
  const app = createAppContext()
  return app.mapping.exportDocument(ctx.organizationId, fillId)
}

/**
 * Replace confirmed mapped lanes from a MappingDocument body
 * (`{ version?, lanes }`) or raw `{ lanes }`.
 */
export async function putFillMapping(
  ctx: ShApiKeyContext,
  fillId: string,
  body: unknown
) {
  assertFillAccess(ctx, fillId)
  const app = createAppContext()
  return app.mapping.replaceFromDocument(ctx.organizationId, fillId, body)
}

/**
 * One-shot import: if body provided, persist it; otherwise import workspace
 * `mapping.json` when present.
 */
function isMappingDocumentBody(body: unknown): boolean {
  return (
    body != null &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    "lanes" in body
  )
}

export async function importFillMapping(
  ctx: ShApiKeyContext,
  fillId: string,
  body?: unknown
) {
  assertFillAccess(ctx, fillId)
  const app = createAppContext()
  if (isMappingDocumentBody(body)) {
    const result = await app.mapping.replaceFromDocument(
      ctx.organizationId,
      fillId,
      body
    )
    return { ...result, importedFromFile: false }
  }

  const text = await createWorkspaceMappingFileReader().readMappingJson(fillId)
  if (text == null) {
    throw new DomainError(
      "No mapping.json in workspace and no body provided",
      "VALIDATION"
    )
  }
  const lanes = parseMappingJson(text)
  const result = await app.mapping.replace(ctx.organizationId, fillId, lanes)
  return { ...result, importedFromFile: true }
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
    weakPickCount: result.weakPickCount,
    detail: result.detail,
    overlay: {
      appliedCount: overlay.appliedCount,
      unchangedCount: overlay.unchangedCount,
      floorBreachCount: overlay.floorBreachCount,
      weakPickCount: overlay.weakPickCount,
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

/** Write sell values into the original BCO template via agent-xlsx. */
export async function exportFillWorkbook(ctx: ShApiKeyContext, fillId: string) {
  assertFillAccess(ctx, fillId)
  const app = createAppContext()
  return app.exportWorkbook.exportForFill({
    organizationId: ctx.organizationId,
    fillId,
  })
}
