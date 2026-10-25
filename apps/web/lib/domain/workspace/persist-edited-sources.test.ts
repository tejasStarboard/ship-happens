import { createHash } from "node:crypto"
import { describe, expect, it, vi } from "vitest"
import {
  isSpreadsheetSourcePath,
  matchSourceRow,
  persistEditedSourceFilesWithDeps,
  type PersistEditedSourcesDeps,
  type SourceFileRow,
} from "@/lib/domain/workspace/persist-edited-sources"

const WORKSPACE_ID = "fill_0123456789abcdef0123"

function sha256(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex")
}

function sourceRow(
  overrides: Partial<SourceFileRow> & Pick<SourceFileRow, "id" | "fileName">
): SourceFileRow {
  return {
    organizationId: "org_test",
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    checksumSha256: null,
    ...overrides,
  }
}

describe("isSpreadsheetSourcePath", () => {
  it("accepts source spreadsheet basenames", () => {
    expect(isSpreadsheetSourcePath("source/bid.xlsx")).toBe(true)
    expect(isSpreadsheetSourcePath("source/bid.xls")).toBe(true)
    expect(isSpreadsheetSourcePath("source/rates.csv")).toBe(true)
  })

  it("rejects nested or non-spreadsheet paths", () => {
    expect(isSpreadsheetSourcePath("notes.md")).toBe(false)
    expect(isSpreadsheetSourcePath("source/nested/bid.xlsx")).toBe(false)
    expect(isSpreadsheetSourcePath("source/readme.txt")).toBe(false)
  })
})

describe("matchSourceRow", () => {
  it("matches sanitized file names", () => {
    const row = sourceRow({ id: "src_1", fileName: "My Bid Sheet.XLSX" })
    expect(matchSourceRow("source/my-bid-sheet.xlsx", [row])?.id).toBe("src_1")
  })

  it("returns null when unmatched", () => {
    const row = sourceRow({ id: "src_1", fileName: "a.xlsx" })
    expect(matchSourceRow("source/other.xlsx", [row])).toBeNull()
  })
})

describe("persistEditedSourceFilesWithDeps", () => {
  it("skips upload when checksum matches", async () => {
    const buffer = Buffer.from("same-bytes")
    const upload = vi.fn()
    const updateSourceFile = vi.fn()
    const updateFilledFile = vi.fn()

    const deps: PersistEditedSourcesDeps = {
      listHostSourceFiles: async () => [
        { relativePath: "source/bid.xlsx", buffer },
      ],
      loadSourceRows: async () => [
        sourceRow({
          id: "src_1",
          fileName: "bid.xlsx",
          checksumSha256: sha256(buffer),
        }),
      ],
      upload,
      updateSourceFile,
      updateFilledFile,
    }

    const result = await persistEditedSourceFilesWithDeps(WORKSPACE_ID, deps)

    expect(result).toEqual({
      scanned: 1,
      uploaded: 0,
      skippedUnchanged: 1,
      skippedUnmatched: 0,
    })
    expect(upload).not.toHaveBeenCalled()
    expect(updateSourceFile).not.toHaveBeenCalled()
    expect(updateFilledFile).not.toHaveBeenCalled()
  })

  it("uploads and updates when checksum diverges", async () => {
    const buffer = Buffer.from("edited-workbook-bytes")
    const upload = vi.fn(async () => ({
      url: "https://blob.example/fills/org/fill/bid-abc.xlsx",
      pathname: "fills/org_test/fill_0123456789abcdef0123/bid.xlsx",
    }))
    const updateSourceFile = vi.fn()
    const updateFilledFile = vi.fn()

    const deps: PersistEditedSourcesDeps = {
      listHostSourceFiles: async () => [
        { relativePath: "source/bid.xlsx", buffer },
      ],
      loadSourceRows: async () => [
        sourceRow({
          id: "src_1",
          fileName: "bid.xlsx",
          checksumSha256: sha256(Buffer.from("original")),
        }),
      ],
      upload,
      updateSourceFile,
      updateFilledFile,
    }

    const result = await persistEditedSourceFilesWithDeps(WORKSPACE_ID, deps)

    expect(result.uploaded).toBe(1)
    expect(upload).toHaveBeenCalledOnce()
    expect(updateSourceFile).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "src_1",
        fileUrl: "https://blob.example/fills/org/fill/bid-abc.xlsx",
        checksumSha256: sha256(buffer),
        sizeBytes: buffer.byteLength,
      })
    )
    expect(updateFilledFile).toHaveBeenCalledWith({
      workspaceId: WORKSPACE_ID,
      fileUrl: "https://blob.example/fills/org/fill/bid-abc.xlsx",
      blobPathname: "fills/org_test/fill_0123456789abcdef0123/bid.xlsx",
    })
  })

  it("skips host files with no matching source row", async () => {
    const upload = vi.fn()
    const deps: PersistEditedSourcesDeps = {
      listHostSourceFiles: async () => [
        {
          relativePath: "source/orphan.xlsx",
          buffer: Buffer.from("orphan"),
        },
      ],
      loadSourceRows: async () => [
        sourceRow({ id: "src_1", fileName: "bid.xlsx" }),
      ],
      upload,
      updateSourceFile: vi.fn(),
      updateFilledFile: vi.fn(),
    }

    const result = await persistEditedSourceFilesWithDeps(WORKSPACE_ID, deps)

    expect(result.skippedUnmatched).toBe(1)
    expect(result.uploaded).toBe(0)
    expect(upload).not.toHaveBeenCalled()
  })

  it("no-ops for invalid workspace ids", async () => {
    const listHostSourceFiles = vi.fn()
    const result = await persistEditedSourceFilesWithDeps("../etc", {
      listHostSourceFiles,
      loadSourceRows: vi.fn(),
      upload: vi.fn(),
      updateSourceFile: vi.fn(),
      updateFilledFile: vi.fn(),
    })

    expect(result.scanned).toBe(0)
    expect(listHostSourceFiles).not.toHaveBeenCalled()
  })
})
