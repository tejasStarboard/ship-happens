export type MockTemplate = {
  id: string
  name: string
  fileName: string
  mimeType: string
  sizeBytes: number
  uploadedAt: string
  uploadedBy: string
  customer: string | null
  /**
   * Public HTTPS URL for Microsoft Office Online Viewer.
   * Local `/public` paths won't work with Office Online (their servers fetch the file).
   * Swap for Vercel Blob public URLs in production.
   */
  fileUrl: string
}

/** Public sample workbook used for mock Office Online previews. */
const MOCK_OFFICE_FILE_URL =
  "https://filesamples.com/samples/document/xlsx/sample1.xlsx"

export const MOCK_TEMPLATES: MockTemplate[] = [
  {
    id: "tpl_nordstrom_v3",
    name: "Nordstrom bid sheet",
    fileName: "Nordstrom bid sheet v3.xlsx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    sizeBytes: 248_320,
    uploadedAt: "2026-09-12T11:00:00.000Z",
    uploadedBy: "Tejas Ladhe",
    customer: "Nordstrom",
    fileUrl: MOCK_OFFICE_FILE_URL,
  },
  {
    id: "tpl_target",
    name: "Target rate RFP",
    fileName: "Target rate RFP.xlsx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    sizeBytes: 191_488,
    uploadedAt: "2026-09-18T16:40:00.000Z",
    uploadedBy: "Tejas Ladhe",
    customer: "Target",
    fileUrl: MOCK_OFFICE_FILE_URL,
  },
  {
    id: "tpl_walmart",
    name: "Walmart FCL template",
    fileName: "Walmart FCL template.xlsx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    sizeBytes: 312_064,
    uploadedAt: "2026-08-30T08:15:00.000Z",
    uploadedBy: "Tejas Ladhe",
    customer: "Walmart",
    fileUrl: MOCK_OFFICE_FILE_URL,
  },
]

export function getMockTemplate(id: string) {
  return MOCK_TEMPLATES.find((template) => template.id === id) ?? null
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}
