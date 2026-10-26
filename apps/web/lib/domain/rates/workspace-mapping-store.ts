import {
  parseMappingJson,
  type MappedLane,
  type MappingStore,
} from "@ship-happens/fill"
import { readWorkspaceFile, workspaceFileExists } from "@/lib/workspace-fs"

/** Workspace-relative path until Phase 2c persists mapping in Postgres. */
export const FILL_MAPPING_RELATIVE_PATH = "mapping.json"

export function createWorkspaceMappingStore(): MappingStore {
  return {
    async readMappedLanes(fillId: string): Promise<MappedLane[]> {
      const exists = await workspaceFileExists(
        fillId,
        FILL_MAPPING_RELATIVE_PATH
      )
      if (!exists) return []

      const file = await readWorkspaceFile(fillId, FILL_MAPPING_RELATIVE_PATH)
      const text =
        file.encoding === "utf-8" ? file.content : file.content.toString("utf8")
      return parseMappingJson(text)
    },
  }
}
