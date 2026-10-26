import { DomainError } from "../errors"
import type { FillPipelineManager } from "../pipeline/fill-pipeline.manager"
import { isRfpBidOutcome, type RfpBidOutcome } from "./fill-bid-outcome"
import type { RfpRepository } from "./rfp.repository"

export type DecideFillBidOutcomeInput = {
  outcome: RfpBidOutcome
}

export type SetFillDueAtInput = {
  /** ISO date/datetime string, or null to clear. */
  dueAt: string | null
}

/**
 * Fill due date + commercial bid outcome (SB-7090).
 * Does not gate export/download.
 */
export class FillBidOutcomeService {
  constructor(
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

  async setDueAt(
    organizationId: string,
    fillId: string,
    input: SetFillDueAtInput
  ) {
    await this.requireFill(organizationId, fillId)

    let dueAt: Date | null = null
    if (input.dueAt != null) {
      const trimmed = input.dueAt.trim()
      if (!trimmed) {
        dueAt = null
      } else {
        const parsed = new Date(trimmed)
        if (Number.isNaN(parsed.getTime())) {
          throw new DomainError("dueAt must be a valid date", "VALIDATION")
        }
        dueAt = parsed
      }
    }

    await this.rfps.updateDueAt(fillId, dueAt)
    return { ok: true as const, dueAt: dueAt?.toISOString() ?? null }
  }

  async decide(
    organizationId: string,
    fillId: string,
    input: DecideFillBidOutcomeInput,
    actorUserId: string
  ) {
    await this.requireFill(organizationId, fillId)

    if (!isRfpBidOutcome(input.outcome)) {
      throw new DomainError("Invalid bid outcome", "VALIDATION")
    }

    const decidedAt = new Date()
    await this.rfps.updateBidOutcome(fillId, {
      bidOutcome: input.outcome,
      decidedAt,
      decidedByUserId: actorUserId,
    })

    await this.pipeline.appendPipelineEvent({
      rfpId: fillId,
      type: "outcome.decided",
      organizationId,
      payload: { outcome: input.outcome },
      occurredAt: decidedAt,
    })

    return {
      ok: true as const,
      bidOutcome: input.outcome,
      decidedAt: decidedAt.toISOString(),
    }
  }

  async clearOutcome(organizationId: string, fillId: string) {
    await this.requireFill(organizationId, fillId)
    await this.rfps.updateBidOutcome(fillId, {
      bidOutcome: null,
      decidedAt: null,
      decidedByUserId: null,
    })
    return { ok: true as const }
  }
}
