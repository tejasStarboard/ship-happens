"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import {
  IconAlertTriangle,
  IconMap,
  IconPlus,
  IconRobot,
  IconTrash,
} from "@tabler/icons-react"
import {
  isLowConfidenceMapping,
  mappedLaneFromProposal,
  type MappedLane,
} from "@ship-happens/fill/browser"
import { toast } from "sonner"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty"
import { Input } from "@workspace/ui/components/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { DataTableShell } from "@/components/shared/page-chrome"
import { confirmFillMapping } from "@/lib/server/actions/mapping"
import { decideReviewItem } from "@/lib/server/actions/reviews"
import type {
  RfpMappedLaneView,
  RfpPendingReviewView,
  RfpProgressStepView,
} from "@/lib/domain/rfp/rfp.types"
import { useRouter } from "next/navigation"

type LaneDraft = {
  key: string
  laneId: string
  originLocode: string
  destLocode: string
  equipmentType: string
  serviceType: string
  sheetName: string
  columnKey: string
  cellRef: string
  rowIndex: string
  surchargeSlots: string
}

function mapStepLabel(step: RfpProgressStepView | undefined) {
  if (!step) return null
  const status = step.status.replace(/_/g, " ")
  if (step.detail) return `${status} — ${step.detail}`
  return status
}

function viewToDraft(lane: RfpMappedLaneView, index: number): LaneDraft {
  return {
    key: `existing-${lane.laneId}-${index}`,
    laneId: lane.laneId,
    originLocode: lane.originLocode,
    destLocode: lane.destLocode,
    equipmentType: lane.equipmentType,
    serviceType: lane.serviceType ?? "",
    sheetName: lane.sheetName ?? "",
    columnKey: lane.columnKey ?? "",
    cellRef: lane.cellRef ?? "",
    rowIndex: lane.rowIndex != null ? String(lane.rowIndex) : "",
    surchargeSlots: lane.surchargeSlots.join(", "),
  }
}

function emptyDraft(index: number): LaneDraft {
  return {
    key: `new-${Date.now()}-${index}`,
    laneId: "",
    originLocode: "",
    destLocode: "",
    equipmentType: "",
    serviceType: "",
    sheetName: "",
    columnKey: "",
    cellRef: "",
    rowIndex: "",
    surchargeSlots: "",
  }
}

function draftsToMappedLanes(drafts: LaneDraft[]): MappedLane[] {
  return drafts.map((draft, index) => {
    const originLocode = draft.originLocode.trim().toUpperCase()
    const destLocode = draft.destLocode.trim().toUpperCase()
    const equipmentType = draft.equipmentType.trim()
    if (!originLocode || !destLocode || !equipmentType) {
      throw new Error(
        `Lane ${index + 1}: origin, destination, and equipment are required`
      )
    }
    const laneId =
      draft.laneId.trim() ||
      `lane_${originLocode}_${destLocode}_${equipmentType}`.toLowerCase()
    const lane: MappedLane = {
      laneId,
      originLocode,
      destLocode,
      equipmentType,
    }
    if (draft.serviceType.trim()) {
      lane.serviceType = draft.serviceType.trim() as MappedLane["serviceType"]
    }
    if (draft.sheetName.trim()) lane.sheetName = draft.sheetName.trim()
    if (draft.columnKey.trim()) lane.columnKey = draft.columnKey.trim()
    if (draft.cellRef.trim()) lane.cellRef = draft.cellRef.trim()
    if (draft.rowIndex.trim()) {
      const rowIndex = Number(draft.rowIndex)
      if (!Number.isInteger(rowIndex)) {
        throw new Error(`Lane ${index + 1}: row index must be an integer`)
      }
      lane.rowIndex = rowIndex
    }
    const slots = draft.surchargeSlots
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
    if (slots.length > 0) lane.surchargeSlots = slots
    return lane
  })
}

function proposalSummary(proposal: Record<string, unknown>): string {
  const lane = mappedLaneFromProposal(proposal)
  if (lane) {
    return `${lane.originLocode} → ${lane.destLocode} · ${lane.equipmentType}`
  }
  try {
    const compact = JSON.stringify(proposal)
    if (compact === "{}") return "No proposal details"
    return compact.length > 80 ? `${compact.slice(0, 77)}…` : compact
  } catch {
    return "No proposal details"
  }
}

export function FillMapPanel({
  fillId,
  mappedLanes,
  mappingError,
  mapStep,
  pendingMapReviews,
  onAskAgent,
}: {
  fillId: string
  mappedLanes: RfpMappedLaneView[]
  mappingError: string | null
  mapStep: RfpProgressStepView | undefined
  pendingMapReviews: RfpPendingReviewView[]
  onAskAgent: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [drafts, setDrafts] = useState<LaneDraft[]>(() =>
    mappedLanes.length > 0 ? mappedLanes.map(viewToDraft) : [emptyDraft(0)]
  )
  const stepHint = mapStepLabel(mapStep)

  useEffect(() => {
    setDrafts(
      mappedLanes.length > 0 ? mappedLanes.map(viewToDraft) : [emptyDraft(0)]
    )
  }, [mappedLanes])

  const lowConfidenceCount = useMemo(
    () =>
      pendingMapReviews.filter((item) =>
        isLowConfidenceMapping(item.confidence)
      ).length,
    [pendingMapReviews]
  )

  function updateDraft(key: string, patch: Partial<LaneDraft>) {
    setDrafts((prev) =>
      prev.map((row) => (row.key === key ? { ...row, ...patch } : row))
    )
  }

  function addLane() {
    setDrafts((prev) => [...prev, emptyDraft(prev.length)])
  }

  function removeLane(key: string) {
    setDrafts((prev) => {
      const next = prev.filter((row) => row.key !== key)
      return next.length > 0 ? next : [emptyDraft(0)]
    })
  }

  function saveMapping() {
    startTransition(async () => {
      try {
        const lanes = draftsToMappedLanes(drafts)
        const result = await confirmFillMapping(fillId, lanes)
        if (!result.ok) {
          toast.error(result.error)
          return
        }
        toast.success(
          result.laneCount === 0
            ? "Mapping cleared"
            : `Confirmed ${result.laneCount} lane${result.laneCount === 1 ? "" : "s"}`
        )
        router.refresh()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Save failed")
      }
    })
  }

  function confirmMapReview(reviewId: string) {
    startTransition(async () => {
      try {
        await decideReviewItem(fillId, reviewId, { decision: "approved" })
        toast.success("Map review confirmed")
        router.refresh()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Confirm failed")
      }
    })
  }

  if (mappingError) {
    return (
      <Empty className="min-h-[280px] border border-dashed border-destructive/40 bg-card">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <IconMap aria-hidden />
          </EmptyMedia>
          <EmptyTitle>Mapping failed to load</EmptyTitle>
          <EmptyDescription>{mappingError}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <p className="mb-3 max-w-md text-center text-sm text-muted-foreground">
            Fix the store with Confirm mapping below after repair, or use{" "}
            <code className="text-xs">sh-client mapping put</code> /{" "}
            <code className="text-xs">mapping import</code>.
          </p>
          <Button type="button" size="sm" onClick={onAskAgent}>
            <IconRobot data-icon="inline-start" />
            Open Agent
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-base font-medium tracking-tight">
            Schema confirm
          </h2>
          <p className="text-sm text-muted-foreground">
            Review and confirm O-D / equipment lanes. Rates resolve reads only
            this confirmed store; pending map reviews block resolve.
          </p>
          {stepHint ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Map step: {stepHint}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onAskAgent}
            disabled={pending}
          >
            <IconRobot data-icon="inline-start" />
            Ask Agent
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={saveMapping}
            disabled={pending}
          >
            Confirm mapping
          </Button>
        </div>
      </div>

      {pendingMapReviews.length > 0 ? (
        <div className="flex flex-col gap-2 rounded-[6px] border border-amber-500/40 bg-amber-500/5 px-3 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <IconAlertTriangle
              className="size-4 text-amber-700 dark:text-amber-400"
              aria-hidden
            />
            <p className="text-sm font-medium tracking-tight">
              {pendingMapReviews.length} map review
              {pendingMapReviews.length === 1 ? "" : "s"} need action
            </p>
            {lowConfidenceCount > 0 ? (
              <Badge variant="secondary">
                {lowConfidenceCount} low confidence
              </Badge>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            Confirm lane-shaped proposals here or on Overview. Resolve rates
            stays blocked until these clear.
          </p>
          <ul className="flex flex-col gap-2">
            {pendingMapReviews.map((item) => {
              const laneShaped = mappedLaneFromProposal(item.proposal) != null
              const low = isLowConfidenceMapping(item.confidence)
              return (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-[6px] border border-border bg-card px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {proposalSummary(item.proposal)}
                      {item.confidence != null
                        ? ` · confidence ${item.confidence}`
                        : ""}
                      {low ? " · needs review" : ""}
                    </p>
                  </div>
                  {laneShaped ? (
                    <Button
                      type="button"
                      size="sm"
                      disabled={pending}
                      onClick={() => confirmMapReview(item.id)}
                    >
                      Confirm
                    </Button>
                  ) : (
                    <Badge variant="outline">Fill lane fields below</Badge>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}

      {mappedLanes.length === 0 &&
      drafts.every(
        (d) => !d.originLocode && !d.destLocode && !d.equipmentType
      ) ? (
        <Empty className="min-h-[160px] border border-dashed border-border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <IconMap aria-hidden />
            </EmptyMedia>
            <EmptyTitle>No confirmed lanes yet</EmptyTitle>
            <EmptyDescription>
              Add O-D / equipment rows below and Confirm mapping, or ask Agent
              (`mapping propose`) to resolve places via Jev — low-confidence
              lanes land as map reviews.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}

      <DataTableShell>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-[38px] text-xs font-medium text-muted-foreground">
                Lane id
              </TableHead>
              <TableHead className="h-[38px] text-xs font-medium text-muted-foreground">
                Origin
              </TableHead>
              <TableHead className="h-[38px] text-xs font-medium text-muted-foreground">
                Dest
              </TableHead>
              <TableHead className="h-[38px] text-xs font-medium text-muted-foreground">
                Equipment
              </TableHead>
              <TableHead className="h-[38px] text-xs font-medium text-muted-foreground">
                Sheet / column
              </TableHead>
              <TableHead className="h-[38px] w-10 text-xs font-medium text-muted-foreground">
                <span className="sr-only">Remove</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {drafts.map((draft) => (
              <TableRow key={draft.key}>
                <TableCell className="align-top">
                  <Input
                    value={draft.laneId}
                    placeholder="auto"
                    disabled={pending}
                    onChange={(e) =>
                      updateDraft(draft.key, { laneId: e.target.value })
                    }
                    className="h-8 font-mono text-xs"
                  />
                </TableCell>
                <TableCell className="align-top">
                  <Input
                    value={draft.originLocode}
                    placeholder="CNSHA"
                    disabled={pending}
                    onChange={(e) =>
                      updateDraft(draft.key, { originLocode: e.target.value })
                    }
                    className="tabular h-8 text-sm"
                  />
                </TableCell>
                <TableCell className="align-top">
                  <Input
                    value={draft.destLocode}
                    placeholder="USLAX"
                    disabled={pending}
                    onChange={(e) =>
                      updateDraft(draft.key, { destLocode: e.target.value })
                    }
                    className="tabular h-8 text-sm"
                  />
                </TableCell>
                <TableCell className="align-top">
                  <Input
                    value={draft.equipmentType}
                    placeholder="40HC"
                    disabled={pending}
                    onChange={(e) =>
                      updateDraft(draft.key, { equipmentType: e.target.value })
                    }
                    className="h-8 text-sm"
                  />
                </TableCell>
                <TableCell className="align-top">
                  <div className="flex flex-col gap-1">
                    <Input
                      value={draft.sheetName}
                      placeholder="Sheet"
                      disabled={pending}
                      onChange={(e) =>
                        updateDraft(draft.key, { sheetName: e.target.value })
                      }
                      className="h-8 text-sm"
                    />
                    <Input
                      value={draft.columnKey}
                      placeholder="Column key"
                      disabled={pending}
                      onChange={(e) =>
                        updateDraft(draft.key, { columnKey: e.target.value })
                      }
                      className="h-8 text-sm"
                    />
                  </div>
                </TableCell>
                <TableCell className="align-top">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={pending}
                    aria-label="Remove lane"
                    onClick={() => removeLane(draft.key)}
                  >
                    <IconTrash />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataTableShell>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={addLane}
        >
          <IconPlus data-icon="inline-start" />
          Add lane
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={saveMapping}
        >
          Confirm mapping
        </Button>
      </div>
    </div>
  )
}
