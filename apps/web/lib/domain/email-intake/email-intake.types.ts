export type IntegrationPublicView = {
  id: string
  provider: "gmail" | "outlook"
  accountEmail: string
  status: string
  watchExpiresAt: string | null
  lastError: string | null
  updatedAt: string
}
