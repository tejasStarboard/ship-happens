import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import { RfpAgentPanel } from "@/components/rfp/rfp-agent-panel"
import { RFP_STATUS_LABEL, type MockRfp } from "@/lib/mock/rfps"

export function RfpDetail({ rfp }: { rfp: MockRfp }) {
  return (
    <div className="flex flex-1 flex-col gap-4 px-4 py-4 md:py-6 lg:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {rfp.name}
            </h1>
            <Badge variant="outline">{RFP_STATUS_LABEL[rfp.status]}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {rfp.customer} · {rfp.templateName}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" disabled>
            Download filled
          </Button>
          <Button size="sm" disabled>
            Retry
          </Button>
        </div>
      </div>

      <Tabs defaultValue="chat" className="flex min-h-0 flex-1 flex-col">
        <TabsList>
          <TabsTrigger value="chat">Agent</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="report">Fill report</TabsTrigger>
        </TabsList>

        <TabsContent
          value="chat"
          className="mt-4 flex min-h-0 flex-1 flex-col data-hidden:hidden"
        >
          <RfpAgentPanel rfp={rfp} />
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Run logs</CardTitle>
              <CardDescription>
                Job step output for ops debugging.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="overflow-auto rounded-lg bg-muted p-3 font-mono text-xs text-muted-foreground">
                {`[step] parse-workbook ok
[step] fetch-rates pending
[sandbox] e2b session mock-id`}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="progress" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Progress</CardTitle>
              <CardDescription>High-level job stages.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              <p>✓ Upload received</p>
              <p>✓ Sheet parsed</p>
              <p>○ Rates resolved</p>
              <p>○ Cells written</p>
              <p>○ Report ready</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="report" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Fill report</CardTitle>
              <CardDescription>
                Placeholder summary of filled / skipped / needs-human cells.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border p-3">
                <p className="text-2xl font-semibold tabular-nums">42</p>
                <p className="text-sm text-muted-foreground">Filled</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-2xl font-semibold tabular-nums">7</p>
                <p className="text-sm text-muted-foreground">Skipped</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-2xl font-semibold tabular-nums">3</p>
                <p className="text-sm text-muted-foreground">Needs human</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
