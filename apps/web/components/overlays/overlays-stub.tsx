import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

export function OverlaysStub() {
  return (
    <div className="flex flex-1 flex-col gap-4 px-4 py-4 md:py-6 lg:px-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overlays</h1>
        <p className="text-sm text-muted-foreground">
          Projected sell rates and floor-margin rules for when Starboard has no
          buy rate — or when you need a markup on top of one.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming in a later phase</CardTitle>
          <CardDescription>
            Configure org- and customer-level projected overlays here. Fills
            will apply these rules during rate resolution and show them on the
            Review tab audit trail.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No overlay rules yet. This page is a navigation stub so the product
          information architecture matches the PRD.
        </CardContent>
      </Card>
    </div>
  )
}
