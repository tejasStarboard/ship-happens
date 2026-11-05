import { DomainError } from "../errors"
import type { FillPipelineManager } from "../pipeline/fill-pipeline.manager"
import { isRfpStatus, type RfpStatus } from "./rfp.types"
import type { RfpRepository } from "./rfp.repository"

export type UpdateFillIdentityInput = {
  name?: string
  customer?: string | null
}

/**
 * Desk-facing fill mutations: rename, customer, manual pipeline status.
 * Delete stays on the host workspace manager (DB cascade + sandbox FS).
 */
export class FillDeskOpsService {
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

  async updateIdentity(
    organizationId: string,
    fillId: string,
    input: UpdateFillIdentityInput
  ) {
    await this.requireFill(organizationId, fillId)

    if (input.name !== undefined) {
      const name = input.name.trim()
      if (!name) {
        throw new DomainError("Name is required", "VALIDATION")
      }
      if (name.length > 200) {
        throw new DomainError("Name is too long", "VALIDATION")
      }
    }

    if (input.name === undefined && input.customer === undefined) {
      throw new DomainError("Nothing to update", "VALIDATION")
    }

    await this.rfps.updateIdentity(fillId, {
      name: input.name,
      customer: input.customer,
    })

    const next = await this.requireFill(organizationId, fillId)
    return {
      ok: true as const,
      name: next.name,
      customer: next.customer ?? null,
    }
  }

  async setStatus(
    organizationId: string,
    fillId: string,
    status: string,
    actorUserId: string
  ) {
    await this.requireFill(organizationId, fillId)

    if (!isRfpStatus(status)) {
      throw new DomainError("Invalid status", "VALIDATION")
    }

    await this.pipeline.setRfpStatus(fillId, status)
    await this.pipeline.appendLog({
      rfpId: fillId,
      message: `Status set to ${status} by desk`,
      source: "desk",
      metadata: { actorUserId, status },
    })

    return { ok: true as const, status: status as RfpStatus }
  }
}
