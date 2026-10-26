import { FloorMarginsPanel } from "@/components/settings/floor-margins-panel"
import { listMarginFloorRules } from "@/lib/server/actions/margin-floors"

export default async function SettingsFloorMarginsPage() {
  const listed = await listMarginFloorRules()
  const rules = listed.ok ? listed.rules : []

  return (
    <div className="flex flex-col gap-2">
      {!listed.ok ? (
        <p className="px-4 pt-4 text-sm text-destructive lg:px-6">
          {listed.error}
        </p>
      ) : null}
      <FloorMarginsPanel initialRules={rules} />
    </div>
  )
}
