export type TemplateListItem = {
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
   */
  fileUrl: string
}

/** @deprecated Use TemplateListItem */
export type MockTemplate = TemplateListItem
