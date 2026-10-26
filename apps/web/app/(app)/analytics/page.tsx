import { OpsAnalyticsPage } from "@/components/analytics/ops-analytics-page"
import { requireOrgSession } from "@/lib/auth/session"
import { createAppContext } from "@/lib/di/create-app-context"

export default async function AnalyticsRoute() {
  const { organizationId } = await requireOrgSession()
  const view =
    await createAppContext().analytics.getOrgOpsAnalytics(organizationId)

  return <OpsAnalyticsPage view={view} />
}
