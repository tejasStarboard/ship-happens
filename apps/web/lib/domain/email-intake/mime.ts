import {
  ALLOWED_SPREADSHEET_MIME_TYPES,
  type AllowedSpreadsheetMime,
} from "@ship-happens/fill"

const EXT_MIME: Record<string, AllowedSpreadsheetMime> = {
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".xls": "application/vnd.ms-excel",
  ".csv": "text/csv",
}

export function spreadsheetMimeFromName(
  fileName: string,
  reportedMime?: string | null
): AllowedSpreadsheetMime | null {
  const lower = fileName.toLowerCase()
  for (const [ext, mime] of Object.entries(EXT_MIME)) {
    if (lower.endsWith(ext)) return mime
  }
  if (
    reportedMime &&
    (ALLOWED_SPREADSHEET_MIME_TYPES as readonly string[]).includes(reportedMime)
  ) {
    return reportedMime as AllowedSpreadsheetMime
  }
  return null
}

export function isSpreadsheetAttachment(
  fileName: string,
  mimeType?: string | null
): boolean {
  return spreadsheetMimeFromName(fileName, mimeType) != null
}
