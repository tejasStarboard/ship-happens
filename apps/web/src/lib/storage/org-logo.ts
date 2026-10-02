import { createServerFn } from "@tanstack/react-start"
import { getRequestHeaders } from "@tanstack/react-start/server"
import { z } from "zod"
import { auth } from "@/lib/auth/server"
import { getBlobStorage } from "@/lib/storage/vbs"

export const MAX_ORG_LOGO_BYTES = 10 * 1024 * 1024
export const ALLOWED_ORG_LOGO_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const

const uploadOrgLogoSchema = z.object({
  fileName: z.string().min(1).max(255),
  contentType: z.enum(ALLOWED_ORG_LOGO_TYPES),
  base64: z.string().min(1),
})

function sanitizeFileName(fileName: string) {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

/**
 * Authenticated server upload for organization logos.
 * Uploads to the public Blob store; `url` is safe for <img src> as-is.
 */
export const uploadOrgLogo = createServerFn({ method: "POST" })
  .validator(uploadOrgLogoSchema)
  .handler(async ({ data }) => {
    const headers = getRequestHeaders()
    const session = await auth.api.getSession({ headers })
    if (!session) {
      throw new Error("You must be signed in to upload a logo")
    }

    const buffer = Buffer.from(data.base64, "base64")
    if (buffer.byteLength === 0) {
      throw new Error("Logo file is empty")
    }
    if (buffer.byteLength > MAX_ORG_LOGO_BYTES) {
      throw new Error("Logo must be 10MB or smaller")
    }

    const safeName = sanitizeFileName(data.fileName) || "logo"
    const storage = getBlobStorage()
    const blob = await storage.upload({
      pathname: `org-logos/${session.user.id}/${safeName}`,
      body: buffer,
      contentType: data.contentType,
      addRandomSuffix: true,
    })

    return {
      url: blob.url,
      pathname: blob.pathname,
      contentType: blob.contentType,
    }
  })
