import type { UnexpectedFeeMode } from "../rates/fee-bindings"

export type FillOrgSettingsView = {
  organizationId: string
  unexpectedFeeMode: UnexpectedFeeMode
  updatedAt: string
  createdAt: string
}

export type UpdateFillOrgSettingsInput = {
  unexpectedFeeMode: UnexpectedFeeMode
}
