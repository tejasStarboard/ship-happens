import type { FillMappingRepository } from "./fill-mapping.repository"
import { parseMappingJson, type MappedLane } from "./mapped-lane"
import type { MappingStore, MappingFileReader } from "./rate-ports"

/**
 * Postgres-backed MappingStore. Optionally one-shot imports workspace
 * `mapping.json` when the DB has no lanes for the fill.
 */
export function createDbMappingStore(
  mappings: FillMappingRepository,
  fileReader?: MappingFileReader
): MappingStore {
  return {
    async readMappedLanes(fillId: string): Promise<MappedLane[]> {
      const existing = await mappings.listByRfpId(fillId)
      if (existing.length > 0) return existing

      if (!fileReader) return []

      const text = await fileReader.readMappingJson(fillId)
      if (text == null || text.trim().length === 0) return []

      const lanes = parseMappingJson(text)
      if (lanes.length === 0) return []

      const organizationId = await mappings.getOrganizationIdForRfp(fillId)
      if (!organizationId) return lanes

      await mappings.replaceAll({ rfpId: fillId, organizationId, lanes })
      return lanes
    },

    async replaceMappedLanes(
      fillId: string,
      organizationId: string,
      lanes: MappedLane[]
    ): Promise<void> {
      await mappings.replaceAll({ rfpId: fillId, organizationId, lanes })
    },
  }
}
