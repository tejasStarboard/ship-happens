/**
 * Upload host-mirror `source/*` workbooks that diverged from intake Blob
 * checksums, then point `rfp_source_files` (and `rfps.filled*`) at the new URL.
 */
import {
  checksumSha256,
  discoverWorkbookSheets,
  extensionForMime,
  sanitizeFileName,
} from "@ship-happens/fill"
import { isValidWorkspaceId } from "@/lib/domain/workspace/workspace.authorize"

export type SourceFileRow = {
  readonly id: string
  readonly organizationId: string
  readonly fileName: string
  readonly mimeType: string
  readonly checksumSha256: string | null
}

export type HostSourceFile = {
  readonly relativePath: string
  readonly buffer: Buffer
}

export type PersistBlobUpload = {
  readonly url: string
  readonly pathname: string
}

export type PersistEditedSourcesDeps = {
  listHostSourceFiles: (workspaceId: string) => Promise<HostSourceFile[]>
  loadSourceRows: (workspaceId: string) => Promise<SourceFileRow[]>
  upload: (input: {
    pathname: string
    body: Buffer
    contentType: string
  }) => Promise<PersistBlobUpload>
  updateSourceFile: (input: {
    id: string
    fileUrl: string
    blobPathname: string
    sizeBytes: number
    checksumSha256: string
    sheetNames: string[]
    parseMetadata: Record<string, unknown>
  }) => Promise<void>
  updateFilledFile: (input: {
    workspaceId: string
    fileUrl: string
    blobPathname: string
  }) => Promise<void>
}

export type PersistEditedSourcesResult = {
  readonly scanned: number
  readonly uploaded: number
  readonly skippedUnchanged: number
  readonly skippedUnmatched: number
}

export function isSpreadsheetSourcePath(relativePath: string): boolean {
  const normalized = relativePath.replaceAll("\\", "/").replace(/^\/+/, "")
  if (!normalized.startsWith("source/")) return false
  const base = normalized.slice("source/".length)
  if (!base || base.includes("/")) return false
  const lower = base.toLowerCase()
  return (
    lower.endsWith(".xlsx") || lower.endsWith(".xls") || lower.endsWith(".csv")
  )
}

export function matchSourceRow(
  relativePath: string,
  rows: readonly SourceFileRow[]
): SourceFileRow | null {
  const normalized = relativePath.replaceAll("\\", "/").replace(/^\/+/, "")
  if (!normalized.startsWith("source/")) return null
  const baseName = normalized.slice("source/".length)
  if (!baseName) return null

  for (const row of rows) {
    const safeName =
      sanitizeFileName(row.fileName) ||
      `workbook${extensionForMime(row.mimeType, row.fileName)}`
    if (safeName === baseName || row.fileName === baseName) {
      return row
    }
  }
  return null
}

/**
 * Pure persist loop — inject IO for unit tests.
 * Skips files with matching checksum; does not delete prior Blob objects.
 */
export async function persistEditedSourceFilesWithDeps(
  workspaceId: string,
  deps: PersistEditedSourcesDeps
): Promise<PersistEditedSourcesResult> {
  if (!isValidWorkspaceId(workspaceId)) {
    return {
      scanned: 0,
      uploaded: 0,
      skippedUnchanged: 0,
      skippedUnmatched: 0,
    }
  }

  const [files, rows] = await Promise.all([
    deps.listHostSourceFiles(workspaceId),
    deps.loadSourceRows(workspaceId),
  ])

  let uploaded = 0
  let skippedUnchanged = 0
  let skippedUnmatched = 0
  let lastUpload: PersistBlobUpload | null = null

  for (const file of files) {
    if (!isSpreadsheetSourcePath(file.relativePath)) continue

    const row = matchSourceRow(file.relativePath, rows)
    if (!row) {
      skippedUnmatched += 1
      continue
    }

    const checksum = checksumSha256(file.buffer)
    if (row.checksumSha256 && row.checksumSha256 === checksum) {
      skippedUnchanged += 1
      continue
    }

    const safeName =
      sanitizeFileName(row.fileName) ||
      `workbook${extensionForMime(row.mimeType, row.fileName)}`
    const blob = await deps.upload({
      pathname: `fills/${row.organizationId}/${workspaceId}/${safeName}`,
      body: file.buffer,
      contentType: row.mimeType,
    })

    const { sheetNames, parseMetadata } = discoverWorkbookSheets(file.buffer)
    await deps.updateSourceFile({
      id: row.id,
      fileUrl: blob.url,
      blobPathname: blob.pathname,
      sizeBytes: file.buffer.byteLength,
      checksumSha256: checksum,
      sheetNames,
      parseMetadata,
    })

    uploaded += 1
    lastUpload = blob
  }

  if (lastUpload) {
    await deps.updateFilledFile({
      workspaceId,
      fileUrl: lastUpload.url,
      blobPathname: lastUpload.pathname,
    })
  }

  return {
    scanned: files.length,
    uploaded,
    skippedUnchanged,
    skippedUnmatched,
  }
}
