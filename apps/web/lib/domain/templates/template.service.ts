import { DomainError, type BlobStore } from "@ship-happens/fill"
import type { TemplateRepository } from "@/lib/domain/templates/template.repository"
import type { TemplateListItem } from "@/lib/domain/templates/template.types"

export class TemplateService {
  constructor(
    private readonly repo: TemplateRepository,
    private readonly blob?: BlobStore
  ) {}

  async list(
    organizationId: string,
    uploadedByDisplayName: string
  ): Promise<TemplateListItem[]> {
    const rows = await this.repo.listByOrganization(organizationId)
    return rows.map((row) => this.toListItem(row, uploadedByDisplayName))
  }

  async get(
    organizationId: string,
    id: string,
    uploadedByDisplayName: string
  ): Promise<TemplateListItem | null> {
    const row = await this.repo.findByIdForOrganization(organizationId, id)
    if (!row) return null
    return this.toListItem(row, uploadedByDisplayName)
  }

  async updateIdentity(
    organizationId: string,
    id: string,
    input: { name?: string; customer?: string | null },
    uploadedByDisplayName: string
  ): Promise<TemplateListItem> {
    const existing = await this.repo.findByIdForOrganization(organizationId, id)
    if (!existing) {
      throw new DomainError(`Template not found: ${id}`, "NOT_FOUND")
    }

    const patch: { name?: string; customer?: string | null } = {}
    if (input.name !== undefined) {
      const name = input.name.trim()
      if (!name) throw new DomainError("Name is required", "VALIDATION")
      if (name.length > 200) {
        throw new DomainError("Name is too long", "VALIDATION")
      }
      patch.name = name
    }
    if (input.customer !== undefined) {
      patch.customer = input.customer?.trim() || null
    }
    if (patch.name === undefined && patch.customer === undefined) {
      throw new DomainError("Nothing to update", "VALIDATION")
    }

    await this.repo.updateIdentity(organizationId, id, patch)
    const next = await this.get(organizationId, id, uploadedByDisplayName)
    if (!next) {
      throw new DomainError(`Template not found: ${id}`, "NOT_FOUND")
    }
    return next
  }

  async delete(organizationId: string, id: string): Promise<{ ok: true }> {
    const existing = await this.repo.findByIdForOrganization(organizationId, id)
    if (!existing) {
      throw new DomainError(`Template not found: ${id}`, "NOT_FOUND")
    }

    await this.repo.deleteForOrganization(organizationId, id)

    if (this.blob && existing.fileUrl) {
      try {
        await this.blob.delete(existing.fileUrl)
      } catch {
        // Blob may already be gone; DB row is the source of truth.
      }
    }

    return { ok: true }
  }

  private toListItem(
    row: {
      id: string
      name: string
      fileName: string
      mimeType: string
      sizeBytes: number
      createdAt: Date
      customer: string | null
      fileUrl: string
    },
    uploadedByDisplayName: string
  ): TemplateListItem {
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
