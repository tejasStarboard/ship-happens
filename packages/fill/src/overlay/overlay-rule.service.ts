import type {
  CreateOverlayRuleInput,
  OverlayRuleView,
  UpdateOverlayRuleInput,
} from "./overlay.types"
import type { OverlayRuleRepository } from "./overlay-rule.repository"

export class OverlayRuleService {
  constructor(private readonly repo: OverlayRuleRepository) {}

  list(organizationId: string): Promise<OverlayRuleView[]> {
    return this.repo.listByOrganization(organizationId)
  }

  get(organizationId: string, id: string): Promise<OverlayRuleView | null> {
    return this.repo.findByIdForOrganization(organizationId, id)
  }

  create(
    organizationId: string,
    createdByUserId: string,
    input: CreateOverlayRuleInput
  ): Promise<OverlayRuleView> {
    return this.repo.create(organizationId, createdByUserId, input)
  }

  update(
    organizationId: string,
    id: string,
    input: UpdateOverlayRuleInput
  ): Promise<OverlayRuleView> {
    return this.repo.update(organizationId, id, input)
  }

  delete(organizationId: string, id: string): Promise<void> {
    return this.repo.delete(organizationId, id)
  }
}
