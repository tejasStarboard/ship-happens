"use client"

import { useState } from "react"
import { Button } from "@workspace/ui/components/button"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import { WorkspaceShell } from "@/app/_components/workspace/workspace-shell"
import { FillFlowRail } from "@/components/rfp/fill-flow-rail"
import { FillOverviewDashboard } from "@/components/rfp/fill-overview-dashboard"
import { ComingSoonEmpty } from "@/components/shared/coming-soon"
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

function statusPillClass(status: RfpStatus) {
  switch (status) {
    case "done":
      return "status-pill status-pill-positive"
    case "failed":
      return "status-pill status-pill-negative"
    case "running":
    case "needs_review":
      return "status-pill status-pill-warning"
    default:
      return "status-pill status-pill-neutral"
  }
}

export function RfpDetail({ rfp }: { rfp: RfpDetailView }) {
  const [tab, setTab] = useState<FillTab>("overview")
  const action = primaryAction(rfp.status)

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 px-4 py-4 md:py-6 lg:px-6">
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-[26px] leading-tight font-semibold tracking-tight">
              {rfp.name}
            </h1>
            <span className={statusPillClass(rfp.status)}>
              {RFP_STATUS_LABEL[rfp.status]}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {rfp.customer || "—"} · {rfp.templateName || "—"}
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

      <FillFlowRail status={rfp.status} className="shrink-0" />

      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as FillTab)}
        className="flex min-h-0 flex-1 flex-col gap-0"
      >
        <TabsList
          variant="line"
          className="h-auto w-fit shrink-0 gap-4 rounded-none border-b border-border bg-transparent p-0"
        >
          {(
            [
              ["overview", "Overview"],
              ["map", "Map"],
              ["review", "Review"],
              ["chat", "Agent"],
            ] as const
          ).map(([value, label]) => (
            <TabsTrigger
              key={value}
              value={value}
              className="rounded-none px-0 pb-2 text-sm"
            >
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-4 overflow-auto">
          <FillOverviewDashboard rfp={rfp} onAskAgent={() => setTab("chat")} />
        </TabsContent>

        <TabsContent value="map" className="mt-4 overflow-auto">
          <ComingSoonEmpty
            title="Map"
            description="Confirm BCO columns and lanes against Starboard concepts before rates run. Schema mapping ships after the Starboard client and capability catalog. Low-confidence matches will require human confirm here."
          />
        </TabsContent>

        <TabsContent value="review" className="mt-4 overflow-auto">
          <div className="flex flex-col gap-4">
            <ComingSoonEmpty
              title="Review"
              description="Cell-level fill outcomes, buy-rate source, overlays, and approvals before export."
            />
            <div className="grid gap-3 sm:grid-cols-3">
              {(
                [
                  ["Filled", "—"],
                  ["Skipped", "—"],
                  ["Needs human", "—"],
                ] as const
              ).map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-[6px] border border-border bg-card p-3"
                >
                  <p className="tabular text-[20px] font-semibold">{value}</p>
                  <p className="text-sm text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent
          value="chat"
          className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[6px] border border-border data-hidden:hidden"
        >
          {tab === "chat" ? (
            <WorkspaceShell embedded workspaceId={rfp.id} />
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  )
}
