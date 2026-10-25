import { eq } from "drizzle-orm"
import {
  persistEditedSourceFilesWithDeps,
  type PersistEditedSourcesResult,
} from "@/lib/domain/workspace/persist-edited-sources"
import { db } from "@/lib/db"
import { rfpSourceFiles, rfps } from "@/lib/db/schema"
import type { VercelBlobStorage } from "@/lib/storage/vbs"
import { listWorkspaceFiles, readWorkspaceFile } from "@/lib/workspace-fs"

/**
 * Persist host-mirror source workbook edits to Blob + DB using live deps.
 */
export async function persistEditedSourceFiles(
  workspaceId: string,
  blob: VercelBlobStorage
): Promise<PersistEditedSourcesResult> {
  return persistEditedSourceFilesWithDeps(workspaceId, {
    async listHostSourceFiles(id) {
      const paths = await listWorkspaceFiles(id)
      const out: Array<{ relativePath: string; buffer: Buffer }> = []
      for (const relativePath of paths) {
        if (!relativePath.startsWith("source/")) continue
        try {
          const file = await readWorkspaceFile(id, relativePath)
          const buffer =
            file.encoding === "binary"
              ? file.content
              : Buffer.from(file.content, "utf8")
          if (buffer.byteLength === 0) continue
          out.push({ relativePath, buffer })
        } catch {
          // Skip unreadable paths
        }
      }
      return out
    },
    async loadSourceRows(id) {
      return db
        .select({
          id: rfpSourceFiles.id,
          organizationId: rfpSourceFiles.organizationId,
          fileName: rfpSourceFiles.fileName,
          mimeType: rfpSourceFiles.mimeType,
          checksumSha256: rfpSourceFiles.checksumSha256,
        })
        .from(rfpSourceFiles)
        .where(eq(rfpSourceFiles.rfpId, id))
    },
    async upload(input) {
      const result = await blob.upload({
        pathname: input.pathname,
        body: input.body,
        contentType: input.contentType,
        addRandomSuffix: true,
        allowOverwrite: false,
      })
      return { url: result.url, pathname: result.pathname }
    },
    async updateSourceFile(input) {
      await db
        .update(rfpSourceFiles)
        .set({
          fileUrl: input.fileUrl,
          blobPathname: input.blobPathname,
          sizeBytes: input.sizeBytes,
          checksumSha256: input.checksumSha256,
          sheetNames: input.sheetNames,
          parseMetadata: input.parseMetadata,
        })
        .where(eq(rfpSourceFiles.id, input.id))
    },
    async updateFilledFile(input) {
      await db
        .update(rfps)
        .set({
          filledFileUrl: input.fileUrl,
          filledBlobPathname: input.blobPathname,
          updatedAt: new Date(),
        })
        .where(eq(rfps.id, input.workspaceId))
    },
  })
}
