import { randomBytes } from "node:crypto"
import { DomainError } from "../errors"
import type { RfpRepository } from "../rfp/rfp.repository"
import { ReviewItemRepository } from "./review-item.repository"
import {
  RESOLVABLE_REVIEW_STATUSES,
  REVIEW_ITEM_STATUSES,
  type CreateReviewItemInput,
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

/**
 * HITL review-item domain. Agent creates/lists/updates pending proposals and
 * resolves after a human decision. User approve/edit/reject is UI (SB-6659).
 */
export class ReviewItemService {
  constructor(
    private readonly repo: ReviewItemRepository,
    private readonly rfps: RfpRepository
  ) {}

  private async requireFill(organizationId: string, fillId: string) {
    const fill = await this.rfps.findByIdForOrganization(organizationId, fillId)
    if (!fill) {
      throw new DomainError(`Fill not found: ${fillId}`, "NOT_FOUND")
    }
    return fill
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
    await this.requireFill(organizationId, fillId)
    const title = input.title?.trim()
    if (!title) {
      throw new DomainError("title is required", "VALIDATION")
    }

    const row = await this.repo.insert({
      id: reviewId(),
      rfpId: fillId,
      organizationId,
      stepKey: input.stepKey ?? null,
      title,
      status: "pending",
      proposal: input.proposal ?? {},
      confidence: asConfidence(input.confidence),
      source: input.source ?? null,
      sourceMetadata: input.sourceMetadata ?? {},
      resolution: {},
    })
    return toView(row)
  }

  async update(
    organizationId: string,
    fillId: string,
    reviewItemId: string,
    input: UpdateReviewItemInput
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
    return toView(updated)
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
