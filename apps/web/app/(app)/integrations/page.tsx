import { createAppContext } from "@/lib/di/create-app-context"
import { requireOrgSession } from "@/lib/auth/session"
import { IntegrationsPage } from "@/components/integrations/integrations-page"
import { env } from "@/env"

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
      gmailRedirectUri={`${env.APP_URL}/api/integrations/gmail/callback`}
      flash={{
        connected: params.connected ?? null,
        error: params.error ?? null,
      }}
    />
  )
}
