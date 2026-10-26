import type {
  CreateMarginFloorRuleInput,
  MarginFloorRuleView,
  UpdateMarginFloorRuleInput,
} from "./margin-floor.types"
import type { MarginFloorRuleRepository } from "./margin-floor.repository"

export class MarginFloorRuleService {
  constructor(private readonly repo: MarginFloorRuleRepository) {}

  list(organizationId: string): Promise<MarginFloorRuleView[]> {
    return this.repo.listByOrganization(organizationId)
  }

  get(organizationId: string, id: string): Promise<MarginFloorRuleView | null> {
    return this.repo.findByIdForOrganization(organizationId, id)
  }

  create(
    organizationId: string,
    createdByUserId: string,
    input: CreateMarginFloorRuleInput
  ): Promise<MarginFloorRuleView> {
    return this.repo.create(organizationId, createdByUserId, input)
  }

  update(
    organizationId: string,
    id: string,
    input: UpdateMarginFloorRuleInput
  ): Promise<MarginFloorRuleView> {
    return this.repo.update(organizationId, id, input)
  }

  delete(organizationId: string, id: string): Promise<void> {
    return this.repo.delete(organizationId, id)
  }
}
