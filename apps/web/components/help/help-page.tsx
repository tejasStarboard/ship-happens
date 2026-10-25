import { PageChrome } from "@/components/shared/page-chrome"

export function HelpPage() {
  return (
    <PageChrome
      title="Help"
      description="How Ship Happens fits with Starboard, and where to get support."
    >
      <div className="rounded-[6px] border border-border bg-card p-4">
        <h2 className="text-base font-semibold">Product overview</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Ship Happens fills BCO bid sheets using Starboard rates and your
          projected overlays — it does not replace Starboard’s rate library,
          CRM, or FCLv6 vendor ingest.
        </p>
        <div className="mt-4 flex flex-col gap-2 text-sm text-muted-foreground">
          <p>
            Typical flow: start a fill from Fills → confirm the Map → review
            cells → download a cell-compliant workbook.
          </p>
          <p>
            For product questions, ping the Auto RFP sheet filler project on
            Linear or your Starboard contact.
          </p>
        </div>
      </div>
    </PageChrome>
  )
}
