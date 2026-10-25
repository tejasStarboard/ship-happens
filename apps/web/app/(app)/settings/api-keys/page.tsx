import { redirect } from "next/navigation"
import { ApiKeysPanel } from "@/components/settings/api-keys-panel"
import { getOptionalOrgAdminSession } from "@/lib/auth/session"
import { listShAgentApiKeys } from "@/lib/server/actions/api-keys"

export default async function SettingsApiKeysPage() {
  const admin = await getOptionalOrgAdminSession()
  if (!admin) {
    redirect("/settings")
  }

  const listed = await listShAgentApiKeys()
  const keys = listed.ok ? listed.keys : []

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 lg:px-6">
      <div>
        <h1 className="font-heading text-[26px] leading-tight font-semibold tracking-tight">
          API keys
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Organization admin tools for Ship Happens agent /{" "}
          <code className="text-xs">sh-client</code> credentials.
        </p>
      </div>
      {!listed.ok ? (
        <p className="text-sm text-destructive">{listed.error}</p>
      ) : (
        <ApiKeysPanel initialKeys={keys} />
      )}
    </div>
  )
}
