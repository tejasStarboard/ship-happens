"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Badge } from "@ship-happens/ui/components/badge"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@ship-happens/ui/components/tabs"
import { useSetBreadcrumbLeaf } from "@/components/breadcrumb-leaf"
import { FillManageMenu } from "@/components/rfp/fill-manage-menu"
import { FillReviewPanel } from "@/components/rfp/fill-review-panel"
import { RfpChatPanel } from "@/components/rfp/rfp-chat-panel"
import { RfpFilesPanel } from "@/components/rfp/rfp-files-panel"
import { RfpReviewsPanel } from "@/components/rfp/rfp-reviews-panel"
import {
  RFP_STATUS_LABEL,
  type RfpDetailView,
  type RfpStatus,
} from "@/lib/domain/rfp/rfp.types"
import { Separator } from "@ship-happens/ui/components/separator"

type FillTab = "chat" | "files" | "quotes" | "reviews"

function parseTab(value: string | null): FillTab | null {
  if (
    value === "chat" ||
    value === "files" ||
    value === "quotes" ||
    value === "reviews"
  ) {
    return value
  }
  return null
}

function primaryAction(status: RfpStatus): {
  label: string
  tab: FillTab
} {
  switch (status) {
    case "needs_review":
      return { label: "Open reviews", tab: "reviews" }
    default:
      return { label: "Open chat", tab: "chat" }
  }
}

function statusPillClass(status: RfpStatus) {
  switch (status) {
    case "done":
      return "status-pill status-pill-positive"
    case "failed":
    case "cancelled":
      return "status-pill status-pill-negative"
    case "running":
    case "needs_review":
      return "status-pill status-pill-warning"
    default:
      return "status-pill status-pill-neutral"
  }
}

export function RfpDetail({ rfp }: { rfp: RfpDetailView }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const reviewParam = searchParams.get("review")
  const tabParam = parseTab(searchParams.get("tab"))
  const [tab, setTab] = useState<FillTab>(
    tabParam ?? (reviewParam ? "reviews" : "chat")
  )
  const [chatInsert, setChatInsert] = useState<string | null>(null)
  const [agentResetKey, setAgentResetKey] = useState(0)
  const [filesRefreshKey, setFilesRefreshKey] = useState(0)
  const action = primaryAction(rfp.status)
  const pendingCount = rfp.pendingReviews?.length ?? 0

  useSetBreadcrumbLeaf(rfp.name)

  useEffect(() => {
    if (reviewParam) setTab("reviews")
    else if (tabParam) setTab(tabParam)
  }, [reviewParam, tabParam])

  function selectTab(next: FillTab) {
    setTab(next)
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", next)
    if (next !== "reviews") params.delete("review")
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden px-4 py-2 lg:px-6">
      <Tabs
        value={tab}
        onValueChange={(value) => selectTab(value as FillTab)}
        className="flex min-h-0 flex-1 flex-col gap-0"
      >
        <div className="flex shrink-0 items-end justify-between gap-3">
          <TabsList
            variant="line"
            className="h-auto w-fit shrink-0 gap-4 rounded-none bg-transparent p-0"
          >
            {(
              [
                ["chat", "Chat"],
                ["files", "Files"],
                ["quotes", "Quote"],
                ["reviews", "Reviews"],
              ] as const
            ).map(([value, label]) => (
              <TabsTrigger
                key={value}
                value={value}
                className="rounded-none px-0 pb-1.5 text-sm"
              >
                {label}
                {value === "reviews" && pendingCount > 0
                  ? ` (${pendingCount})`
                  : ""}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="flex shrink-0 items-center gap-2 pb-1.5">
            <span className={`${statusPillClass(rfp.status)} shrink-0`}>
              {RFP_STATUS_LABEL[rfp.status]}
            </span>
            {(rfp.roundNumber ?? 1) > 1 ? (
              <Badge variant="secondary" className="shrink-0">
                R{rfp.roundNumber}
              </Badge>
            ) : null}
            <FillManageMenu
              fillId={rfp.id}
              name={rfp.name}
              customer={rfp.customer}
              status={rfp.status}
              size="sm"
              detailActions={{
                primaryAction: {
                  label: action.label,
                  onSelect: () => selectTab(action.tab),
                },
                startNextRound: {
                  parentFillId: rfp.id,
                  parentName: rfp.name,
                  parentCustomer: rfp.customer,
                  roundNumber: rfp.roundNumber ?? 1,
                },
                exportFill: {
                  fillId: rfp.id,
                  pendingReviewCount: pendingCount,
                },
                download: {
                  filledFileUrl: rfp.filledFileUrl,
                  blockedReason: rfp.exportDownloadBlockedReason,
                },
                onAgentReset: () => setAgentResetKey((key) => key + 1),
                onSheetReset: () => setFilesRefreshKey((key) => key + 1),
              }}
            />
          </div>
        </div>

        <Separator />

        {/*
          Keep the fill agent mounted when switching Files/Quote/Reviews so an
          in-flight Eve session is not torn down mid-turn.
        */}
        <div
          className={
            tab === "chat"
              ? "mt-2 flex min-h-0 flex-1 flex-col overflow-hidden"
              : "hidden"
          }
          aria-hidden={tab !== "chat"}
        >
          <RfpChatPanel
            key={`${rfp.id}-agent-${agentResetKey}`}
            workspaceId={rfp.id}
            insertText={chatInsert}
            onInsertTextConsumed={() => setChatInsert(null)}
          />
        </div>

        <TabsContent
          value="files"
          className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden data-hidden:hidden"
        >
          <RfpFilesPanel key={`files-${filesRefreshKey}`} rfp={rfp} />
        </TabsContent>

        <TabsContent
          value="quotes"
          className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden data-hidden:hidden"
        >
          <FillReviewPanel fillReport={rfp.fillReport ?? null} />
        </TabsContent>

        <TabsContent
          value="reviews"
          className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden data-hidden:hidden"
        >
          <RfpReviewsPanel
            fillId={rfp.id}
            pendingReviews={rfp.pendingReviews ?? []}
            progressSteps={rfp.progressSteps}
            status={rfp.status}
            initialReviewId={reviewParam}
            onAskAgent={(reviewId) => {
              setChatInsert(
                `Help with review ${reviewId} on fill ${rfp.id}. Check reviews get / list and continue after my decision.`
              )
              selectTab("chat")
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
