import { del, put, type PutBlobResult } from "@vercel/blob"
import { env } from "@/env"

/** Matches the Vercel Blob store access mode (this project uses a public store). */
export const BLOB_ACCESS = "public" as const

export type BlobAccess = "public" | "private"

export type BlobUploadInput = {
  pathname: string
  body: Parameters<typeof put>[1]
  access?: BlobAccess
  contentType?: string
  addRandomSuffix?: boolean
  allowOverwrite?: boolean
}

export class VercelBlobStorage {
  private readonly token: string

  constructor(token = env.BLOB_READ_WRITE_TOKEN) {
    if (!token) {
      throw new Error("BLOB_READ_WRITE_TOKEN is not set")
    }
    this.token = token
  }

  async upload({
    pathname,
    body,
    access = BLOB_ACCESS,
    contentType,
    addRandomSuffix = true,
    allowOverwrite = false,
  }: BlobUploadInput): Promise<PutBlobResult> {
    return put(pathname, body, {
      access,
      token: this.token,
      contentType,
      addRandomSuffix,
      allowOverwrite,
    })
  }

  async delete(urlOrUrls: string | string[]): Promise<void> {
    await del(urlOrUrls, { token: this.token })
  }
}

let blobStorageInstance: VercelBlobStorage | null = null

/** Lazy singleton — construct only on the server when first needed. */
export function getBlobStorage(): VercelBlobStorage {
  if (!blobStorageInstance) {
    blobStorageInstance = new VercelBlobStorage()
  }
  return blobStorageInstance
}

export const blobStorage = {
  upload: (...args: Parameters<VercelBlobStorage["upload"]>) =>
    getBlobStorage().upload(...args),
  delete: (...args: Parameters<VercelBlobStorage["delete"]>) =>
    getBlobStorage().delete(...args),
}
