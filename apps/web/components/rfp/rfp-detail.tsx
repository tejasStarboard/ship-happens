"use client"

import { useState } from "react"
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
import { WorkspaceShell } from "@/app/_components/workspace/workspace-shell"
import { RFP_STATUS_LABEL } from "@/lib/mock/rfps"
import type { RfpListItem } from "@/lib/server/rfps"

export function RfpDetail({ rfp }: { rfp: RfpListItem }) {
  // Lazy-mount Agent workspace so switching away unmounts the eve shell.
  const [tab, setTab] = useState("chat")

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 px-4 py-4 md:py-6 lg:px-6">
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-3">
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

      <Tabs
        value={tab}
        onValueChange={setTab}
        className="flex min-h-0 flex-1 flex-col gap-0"
      >
        <TabsList className="w-fit shrink-0">
          <TabsTrigger value="chat">Agent</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="report">Fill report</TabsTrigger>
        </TabsList>

        <TabsContent
          value="chat"
          className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border data-hidden:hidden"
        >
          {tab === "chat" ? (
            <WorkspaceShell embedded workspaceId={rfp.id} />
          ) : null}
        </TabsContent>

        <TabsContent value="logs" className="mt-4 overflow-auto">
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
[sandbox] awaiting agent run`}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="progress" className="mt-4 overflow-auto">
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

        <TabsContent value="report" className="mt-4 overflow-auto">
          <Card>
            <CardHeader>
              <CardTitle>Fill report</CardTitle>
              <CardDescription>
                Summary of filled / skipped / needs-human cells after a run.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border p-3">
                <p className="text-2xl font-semibold tabular-nums">—</p>
                <p className="text-sm text-muted-foreground">Filled</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-2xl font-semibold tabular-nums">—</p>
                <p className="text-sm text-muted-foreground">Skipped</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-2xl font-semibold tabular-nums">—</p>
                <p className="text-sm text-muted-foreground">Needs human</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
