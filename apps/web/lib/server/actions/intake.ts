"use server"

import { randomUUID } from "node:crypto"
import { and, eq } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/lib/db"
import { rfps, rfpSourceFiles, templates } from "@/lib/db/schema"
import { appendRfpLog, seedFillProgressSteps } from "@/lib/server/fill-pipeline"
import { requireOrgSession } from "@/lib/server/session"
import {
  checksumSha256,
  discoverWorkbookSheets,
} from "@/lib/server/workbook-parse"
import {
  ALLOWED_SPREADSHEET_MIME_TYPES,
  extensionForMime,
  MAX_SPREADSHEET_BYTES,
  sanitizeFileName,
} from "@/lib/storage/spreadsheet-constants"
import { getBlobStorage } from "@/lib/storage/vbs"
import { writeWorkspaceFile } from "@/lib/workspace-fs"
import { ensureRfpWorkspace } from "@/lib/workspace-registry"

const spreadsheetUploadSchema = z.object({
  fileName: z.string().min(1).max(255),
  contentType: z.enum(ALLOWED_SPREADSHEET_MIME_TYPES),
  base64: z.string().min(1),
  name: z.string().min(1).max(200),
  customer: z.string().max(200).optional(),
  templateId: z.string().min(1).optional(),
})

const templateUploadSchema = z.object({
  fileName: z.string().min(1).max(255),
  contentType: z.enum(ALLOWED_SPREADSHEET_MIME_TYPES),
  base64: z.string().min(1),
  name: z.string().min(1).max(200),
  customer: z.string().max(200).optional(),
})

function fillId() {
  return `fill_${randomUUID().replaceAll("-", "").slice(0, 20)}`
}

function sourceFileId() {
  return `src_${randomUUID().replaceAll("-", "").slice(0, 16)}`
}

function templateRowId() {
  return `tpl_${randomUUID().replaceAll("-", "").slice(0, 20)}`
}

function decodeSpreadsheet(
  base64: string,
  contentType: string,
  fileName: string
) {
  const buffer = Buffer.from(base64, "base64")
  if (buffer.byteLength === 0) {
    throw new Error("File is empty")
  }
  if (buffer.byteLength > MAX_SPREADSHEET_BYTES) {
    throw new Error("File must be 25MB or smaller")
  }
  const safeName =
    sanitizeFileName(fileName) ||
    `workbook${extensionForMime(contentType, fileName)}`
  return { buffer, safeName }
}

async function uploadSpreadsheetBlob(input: {
  organizationId: string
  folder: "fills" | "templates"
  entityId: string
  safeName: string
  buffer: Buffer
  contentType: string
}) {
  const storage = getBlobStorage()
  return storage.upload({
    pathname: `${input.folder}/${input.organizationId}/${input.entityId}/${input.safeName}`,
    body: input.buffer,
    contentType: input.contentType,
    addRandomSuffix: true,
  })
}

/**
 * Create a fill from an uploaded BCO workbook (or reuse a saved template id).
 */
export async function createFill(
  data: z.infer<typeof spreadsheetUploadSchema>
) {
  const parsed = spreadsheetUploadSchema.parse(data)
  const { organizationId, session } = await requireOrgSession()
  const { buffer, safeName } = decodeSpreadsheet(
    parsed.base64,
    parsed.contentType,
    parsed.fileName
  )

  let templateId: string | null = parsed.templateId ?? null
  if (templateId) {
    const template = await db
      .select({ id: templates.id })
      .from(templates)
      .where(
        and(
          eq(templates.id, templateId),
          eq(templates.organizationId, organizationId)
        )
      )
      .limit(1)
      .then((rows) => rows[0] ?? null)
    if (!template) {
      throw new Error("Template not found")
    }
  }

  const id = fillId()
  const { sheetNames, parseMetadata } = discoverWorkbookSheets(buffer)
  const checksum = checksumSha256(buffer)
  const blob = await uploadSpreadsheetBlob({
    organizationId,
    folder: "fills",
    entityId: id,
    safeName,
    buffer,
    contentType: parsed.contentType,
  })

  const ingestDetail =
    sheetNames.length > 0
      ? `${sheetNames.length} sheet(s): ${sheetNames.slice(0, 6).join(", ")}${sheetNames.length > 6 ? "…" : ""}`
      : "Workbook stored (sheet list unavailable)"

  await db.insert(rfps).values({
    id,
    organizationId,
    templateId,
    name: parsed.name.trim(),
    customer: parsed.customer?.trim() || null,
    status: "queued",
    ownerUserId: session.user.id,
    startedAt: new Date(),
    metadata: {
      templateName: parsed.fileName,
      sourceFileName: parsed.fileName,
    },
  })

  await db.insert(rfpSourceFiles).values({
    id: sourceFileId(),
    rfpId: id,
    organizationId,
    fileName: parsed.fileName,
    mimeType: parsed.contentType,
    sizeBytes: buffer.byteLength,
    fileUrl: blob.url,
    blobPathname: blob.pathname,
    checksumSha256: checksum,
    sheetNames,
    parseMetadata,
  })

  await seedFillProgressSteps(id, {
    ingestStatus: "done",
    ingestDetail,
  })

  await appendRfpLog({
    rfpId: id,
    stepKey: "ingest",
    message: `Source uploaded: ${parsed.fileName} (${buffer.byteLength} bytes)`,
    metadata: { blobPathname: blob.pathname, checksum },
  })
  await appendRfpLog({
    rfpId: id,
    stepKey: "ingest",
    message:
      sheetNames.length > 0
        ? `Detected sheets: ${sheetNames.join(", ")}`
        : "Sheet discovery returned no names — mapping will re-parse later",
    level: sheetNames.length > 0 ? "info" : "warn",
  })

  await ensureRfpWorkspace({
    organizationId,
    ownerUserId: session.user.id,
    rfp: {
      id,
      name: parsed.name.trim(),
      customer: parsed.customer?.trim() || null,
      status: "queued",
    },
  })

  const workspacePath = `source/${safeName}`
  await writeWorkspaceFile(id, workspacePath, buffer)
  await appendRfpLog({
    rfpId: id,
    stepKey: "ingest",
    message: `Seeded workspace file ${workspacePath}`,
    source: "workspace",
  })

  return { id }
}

/** Create a fill by copying bytes from an existing org template. */
export async function createFillFromTemplate(input: {
  templateId: string
  name?: string
  customer?: string
}) {
  const { organizationId } = await requireOrgSession()
  const template = await db
    .select()
    .from(templates)
    .where(
      and(
        eq(templates.id, input.templateId),
        eq(templates.organizationId, organizationId)
      )
    )
    .limit(1)
    .then((rows) => rows[0] ?? null)

  if (!template) {
    throw new Error("Template not found")
  }

  const response = await fetch(template.fileUrl)
  if (!response.ok) {
    throw new Error("Could not download template file")
  }
  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const base64 = buffer.toString("base64")
  const contentType = (
    ALLOWED_SPREADSHEET_MIME_TYPES.includes(
      template.mimeType as (typeof ALLOWED_SPREADSHEET_MIME_TYPES)[number]
    )
      ? template.mimeType
      : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) as (typeof ALLOWED_SPREADSHEET_MIME_TYPES)[number]

  return createFill({
    fileName: template.fileName,
    contentType,
    base64,
    name: input.name?.trim() || template.name,
    customer: input.customer?.trim() || template.customer || undefined,
    templateId: template.id,
  })
}

export async function uploadTemplate(
  data: z.infer<typeof templateUploadSchema>
) {
  const parsed = templateUploadSchema.parse(data)
  const { organizationId, session } = await requireOrgSession()
  const { buffer, safeName } = decodeSpreadsheet(
    parsed.base64,
    parsed.contentType,
    parsed.fileName
  )

  const id = templateRowId()
  const blob = await uploadSpreadsheetBlob({
    organizationId,
    folder: "templates",
    entityId: id,
    safeName,
    buffer,
    contentType: parsed.contentType,
  })

  await db.insert(templates).values({
    id,
    organizationId,
    name: parsed.name.trim(),
    fileName: parsed.fileName,
    mimeType: parsed.contentType,
    sizeBytes: buffer.byteLength,
    fileUrl: blob.url,
    blobPathname: blob.pathname,
    customer: parsed.customer?.trim() || null,
    uploadedByUserId: session.user.id,
    metadata: {},
  })

  return { id }
}
