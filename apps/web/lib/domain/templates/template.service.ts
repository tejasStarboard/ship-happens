import type { TemplateRepository } from "@/lib/domain/templates/template.repository"
import type { TemplateListItem } from "@/lib/domain/templates/template.types"

export class TemplateService {
  constructor(private readonly repo: TemplateRepository) {}

  async list(
    organizationId: string,
    uploadedByDisplayName: string
  ): Promise<TemplateListItem[]> {
    const rows = await this.repo.listByOrganization(organizationId)
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      fileName: row.fileName,
      mimeType: row.mimeType,
      sizeBytes: row.sizeBytes,
      uploadedAt: row.createdAt.toISOString(),
      uploadedBy: uploadedByDisplayName,
      customer: row.customer,
      fileUrl: row.fileUrl,
    }))
  }

  async get(
    organizationId: string,
    id: string,
    uploadedByDisplayName: string
  ): Promise<TemplateListItem | null> {
    const row = await this.repo.findByIdForOrganization(organizationId, id)
    if (!row) return null
    return {
      id: row.id,
      name: row.name,
      fileName: row.fileName,
      mimeType: row.mimeType,
      sizeBytes: row.sizeBytes,
      uploadedAt: row.createdAt.toISOString(),
      uploadedBy: uploadedByDisplayName,
      customer: row.customer,
      fileUrl: row.fileUrl,
    }
  }
}
