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
import { FillOverviewDashboard } from "@/components/rfp/fill-overview-dashboard"
import {
  RFP_STATUS_LABEL,
  type RfpDetailView,
  type RfpStatus,
} from "@/lib/domain/rfp/rfp.types"

type FillTab = "overview" | "map" | "review" | "chat"

function primaryAction(status: RfpStatus): {
  label: string
  tab: FillTab
} {
  switch (status) {
    case "needs_review":
      return { label: "Continue review", tab: "review" }
    case "queued":
    case "running":
      return { label: "View overview", tab: "overview" }
    case "done":
      return { label: "View overview", tab: "overview" }
    case "failed":
      return { label: "View overview", tab: "overview" }
    default:
      return { label: "View overview", tab: "overview" }
  }
}

export function RfpDetail({ rfp }: { rfp: RfpDetailView }) {
  const [tab, setTab] = useState<FillTab>("overview")
  const action = primaryAction(rfp.status)

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
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setTab(action.tab)}
          >
            {action.label}
          </Button>
          <Button variant="outline" size="sm" disabled={!rfp.filledFileUrl}>
            Download filled
          </Button>
          <Button size="sm" disabled>
            Retry
          </Button>
        </div>
      </div>

      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as FillTab)}
        className="flex min-h-0 flex-1 flex-col gap-0"
      >
        <TabsList className="w-fit shrink-0">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="map">Map</TabsTrigger>
          <TabsTrigger value="review">Review</TabsTrigger>
          <TabsTrigger value="chat">Agent</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 overflow-auto">
          <FillOverviewDashboard rfp={rfp} />
        </TabsContent>

        <TabsContent value="map" className="mt-4 overflow-auto">
          <Card>
            <CardHeader>
              <CardTitle>Map</CardTitle>
              <CardDescription>
                Confirm BCO columns and lanes against Starboard concepts before
                rates run.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Schema mapping UI ships after the Starboard client and capability
              catalog. Low-confidence matches will require human confirm here.
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="review" className="mt-4 overflow-auto">
          <Card>
            <CardHeader>
              <CardTitle>Review</CardTitle>
              <CardDescription>
                Cell-level fill outcomes, buy-rate source, overlays, and
                approvals before export.
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

        <TabsContent
          value="chat"
          className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border data-hidden:hidden"
        >
          {tab === "chat" ? (
            <WorkspaceShell embedded workspaceId={rfp.id} />
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  )
}
