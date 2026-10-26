import { randomUUID } from "node:crypto"
import { and, eq } from "drizzle-orm"
import { z } from "zod"
import { rfps, rfpSourceFiles, templates } from "@workspace/db"
import { DomainError } from "../errors"
import type { BlobStore, WorkspaceHost } from "../ports"
import { FillPipelineManager } from "../pipeline/fill-pipeline.manager"
import type { AppDb, RfpRepository } from "../rfp/rfp.repository"
import {
  ALLOWED_SPREADSHEET_MIME_TYPES,
  extensionForMime,
  MAX_SPREADSHEET_BYTES,
  sanitizeFileName,
} from "../spreadsheet-constants"
import { checksumSha256, discoverWorkbookSheets } from "../workbook-parse"

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

export type SpreadsheetUploadInput = z.infer<typeof spreadsheetUploadSchema>
export type TemplateUploadInput = z.infer<typeof templateUploadSchema>

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
    throw new DomainError("File is empty", "VALIDATION")
  }
  if (buffer.byteLength > MAX_SPREADSHEET_BYTES) {
    throw new DomainError("File must be 25MB or smaller", "VALIDATION")
  }
  const safeName =
    sanitizeFileName(fileName) ||
    `workbook${extensionForMime(contentType, fileName)}`
  return { buffer, safeName }
}

export class IntakeService {
  constructor(
    private readonly db: AppDb,
    private readonly rfpRepo: RfpRepository,
    private readonly pipeline: FillPipelineManager,
    private readonly blob: BlobStore,
    private readonly workspace: WorkspaceHost
  ) {}

  private async uploadSpreadsheetBlob(input: {
    organizationId: string
    folder: "fills" | "templates"
    entityId: string
    safeName: string
    buffer: Buffer
    contentType: string
  }) {
    return this.blob.upload({
      pathname: `${input.folder}/${input.organizationId}/${input.entityId}/${input.safeName}`,
      body: input.buffer,
      contentType: input.contentType,
      addRandomSuffix: true,
    })
  }

  async createFill(
    organizationId: string,
    ownerUserId: string,
    data: SpreadsheetUploadInput
  ) {
    const parsed = spreadsheetUploadSchema.parse(data)
    const { buffer, safeName } = decodeSpreadsheet(
      parsed.base64,
      parsed.contentType,
      parsed.fileName
    )

    let templateId: string | null = parsed.templateId ?? null
    if (templateId) {
      const template = await this.rfpRepo.findTemplateIdForOrganization(
        organizationId,
        templateId
      )
      if (!template) {
        throw new DomainError("Template not found", "NOT_FOUND")
      }
    }

    const id = fillId()
    const { sheetNames, parseMetadata } = discoverWorkbookSheets(buffer)
    const checksum = checksumSha256(buffer)
    const blob = await this.uploadSpreadsheetBlob({
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

    try {
      await this.db.transaction(async (tx) => {
        const txDb = tx as unknown as AppDb
        await tx.insert(rfps).values({
          id,
          organizationId,
          templateId,
          name: parsed.name.trim(),
          customer: parsed.customer?.trim() || null,
          status: "queued",
          ownerUserId,
          startedAt: new Date(),
          metadata: {
            templateName: parsed.fileName,
            sourceFileName: parsed.fileName,
          },
        })

        await tx.insert(rfpSourceFiles).values({
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

        const pipelineTx = new FillPipelineManager(txDb)
        await pipelineTx.seedSteps(id, {
          ingestStatus: "done",
          ingestDetail,
        })
        await pipelineTx.appendLog({
          rfpId: id,
          stepKey: "ingest",
          message: `Source uploaded: ${parsed.fileName} (${buffer.byteLength} bytes)`,
          metadata: { blobPathname: blob.pathname, checksum },
        })
        await pipelineTx.appendLog({
          rfpId: id,
          stepKey: "ingest",
          message:
            sheetNames.length > 0
              ? `Detected sheets: ${sheetNames.join(", ")}`
              : "Sheet discovery returned no names — mapping will re-parse later",
          level: sheetNames.length > 0 ? "info" : "warn",
        })
      })
    } catch (error) {
      try {
        await this.blob.delete(blob.url)
      } catch {
        // best-effort compensating delete
      }
      throw error
    }

    await this.workspace.ensureRfpWorkspace({
      organizationId,
      ownerUserId,
      rfp: {
        id,
        name: parsed.name.trim(),
        customer: parsed.customer?.trim() || null,
        status: "queued",
      },
    })

    const workspacePath = `source/${safeName}`
    await this.workspace.writeWorkspaceFile(id, workspacePath, buffer)
    await this.pipeline.appendLog({
      rfpId: id,
      stepKey: "ingest",
      message: `Seeded workspace file ${workspacePath}`,
      source: "workspace",
    })

    return { id }
  }

  async createFillFromTemplate(
    organizationId: string,
    ownerUserId: string,
    input: { templateId: string; name?: string; customer?: string }
  ) {
    const template = await this.db
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
      throw new DomainError("Template not found", "NOT_FOUND")
    }

    const response = await fetch(template.fileUrl)
    if (!response.ok) {
      throw new DomainError("Could not download template file", "VALIDATION")
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

    return this.createFill(organizationId, ownerUserId, {
      fileName: template.fileName,
      contentType,
      base64,
      name: input.name?.trim() || template.name,
      customer: input.customer?.trim() || template.customer || undefined,
      templateId: template.id,
    })
  }

  async uploadTemplate(
    organizationId: string,
    uploadedByUserId: string,
    data: TemplateUploadInput
  ) {
    const parsed = templateUploadSchema.parse(data)
    const { buffer, safeName } = decodeSpreadsheet(
      parsed.base64,
      parsed.contentType,
      parsed.fileName
    )

    const id = templateRowId()
    const blob = await this.uploadSpreadsheetBlob({
      organizationId,
      folder: "templates",
      entityId: id,
      safeName,
      buffer,
      contentType: parsed.contentType,
    })

    try {
      await this.db.insert(templates).values({
        id,
        organizationId,
        name: parsed.name.trim(),
        fileName: parsed.fileName,
        mimeType: parsed.contentType,
        sizeBytes: buffer.byteLength,
        fileUrl: blob.url,
        blobPathname: blob.pathname,
        customer: parsed.customer?.trim() || null,
        uploadedByUserId,
        metadata: {},
      })
    } catch (error) {
      try {
        await this.blob.delete(blob.url)
      } catch {
        // best-effort
      }
      throw error
    }

    return { id }
  }
}
