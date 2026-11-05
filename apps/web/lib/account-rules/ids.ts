/** Stable host workspace id for Mira / account-rules (not an RFP). */
export function accountRulesWorkspaceId(organizationId: string): string {
  return `account-rules-${organizationId}`
}
