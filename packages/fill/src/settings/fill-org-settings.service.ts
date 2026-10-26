import { DomainError } from "../errors"
import {
  DEFAULT_UNEXPECTED_FEE_MODE,
  isUnexpectedFeeMode,
  type UnexpectedFeeMode,
} from "../rates/fee-bindings"
import type { FillOrgSettingsRepository } from "./fill-org-settings.repository"
import type {
  FillOrgSettingsView,
  UpdateFillOrgSettingsInput,
} from "./fill-org-settings.types"

export class FillOrgSettingsService {
  constructor(private readonly repo: FillOrgSettingsRepository) {}

  async get(organizationId: string): Promise<FillOrgSettingsView> {
    const existing = await this.repo.get(organizationId)
    if (existing) return existing
    return {
      organizationId,
      unexpectedFeeMode: DEFAULT_UNEXPECTED_FEE_MODE,
      updatedAt: new Date(0).toISOString(),
      createdAt: new Date(0).toISOString(),
    }
  }

  async getUnexpectedFeeMode(
    organizationId: string
  ): Promise<UnexpectedFeeMode> {
    const settings = await this.get(organizationId)
    return settings.unexpectedFeeMode
  }

  async update(
    organizationId: string,
    input: UpdateFillOrgSettingsInput
  ): Promise<FillOrgSettingsView> {
    if (!isUnexpectedFeeMode(input.unexpectedFeeMode)) {
      throw new DomainError(
        "unexpectedFeeMode must be soft_warn or hard_block",
        "VALIDATION"
      )
    }
    return this.repo.upsert({
      organizationId,
      unexpectedFeeMode: input.unexpectedFeeMode,
    })
  }
}
