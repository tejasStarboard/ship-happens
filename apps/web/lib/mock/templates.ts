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

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}
