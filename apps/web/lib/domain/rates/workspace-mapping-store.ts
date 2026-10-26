import {
  parseMappingJson,
  type MappingFileReader,
  type MappingStore,
} from "@ship-happens/fill"
import { readWorkspaceFile, workspaceFileExists } from "@/lib/workspace-fs"

/** Workspace-relative path for mapping import/export (not the durable store). */
export const FILL_MAPPING_RELATIVE_PATH = "mapping.json"

/** Read-only file store — prefer Postgres via `createDbMappingStore`. */
export function createWorkspaceMappingStore(): MappingStore {
  return {
    async readMappedLanes(fillId: string) {
      const text = await readMappingJsonText(fillId)
      if (text == null) return []
      return parseMappingJson(text)
    },
  }
}

/** One-shot import helper for DB-backed MappingStore. */
export function createWorkspaceMappingFileReader(): MappingFileReader {
  return {
    readMappingJson: readMappingJsonText,
  }
}

async function readMappingJsonText(fillId: string): Promise<string | null> {
  const exists = await workspaceFileExists(fillId, FILL_MAPPING_RELATIVE_PATH)
  if (!exists) return null

  const file = await readWorkspaceFile(fillId, FILL_MAPPING_RELATIVE_PATH)
  return file.encoding === "utf-8"
    ? file.content
    : file.content.toString("utf8")
}
