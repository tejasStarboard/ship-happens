import { PageChrome } from "@/components/shared/page-chrome"
import { ComingSoonEmpty } from "@/components/shared/coming-soon"

export function OverlaysStub() {
  return (
    <PageChrome
      title="Overlays"
      description="Projected sell rates and floor-margin rules when Starboard has no buy rate — or when you need a markup on top."
    >
      <ComingSoonEmpty
        title="Coming in a later phase"
        description="Configure org- and customer-level projected overlays here. Fills will apply these during rate resolution and show them on the Review audit trail. No overlay rules yet."
      />
    </PageChrome>
  )
}
