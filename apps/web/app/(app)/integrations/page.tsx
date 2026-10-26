import { createAppContext } from "@/lib/di/create-app-context"
import { requireOrgSession } from "@/lib/auth/session"
import { IntegrationsPage } from "@/components/integrations/integrations-page"

export default async function IntegrationsRoute({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>
}) {
  const { organizationId } = await requireOrgSession()
  const params = await searchParams
  const ctx = createAppContext()
  const integrations = await ctx.emailIntake.listIntegrations(organizationId)

  return (
    <IntegrationsPage
      integrations={integrations}
      flash={{
        connected: params.connected ?? null,
        error: params.error ?? null,
      }}
    />
  )
}
