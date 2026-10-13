import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

export function HelpPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 px-4 py-4 md:py-6 lg:px-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Help</h1>
        <p className="text-sm text-muted-foreground">
          How Ship Happens fits with Starboard, and where to get support.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Product overview</CardTitle>
          <CardDescription>
            Ship Happens fills BCO bid sheets using Starboard rates and your
            projected overlays — it does not replace Starboard’s rate library,
            CRM, or FCLv6 vendor ingest.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
          <p>
            Typical flow: start a fill from Fills → confirm the Map → review
            cells → download a cell-compliant workbook.
          </p>
          <p>
            For product questions, ping the Auto RFP sheet filler project on
            Linear or your Starboard contact.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
