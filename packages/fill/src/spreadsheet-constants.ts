export const ALLOWED_SPREADSHEET_MIME_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
  "application/csv",
] as const

export type AllowedSpreadsheetMime =
  (typeof ALLOWED_SPREADSHEET_MIME_TYPES)[number]

/** 25 MB — enough for large BCO workbooks without blowing serverless limits. */
export const MAX_SPREADSHEET_BYTES = 25 * 1024 * 1024

export function sanitizeFileName(fileName: string) {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

export function extensionForMime(mime: string, fileName: string) {
  const lower = fileName.toLowerCase()
  if (
    lower.endsWith(".xlsx") ||
    lower.endsWith(".xls") ||
    lower.endsWith(".csv")
  ) {
    return lower.slice(lower.lastIndexOf("."))
  }
  if (mime.includes("csv")) return ".csv"
  if (mime.includes("ms-excel")) return ".xls"
  return ".xlsx"
}
