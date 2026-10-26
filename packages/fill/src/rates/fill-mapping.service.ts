import { DomainError } from "../errors"
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
    private readonly mappings: FillMappingRepository
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
    return { fillId, laneCount }
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

  private async requireFill(organizationId: string, fillId: string) {
    const fill = await this.rfps.findByIdForOrganization(organizationId, fillId)
    if (!fill) {
      throw new DomainError(`Fill not found: ${fillId}`, "NOT_FOUND")
    }
    return fill
  }
}
