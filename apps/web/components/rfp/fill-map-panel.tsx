"use client"

import { IconMap, IconRobot } from "@tabler/icons-react"
import { Button } from "@workspace/ui/components/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { DataTableShell } from "@/components/shared/page-chrome"
import type {
  RfpMappedLaneView,
  RfpProgressStepView,
} from "@/lib/domain/rfp/rfp.types"

function mapStepLabel(step: RfpProgressStepView | undefined) {
  if (!step) return null
  const status = step.status.replace(/_/g, " ")
  if (step.detail) return `${status} — ${step.detail}`
  return status
}

export function FillMapPanel({
  mappedLanes,
  mappingError,
  mapStep,
  onAskAgent,
}: {
  mappedLanes: RfpMappedLaneView[]
  mappingError: string | null
  mapStep: RfpProgressStepView | undefined
  onAskAgent: () => void
}) {
  const stepHint = mapStepLabel(mapStep)

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
            Fix with <code className="text-xs">sh-client mapping put</code> /{" "}
            <code className="text-xs">mapping import</code>, or repair workspace{" "}
            <code className="text-xs">mapping.json</code>, then re-open this
            tab.
          </p>
          <Button type="button" size="sm" onClick={onAskAgent}>
            <IconRobot data-icon="inline-start" />
            Open Agent
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  if (mappedLanes.length === 0) {
    return (
      <Empty className="min-h-[280px] border border-dashed border-border bg-card">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <IconMap aria-hidden />
          </EmptyMedia>
          <EmptyTitle>No mapped lanes yet</EmptyTitle>
          <EmptyDescription>
            Confirmed lanes live in Postgres. Persist with{" "}
            <code className="text-xs">sh-client mapping put</code> or{" "}
            <code className="text-xs">mapping import</code> (from workspace{" "}
            <code className="text-xs">mapping.json</code>), then resolve rates.
            Schema confirm UI is deferred.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          {stepHint ? (
            <p className="mb-3 text-center text-xs text-muted-foreground">
              Map step: {stepHint}
            </p>
          ) : null}
          <Button type="button" size="sm" onClick={onAskAgent}>
            <IconRobot data-icon="inline-start" />
            Open Agent
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-base font-medium tracking-tight">Mapped lanes</h2>
          <p className="text-sm text-muted-foreground">
            Confirmed lanes from Postgres ({mappedLanes.length} lane
            {mappedLanes.length === 1 ? "" : "s"}). Rates resolve reads this
            store; <code className="text-xs">mapping.json</code> is
            import/export only.
          </p>
          {stepHint ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Map step: {stepHint}
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onAskAgent}
        >
          <IconRobot data-icon="inline-start" />
          Edit in Agent
        </Button>
      </div>

      <DataTableShell>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-[38px] text-xs font-medium text-muted-foreground">
                Lane
              </TableHead>
              <TableHead className="h-[38px] text-xs font-medium text-muted-foreground">
                O → D
              </TableHead>
              <TableHead className="h-[38px] text-xs font-medium text-muted-foreground">
                Equipment
              </TableHead>
              <TableHead className="h-[38px] text-xs font-medium text-muted-foreground">
                Sheet / cell
              </TableHead>
              <TableHead className="h-[38px] text-xs font-medium text-muted-foreground">
                Surcharges
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mappedLanes.map((lane) => (
              <TableRow key={lane.laneId}>
                <TableCell className="align-top font-medium">
                  <div className="flex flex-col gap-0.5">
                    <span className="truncate" title={lane.laneId}>
                      {lane.laneId}
                    </span>
                    {lane.serviceType ? (
                      <span className="text-xs text-muted-foreground">
                        {lane.serviceType.replace(/_/g, " ")}
                      </span>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="tabular align-top text-sm">
                  {lane.originLocode} → {lane.destLocode}
                </TableCell>
                <TableCell className="align-top text-sm">
                  {lane.equipmentType}
                </TableCell>
                <TableCell className="align-top text-sm text-muted-foreground">
                  {[
                    lane.sheetName,
                    lane.cellRef,
                    lane.columnKey,
                    lane.rowIndex != null ? `row ${lane.rowIndex}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </TableCell>
                <TableCell className="align-top text-sm text-muted-foreground">
                  {lane.surchargeSlots.length > 0
                    ? lane.surchargeSlots.join(", ")
                    : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataTableShell>
    </div>
  )
}
