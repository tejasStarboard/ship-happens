import { OverlaysPanel } from "@/components/overlays/overlays-panel"
import { requireOrgSession } from "@/lib/server/session"
import { listOverlayRules } from "@/lib/server/actions/overlays"

export default async function OverlaysPage() {
  await requireOrgSession()
  const listed = await listOverlayRules()
  const rules = listed.ok ? listed.rules : []

  return (
    <>
      {!listed.ok ? (
        <div className="px-4 pt-4 text-sm text-destructive lg:px-6">
          {listed.error}
        </div>
      ) : null}
      <OverlaysPanel initialRules={rules} />
    </>
  )
}
