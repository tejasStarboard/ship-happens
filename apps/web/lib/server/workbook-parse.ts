import { createHash } from "node:crypto"
import * as XLSX from "xlsx"

export function checksumSha256(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex")
}

/** Lightweight sheet discovery for intake — not full schema mapping. */
export function discoverWorkbookSheets(buffer: Buffer): {
  sheetNames: string[]
  parseMetadata: Record<string, unknown>
} {
  try {
    const workbook = XLSX.read(buffer, {
      type: "buffer",
      bookSheets: true,
      bookProps: true,
    })
    const sheetNames = workbook.SheetNames ?? []
    return {
      sheetNames,
      parseMetadata: {
        sheetCount: sheetNames.length,
        parser: "xlsx",
      },
    }
  } catch (error) {
    return {
      sheetNames: [],
      parseMetadata: {
        parser: "xlsx",
        error: error instanceof Error ? error.message : "parse_failed",
      },
    }
  }
}
