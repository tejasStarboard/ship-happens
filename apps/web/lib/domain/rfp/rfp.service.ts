import {
  asRfpStatus,
  type RfpDetailView,
  type RfpListItem,
} from "@/lib/domain/rfp/rfp.types"
import type { RfpRepository } from "@/lib/domain/rfp/rfp.repository"
import type { FillPipelineManager } from "@/lib/domain/pipeline/fill-pipeline.manager"

export class RfpService {
  constructor(
    private readonly repo: RfpRepository,
    private readonly pipeline: FillPipelineManager
  ) {}

  async list(
    organizationId: string,
    ownerDisplayName: string
  ): Promise<RfpListItem[]> {
    const rows = await this.repo.listByOrganization(organizationId)
    return rows.map((row) => {
      const meta = (row.metadata ?? {}) as { templateName?: string }
      return {
        id: row.id,
        name: row.name,
        customer: row.customer ?? "—",
        status: asRfpStatus(row.status),
        templateName: row.templateName ?? meta.templateName ?? "—",
        updatedAt: row.updatedAt.toISOString(),
        owner: ownerDisplayName || row.ownerName,
      }
    })
  }

  async getDetail(
    organizationId: string,
    id: string,
    ownerDisplayName: string
  ): Promise<RfpDetailView | null> {
    const row = await this.repo.findByIdForOrganization(organizationId, id)
    if (!row) return null

    const meta = (row.metadata ?? {}) as { templateName?: string }
    const [progressSteps, logs, sourceFileRows] = await Promise.all([
      this.pipeline.listSteps(row.id),
      this.pipeline.listLogs(row.id),
      this.repo.listSourceFiles(row.id),
    ])

    return {
      id: row.id,
      name: row.name,
      customer: row.customer ?? "—",
      status: asRfpStatus(row.status),
      templateName: row.templateName ?? meta.templateName ?? "—",
      updatedAt: row.updatedAt.toISOString(),
      owner: ownerDisplayName || row.ownerName,
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
}
