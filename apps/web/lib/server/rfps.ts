import { and, desc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { rfps, rfpSourceFiles, templates } from "@/lib/db/schema"
import { type RfpStatus } from "@/lib/mock/rfps"
import { listRfpLogs, listRfpProgressSteps } from "@/lib/server/fill-pipeline"
import { requireOrgSession } from "@/lib/server/session"

export type RfpListItem = {
  id: string
  name: string
  customer: string
  status: RfpStatus
  templateName: string
  updatedAt: string
  owner: string
}

export type RfpProgressStepView = {
  id: string
  key: string
  label: string
  status: string
  detail: string | null
  sortOrder: number
  startedAt: string | null
  completedAt: string | null
}

export type RfpLogView = {
  id: string
  level: string
  message: string
  stepKey: string | null
  source: string | null
  createdAt: string
}

export type RfpSourceFileView = {
  id: string
  fileName: string
  mimeType: string
  sizeBytes: number
  fileUrl: string
  sheetNames: string[]
  createdAt: string
}

export type RfpDetailView = RfpListItem & {
  progressSteps: RfpProgressStepView[]
  logs: RfpLogView[]
  sourceFiles: RfpSourceFileView[]
  filledFileUrl: string | null
}

function asRfpStatus(value: string): RfpStatus {
  switch (value) {
    case "queued":
    case "running":
    case "needs_review":
    case "done":
    case "failed":
      return value
    case "cancelled":
      return "failed"
    default:
      return "queued"
  }
}

export async function listOrgRfps(): Promise<RfpListItem[]> {
  const { organizationId, session } = await requireOrgSession()

  const rows = await db
    .select({
      id: rfps.id,
      name: rfps.name,
      customer: rfps.customer,
      status: rfps.status,
      metadata: rfps.metadata,
      updatedAt: rfps.updatedAt,
      templateName: templates.name,
      ownerName: rfps.ownerUserId,
    })
    .from(rfps)
    .leftJoin(templates, eq(rfps.templateId, templates.id))
    .where(eq(rfps.organizationId, organizationId))
    .orderBy(desc(rfps.updatedAt))

  return rows.map((row) => {
    const meta = (row.metadata ?? {}) as { templateName?: string }
    return {
      id: row.id,
      name: row.name,
      customer: row.customer ?? "—",
      status: asRfpStatus(row.status),
      templateName: row.templateName ?? meta.templateName ?? "—",
      updatedAt: row.updatedAt.toISOString(),
      owner: session.user.name ?? row.ownerName,
    }
  })
}

export async function getOrgRfp(id: string): Promise<RfpListItem | null> {
  const detail = await getOrgRfpDetail(id)
  if (!detail) return null
  return {
    id: detail.id,
    name: detail.name,
    customer: detail.customer,
    status: detail.status,
    templateName: detail.templateName,
    updatedAt: detail.updatedAt,
    owner: detail.owner,
  }
}

export async function getOrgRfpDetail(
  id: string
): Promise<RfpDetailView | null> {
  const { organizationId, session } = await requireOrgSession()

  const row = await db
    .select({
      id: rfps.id,
      name: rfps.name,
      customer: rfps.customer,
      status: rfps.status,
      metadata: rfps.metadata,
      updatedAt: rfps.updatedAt,
      templateName: templates.name,
      ownerName: rfps.ownerUserId,
      filledFileUrl: rfps.filledFileUrl,
    })
    .from(rfps)
    .leftJoin(templates, eq(rfps.templateId, templates.id))
    .where(and(eq(rfps.id, id), eq(rfps.organizationId, organizationId)))
    .limit(1)
    .then((rows) => rows[0] ?? null)

  if (!row) return null

  const meta = (row.metadata ?? {}) as { templateName?: string }
  const [progressSteps, logs, sourceFileRows] = await Promise.all([
    listRfpProgressSteps(row.id),
    listRfpLogs(row.id),
    db
      .select()
      .from(rfpSourceFiles)
      .where(eq(rfpSourceFiles.rfpId, row.id))
      .orderBy(desc(rfpSourceFiles.createdAt)),
  ])

  return {
    id: row.id,
    name: row.name,
    customer: row.customer ?? "—",
    status: asRfpStatus(row.status),
    templateName: row.templateName ?? meta.templateName ?? "—",
    updatedAt: row.updatedAt.toISOString(),
    owner: session.user.name ?? row.ownerName,
    filledFileUrl: row.filledFileUrl,
    progressSteps: progressSteps.map((step) => ({
      id: step.id,
      key: step.key,
      label: step.label,
      status: step.status,
      detail: step.detail,
      sortOrder: step.sortOrder,
      startedAt: step.startedAt?.toISOString() ?? null,
      completedAt: step.completedAt?.toISOString() ?? null,
    })),
    logs: logs.map((log) => ({
      id: log.id,
      level: log.level,
      message: log.message,
      stepKey: log.stepKey,
      source: log.source,
      createdAt: log.createdAt.toISOString(),
    })),
    sourceFiles: sourceFileRows.map((file) => ({
      id: file.id,
      fileName: file.fileName,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      fileUrl: file.fileUrl,
      sheetNames: (file.sheetNames as string[] | null) ?? [],
      createdAt: file.createdAt.toISOString(),
    })),
  }
}
