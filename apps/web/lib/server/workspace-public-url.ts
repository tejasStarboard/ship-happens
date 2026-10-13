import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { rfpSourceFiles } from "@/lib/db/schema"
import {
  extensionForMime,
  sanitizeFileName,
} from "@/lib/storage/spreadsheet-constants"

/**
 * Resolve a durable public Blob URL for a workspace-relative path when it
 * maps to an intake source workbook (needed for Office Online embeds).
 */
export async function resolveWorkspacePublicFileUrl(
  workspaceId: string,
  relativePath: string
): Promise<string | null> {
  const normalized = relativePath.replaceAll("\\", "/").replace(/^\/+/, "")
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
