import { FillExportSettingsForm } from "@/components/settings/fill-export-settings-form"
import { PageChrome } from "@/components/shared/page-chrome"

export default function FillExportSettingsPage() {
  return (
    <PageChrome
      title="Fill export"
      description="Org policy for unexpected Starboard fees when exporting filled BCO sheets."
      className="mx-auto w-full max-w-3xl"
    >
      <FillExportSettingsForm />
    </PageChrome>
  )
}
