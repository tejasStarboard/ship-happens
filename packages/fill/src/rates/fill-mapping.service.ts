import { DomainError } from "../errors"
import type { FillPipelineManager } from "../pipeline/fill-pipeline.manager"
import type { RfpRepository } from "../rfp/rfp.repository"
import type { FillMappingRepository } from "./fill-mapping.repository"
import {
  parseMappingDocument,
  type MappedLane,
  type MappingDocument,
} from "./mapped-lane"

export type ReplaceMappedLanesResult = {
  fillId: string
  laneCount: number
  importedFromFile?: boolean
}

export class FillMappingService {
  constructor(
    private readonly rfps: RfpRepository,
    private readonly mappings: FillMappingRepository,
    private readonly pipeline?: FillPipelineManager
  ) {}

  async list(
    organizationId: string,
    fillId: string
  ): Promise<{ fillId: string; version: 1; lanes: MappedLane[] }> {
    await this.requireFill(organizationId, fillId)
    const lanes = await this.mappings.listByRfpId(fillId)
    return { fillId, version: 1, lanes }
  }

  async replace(
    organizationId: string,
    fillId: string,
    lanes: MappedLane[]
  ): Promise<ReplaceMappedLanesResult> {
    await this.requireFill(organizationId, fillId)
    const { laneCount } = await this.mappings.replaceAll({
      rfpId: fillId,
      organizationId,
      lanes,
    })
    await this.markMapConfirmed(fillId, laneCount)
    return { fillId, laneCount }
  }

  /**
   * Merge lanes by `laneId` into the confirmed store (HITL Confirm / Map edit).
   */
  async upsertLanes(
    organizationId: string,
    fillId: string,
    lanes: MappedLane[],
    options?: { confirmMap?: boolean }
  ): Promise<ReplaceMappedLanesResult> {
    if (lanes.length === 0) {
      return this.replace(organizationId, fillId, [])
    }
    await this.requireFill(organizationId, fillId)
    const existing = await this.mappings.listByRfpId(fillId)
    const byId = new Map(existing.map((lane) => [lane.laneId, lane]))
    for (const lane of lanes) {
      byId.set(lane.laneId, lane)
    }
    const merged = [...byId.values()]
    if (options?.confirmMap === false) {
      const { laneCount } = await this.mappings.replaceAll({
        rfpId: fillId,
        organizationId,
        lanes: merged,
      })
      return { fillId, laneCount }
    }
    return this.replace(organizationId, fillId, merged)
  }

  /** Confirm from a MappingDocument (`{ version?, lanes }`). */
  async replaceFromDocument(
    organizationId: string,
    fillId: string,
    document: unknown
  ): Promise<ReplaceMappedLanesResult> {
    const lanes = parseMappingDocument(document)
    return this.replace(organizationId, fillId, lanes)
  }

  async exportDocument(
    organizationId: string,
    fillId: string
  ): Promise<MappingDocument & { fillId: string }> {
    const listed = await this.list(organizationId, fillId)
    return {
      fillId: listed.fillId,
      version: listed.version,
      lanes: listed.lanes,
    }
  }

  private async markMapConfirmed(fillId: string, laneCount: number) {
    if (!this.pipeline) return
    const detail =
      laneCount === 0
        ? "Mapping cleared"
        : `Confirmed ${laneCount} lane${laneCount === 1 ? "" : "s"}`
    try {
      await this.pipeline.completeStep(fillId, "map", detail)
    } catch {
      // Open map reviews keep the step held; still record the confirm detail.
      await this.pipeline.updateStep(fillId, "map", "running", detail)
      await this.pipeline.appendLog({
        rfpId: fillId,
        stepKey: "map",
        source: "mapping",
        message: detail,
      })
    }
  }

  private async requireFill(organizationId: string, fillId: string) {
    const fill = await this.rfps.findByIdForOrganization(organizationId, fillId)
    if (!fill) {
      throw new DomainError(`Fill not found: ${fillId}`, "NOT_FOUND")
    }
    return fill
  }
}
