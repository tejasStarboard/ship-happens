import { randomBytes } from "node:crypto"
import { DomainError } from "../errors"
import {
  EXPORT_SIGNOFF_REVIEW_SOURCE,
  EXPORT_SIGNOFF_TITLE,
} from "../export/export-signoff"
import {
  isProgressStepKey,
  PROGRESS_WAIT_DETAIL,
  type FillPipelineManager,
  type ProgressStepKey,
  type RfpRunStatus,
} from "../pipeline/fill-pipeline.manager"
import type { RfpRepository } from "../rfp/rfp.repository"
import { ReviewItemRepository } from "./review-item.repository"
import {
  RESOLVABLE_REVIEW_STATUSES,
  REVIEW_ITEM_STATUSES,
  type CreateReviewItemInput,
  type DecideReviewItemInput,
  type NormalizedDecidePatch,
  type ReviewItemStatus,
  type ReviewItemView,
  type UpdateReviewItemInput,
} from "./review-item.types"

function reviewId() {
  return `rev_${randomBytes(10).toString("hex")}`
}

function asConfidence(
  value: string | number | null | undefined
): string | null {
  if (value == null) return null
  return String(value)
}

function toView(row: {
  id: string
  rfpId: string
  organizationId: string
  stepKey: string | null
  title: string
  status: ReviewItemStatus
  proposal: Record<string, unknown>
  confidence: string | null
  source: string | null
  sourceMetadata: Record<string, unknown> | null
  decidedByUserId: string | null
  decidedAt: Date | null
  decisionNote: string | null
  resolution: Record<string, unknown> | null
  createdAt: Date
  updatedAt: Date
}): ReviewItemView {
  return {
    id: row.id,
    rfpId: row.rfpId,
    organizationId: row.organizationId,
    stepKey: row.stepKey,
    title: row.title,
    status: row.status,
    proposal: row.proposal ?? {},
    confidence: row.confidence,
    source: row.source,
    sourceMetadata: row.sourceMetadata,
    decidedByUserId: row.decidedByUserId,
    decidedAt: row.decidedAt,
    decisionNote: row.decisionNote,
    resolution: row.resolution,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function isReviewStatus(value: string): value is ReviewItemStatus {
  return (REVIEW_ITEM_STATUSES as readonly string[]).includes(value)
}

function isResolvable(status: ReviewItemStatus): boolean {
  return (RESOLVABLE_REVIEW_STATUSES as readonly string[]).includes(status)
}

const TERMINAL_FILL_STATUSES = new Set<RfpRunStatus>([
  "done",
  "failed",
  "cancelled",
])

/**
 * Validate and normalize a human Confirm / Edit / Reject payload.
 * Exported for unit tests without a DB.
 */
export function normalizeDecideInput(
  input: DecideReviewItemInput
): NormalizedDecidePatch {
  if (input.decision === "approved") {
    return { status: "approved", decisionNote: null }
  }
  if (input.decision === "edited") {
    const resolution = input.resolution
    if (
      resolution == null ||
      typeof resolution !== "object" ||
      Array.isArray(resolution) ||
      Object.keys(resolution).length === 0
    ) {
      throw new DomainError(
        "edited decision requires a non-empty resolution object",
        "VALIDATION"
      )
    }
    return { status: "edited", decisionNote: null, resolution }
  }
  if (input.decision === "rejected") {
    const decisionNote = input.decisionNote?.trim() ?? ""
    if (!decisionNote) {
      throw new DomainError(
        "rejected decision requires a non-empty decisionNote",
        "VALIDATION"
      )
    }
    return { status: "rejected", decisionNote }
  }
  throw new DomainError("Invalid decision", "VALIDATION")
}

/**
 * HITL review-item domain. Agent creates/lists/updates pending proposals and
 * resolves after Edit/Reject. Humans Confirm / Edit / Reject via UI; Confirm
 * auto-resolves (no agent ack). See REVIEW_ITEM_STATUSES transition docs.
 *
 * Open waits (`pending`) force Progress hold: fill → `needs_review`, and a
 * known `stepKey` stays `running` with wait detail until pending clears.
 */
export class ReviewItemService {
  constructor(
    private readonly repo: ReviewItemRepository,
    private readonly rfps: RfpRepository,
    private readonly pipeline: FillPipelineManager
  ) {}

  private async requireFill(organizationId: string, fillId: string) {
    const fill = await this.rfps.findByIdForOrganization(organizationId, fillId)
    if (!fill) {
      throw new DomainError(`Fill not found: ${fillId}`, "NOT_FOUND")
    }
    return fill
  }

  private asPipelineStep(
    stepKey: string | null | undefined
  ): ProgressStepKey | null {
    if (!stepKey) return null
    return isProgressStepKey(stepKey) ? stepKey : null
  }

  /**
   * Force hold while a pending wait exists.
   * Null / unknown stepKey → fill-level `needs_review` only (no invented step).
   */
  private async applyProgressHold(
    fillId: string,
    stepKey: string | null,
    fillStatus: string
  ) {
    if (!TERMINAL_FILL_STATUSES.has(fillStatus as RfpRunStatus)) {
      await this.pipeline.setRfpStatus(fillId, "needs_review")
    }

    const pipelineStep = this.asPipelineStep(stepKey)
    if (pipelineStep) {
      await this.pipeline.updateStep(
        fillId,
        pipelineStep,
        "running",
        PROGRESS_WAIT_DETAIL
      )
      await this.pipeline.appendLog({
        rfpId: fillId,
        stepKey: pipelineStep,
        message: `Open review wait on step: ${pipelineStep}`,
        source: "review",
      })
      return
    }

    await this.pipeline.appendLog({
      rfpId: fillId,
      stepKey: null,
      message: "Open review wait (no progress step)",
      source: "review",
    })
  }

  /**
   * After a pending wait leaves the inbox: unblock fill status if none remain;
   * clear step wait detail when that step has no pending waits left.
   * Does not auto-complete the step — agent owns `completeStep`.
   */
  private async releaseProgressHold(
    fillId: string,
    stepKey: string | null,
    fillStatus: string
  ) {
    const pendingLeft = await this.repo.countPending(fillId)
    if (pendingLeft === 0 && fillStatus === "needs_review") {
      await this.pipeline.setRfpStatus(fillId, "running")
    }

    const pipelineStep = this.asPipelineStep(stepKey)
    if (!pipelineStep) return

    const stepPending = await this.repo.countPending(fillId, {
      stepKey: pipelineStep,
    })
    if (stepPending > 0) return

    const steps = await this.pipeline.listSteps(fillId)
    const step = steps.find((row) => row.key === pipelineStep)
    if (step?.status === "running" && step.detail === PROGRESS_WAIT_DETAIL) {
      await this.pipeline.updateStep(
        fillId,
        pipelineStep,
        "running",
        "Review cleared — continue step"
      )
      await this.pipeline.appendLog({
        rfpId: fillId,
        stepKey: pipelineStep,
        message: `Review waits cleared for step: ${pipelineStep}`,
        source: "review",
      })
    }
  }

  async list(
    organizationId: string,
    fillId: string,
    options?: { status?: string }
  ): Promise<ReviewItemView[]> {
    await this.requireFill(organizationId, fillId)
    let status: ReviewItemStatus | undefined
    if (options?.status) {
      if (!isReviewStatus(options.status)) {
        throw new DomainError(
          `Invalid review status: ${options.status}`,
          "VALIDATION"
        )
      }
      status = options.status
    }
    const rows = await this.repo.listForFill(organizationId, fillId, { status })
    return rows.map(toView)
  }

  async get(
    organizationId: string,
    fillId: string,
    reviewId: string
  ): Promise<ReviewItemView> {
    await this.requireFill(organizationId, fillId)
    const row = await this.repo.findByIdForFill(
      organizationId,
      fillId,
      reviewId
    )
    if (!row) {
      throw new DomainError(`Review item not found: ${reviewId}`, "NOT_FOUND")
    }
    return toView(row)
  }

  async create(
    organizationId: string,
    fillId: string,
    input: CreateReviewItemInput
  ): Promise<ReviewItemView> {
    const fill = await this.requireFill(organizationId, fillId)
    const title = input.title?.trim()
    if (!title) {
      throw new DomainError("title is required", "VALIDATION")
    }

    const stepKey = input.stepKey ?? null
    const row = await this.repo.insert({
      id: reviewId(),
      rfpId: fillId,
      organizationId,
      stepKey,
      title,
      status: "pending",
      proposal: input.proposal ?? {},
      confidence: asConfidence(input.confidence),
      source: input.source ?? null,
      sourceMetadata: input.sourceMetadata ?? {},
      resolution: {},
    })

    await this.applyProgressHold(fillId, stepKey, fill.status)
    return toView(row)
  }

  async update(
    organizationId: string,
    fillId: string,
    reviewItemId: string,
    input: UpdateReviewItemInput
  ): Promise<ReviewItemView> {
    const fill = await this.requireFill(organizationId, fillId)
    const existing = await this.repo.findByIdForFill(
      organizationId,
      fillId,
      reviewItemId
    )
    if (!existing) {
      throw new DomainError(
        `Review item not found: ${reviewItemId}`,
        "NOT_FOUND"
      )
    }
    if (existing.status !== "pending") {
      throw new DomainError(
        `Cannot update review item in status "${existing.status}" (only pending)`,
        "VALIDATION"
      )
    }

    const patch: Parameters<ReviewItemRepository["updateById"]>[1] = {}
    if (input.title !== undefined) {
      const title = input.title.trim()
      if (!title) {
        throw new DomainError("title cannot be empty", "VALIDATION")
      }
      patch.title = title
    }
    if (input.stepKey !== undefined) patch.stepKey = input.stepKey
    if (input.proposal !== undefined) patch.proposal = input.proposal
    if (input.confidence !== undefined) {
      patch.confidence = asConfidence(input.confidence)
    }
    if (input.source !== undefined) patch.source = input.source
    if (input.sourceMetadata !== undefined) {
      patch.sourceMetadata = input.sourceMetadata
    }

    if (Object.keys(patch).length === 0) {
      throw new DomainError("No fields to update", "VALIDATION")
    }

    const updated = await this.repo.updateById(existing.id, patch)
    if (!updated) {
      throw new DomainError(
        `Review item not found: ${reviewItemId}`,
        "NOT_FOUND"
      )
    }

    if (input.stepKey !== undefined && input.stepKey !== existing.stepKey) {
      await this.releaseProgressHold(fillId, existing.stepKey, fill.status)
      await this.applyProgressHold(fillId, updated.stepKey, "needs_review")
    }

    return toView(updated)
  }

  async decide(
    organizationId: string,
    fillId: string,
    reviewItemId: string,
    input: DecideReviewItemInput,
    decidedByUserId: string
  ): Promise<ReviewItemView> {
    const fill = await this.requireFill(organizationId, fillId)
    const existing = await this.repo.findByIdForFill(
      organizationId,
      fillId,
      reviewItemId
    )
    if (!existing) {
      throw new DomainError(
        `Review item not found: ${reviewItemId}`,
        "NOT_FOUND"
      )
    }
    if (existing.status !== "pending") {
      throw new DomainError(
        `Cannot decide review item in status "${existing.status}" (only pending)`,
        "VALIDATION"
      )
    }
    if (!decidedByUserId?.trim()) {
      throw new DomainError("decidedByUserId is required", "VALIDATION")
    }

    const normalized = normalizeDecideInput(input)
    const isExportSignoff = existing.source === EXPORT_SIGNOFF_REVIEW_SOURCE
    // Confirm (approved) auto-resolves: no agent follow-up needed.
    // Edit/Reject stay intermediate until the agent acks via resolve().
    const patch: Parameters<ReviewItemRepository["updateById"]>[1] = {
      status: normalized.status === "approved" ? "resolved" : normalized.status,
      decidedByUserId,
      decidedAt: new Date(),
      decisionNote: normalized.decisionNote,
    }
    if (normalized.status === "approved") {
      // Confirm-only download unlock key for export-signoff (and clear marker).
      patch.resolution = { decision: "approved" }
    } else if (normalized.resolution !== undefined) {
      patch.resolution = normalized.resolution
    }

    const updated = await this.repo.updateById(existing.id, patch)
    if (!updated) {
      throw new DomainError(
        `Review item not found: ${reviewItemId}`,
        "NOT_FOUND"
      )
    }

    // Leaving `pending` clears the open wait — unblock Progress when appropriate.
    await this.releaseProgressHold(fillId, existing.stepKey, fill.status)

    if (isExportSignoff) {
      await this.applyExportSignoffDecision(
        organizationId,
        fillId,
        normalized.status,
        updated
      )
    }

    return toView(updated)
  }

  /**
   * Final export sign-off: Confirm completes export+review; Reject fails them
   * with the reason; Edit opens a fresh pending Confirm card so download can
   * still unlock after the analyst confirms.
   */
  private async applyExportSignoffDecision(
    organizationId: string,
    fillId: string,
    decision: "approved" | "edited" | "rejected",
    updated: {
      id: string
      decisionNote: string | null
      resolution: Record<string, unknown> | null
      proposal: Record<string, unknown>
    }
  ) {
    if (decision === "approved") {
      try {
        await this.pipeline.completeStep(
          fillId,
          "export",
          "Export signed off — download unlocked"
        )
      } catch {
        await this.pipeline.updateStep(
          fillId,
          "export",
          "done",
          "Export signed off — download unlocked"
        )
      }
      try {
        await this.pipeline.completeStep(
          fillId,
          "review",
          "Final export signed off"
        )
      } catch {
        await this.pipeline.updateStep(
          fillId,
          "review",
          "done",
          "Final export signed off"
        )
      }
      return
    }

    if (decision === "rejected") {
      const detail = updated.decisionNote?.trim()
        ? `Sign-off rejected: ${updated.decisionNote.trim()}`
        : "Sign-off rejected"
      await this.pipeline.updateStep(fillId, "export", "failed", detail)
      await this.pipeline.updateStep(fillId, "review", "failed", detail)
      await this.pipeline.setRfpStatus(fillId, "needs_review")
      await this.pipeline.appendLog({
        rfpId: fillId,
        stepKey: "export",
        source: "review",
        level: "warn",
        message: detail,
      })
      return
    }

    // Edit: open a new pending sign-off so Confirm remains available.
    await this.create(organizationId, fillId, {
      title: EXPORT_SIGNOFF_TITLE,
      stepKey: "export",
      source: EXPORT_SIGNOFF_REVIEW_SOURCE,
      proposal: {
        ...updated.proposal,
        kind: EXPORT_SIGNOFF_REVIEW_SOURCE,
        summary:
          "Export sign-off edited — Confirm when ready to unlock download.",
        priorReviewId: updated.id,
        editResolution: updated.resolution ?? {},
      },
      sourceMetadata: {
        kind: EXPORT_SIGNOFF_REVIEW_SOURCE,
        priorReviewId: updated.id,
      },
    })
    await this.pipeline.updateStep(
      fillId,
      "review",
      "running",
      PROGRESS_WAIT_DETAIL
    )
  }

  async resolve(
    organizationId: string,
    fillId: string,
    reviewItemId: string,
    options?: { resolution?: Record<string, unknown> }
  ): Promise<ReviewItemView> {
    await this.requireFill(organizationId, fillId)
    const existing = await this.repo.findByIdForFill(
      organizationId,
      fillId,
      reviewItemId
    )
    if (!existing) {
      throw new DomainError(
        `Review item not found: ${reviewItemId}`,
        "NOT_FOUND"
      )
    }
    if (existing.status === "resolved") {
      throw new DomainError("Review item is already resolved", "VALIDATION")
    }
    if (!isResolvable(existing.status)) {
      throw new DomainError(
        `Cannot resolve review item in status "${existing.status}" (requires approved, edited, or rejected)`,
        "VALIDATION"
      )
    }

    const resolution =
      options?.resolution !== undefined
        ? options.resolution
        : (existing.resolution ?? {})

    const updated = await this.repo.updateById(existing.id, {
      status: "resolved",
      resolution,
    })
    if (!updated) {
      throw new DomainError(
        `Review item not found: ${reviewItemId}`,
        "NOT_FOUND"
      )
    }
    return toView(updated)
  }
}
