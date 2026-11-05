import { eq } from "drizzle-orm"
import path from "node:path"
import { db } from "@/lib/db"
import { rfpSourceFiles, rfps } from "@/lib/db/schema"
import {
  extensionForMime,
  sanitizeFileName,
} from "@/lib/storage/spreadsheet-constants"
import { readWorkspaceFile } from "@/lib/workspace-fs"

const FILLED_META_NAME = "meta.json"

type FilledExportMeta = {
  filledFileUrl?: unknown
}

function parseFilledMeta(raw: string): string | null {
  try {
    const parsed = JSON.parse(raw) as FilledExportMeta
    return typeof parsed.filledFileUrl === "string" &&
      parsed.filledFileUrl.length > 0
      ? parsed.filledFileUrl
      : null
  } catch {
    return null
  }
}

async function resolveFilledPublicUrl(
  workspaceId: string,
  normalized: string
): Promise<string | null> {
  const dir = path.posix.dirname(normalized)
  // Versioned runs: filled/<runId>/workbook.xlsx + sibling meta.json
  if (dir !== "filled" && dir.startsWith("filled/")) {
    try {
      const meta = await readWorkspaceFile(
        workspaceId,
        `${dir}/${FILLED_META_NAME}`
      )
      const raw =
        meta.encoding === "utf-8"
          ? meta.content
          : Buffer.from(meta.content).toString("utf8")
      const url = parseFilledMeta(raw)
      if (url) return url
    } catch {
      // fall through to latest-artifact match
    }
  }

  // Legacy flat filled/<name>: map to the current RFP filled artifact.
  if (dir === "filled") {
    const [row] = await db
      .select({ filledFileUrl: rfps.filledFileUrl })
      .from(rfps)
      .where(eq(rfps.id, workspaceId))
      .limit(1)
    return row?.filledFileUrl ?? null
  }

  return null
}

/**
 * Resolve a durable public Blob URL for a workspace-relative path when it
 * maps to an intake source or filled export (needed for Office Online embeds).
 */
export async function resolveWorkspacePublicFileUrl(
  workspaceId: string,
  relativePath: string
): Promise<string | null> {
  const normalized = relativePath.replaceAll("\\", "/").replace(/^\/+/, "")

  if (normalized.startsWith("filled/")) {
    return resolveFilledPublicUrl(workspaceId, normalized)
  }

  if (!normalized.startsWith("source/")) return null

  const baseName = normalized.slice("source/".length)
  if (!baseName) return null

  const sources = await db
    .select({
      fileName: rfpSourceFiles.fileName,
      fileUrl: rfpSourceFiles.fileUrl,
      mimeType: rfpSourceFiles.mimeType,
    })
    .from(rfpSourceFiles)
    .where(eq(rfpSourceFiles.rfpId, workspaceId))

  for (const source of sources) {
    const safeName =
      sanitizeFileName(source.fileName) ||
      `workbook${extensionForMime(source.mimeType, source.fileName)}`
    if (safeName === baseName || source.fileName === baseName) {
      return source.fileUrl
    }
  }

  return null
}
