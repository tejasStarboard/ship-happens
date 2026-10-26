"use client"

import { useState } from "react"
import {
  IconCheck,
  IconChevronDown,
  IconLoader2,
  IconX,
} from "@tabler/icons-react"
import { Avatar, AvatarFallback } from "@ship-happens/ui/components/avatar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@ship-happens/ui/components/collapsible"
import { cn } from "@ship-happens/ui/lib/utils"
import type {
  RfpLogView,
  RfpProgressStepView,
} from "@/lib/domain/rfp/rfp.types"

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase()
}

function formatDuration(startedAt: string | null, completedAt: string | null) {
  if (!startedAt || !completedAt) return null
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime()
  if (!Number.isFinite(ms) || ms < 0) return null
  const totalSec = Math.max(1, Math.round(ms / 1000))
  if (totalSec < 60) return `${totalSec}s`
  const mins = Math.floor(totalSec / 60)
  const secs = totalSec % 60
  return secs === 0 ? `${mins}m` : `${mins}m ${secs}s`
}

function statusBadge(step: RfpProgressStepView) {
  if (step.blockedByReview) {
    return {
      label: "Waiting on you",
      className:
        "bg-amber-500/15 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200",
    }
  }
  switch (step.status) {
    case "done": {
      const duration = formatDuration(step.startedAt, step.completedAt)
      return {
        label: duration ?? "Done",
        className:
          "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
      }
    }
    case "running":
      return {
        label: "Running",
        className:
          "bg-violet-500/15 text-violet-700 dark:bg-violet-500/25 dark:text-violet-300",
      }
    case "failed":
      return {
        label: "Failed",
        className: "bg-destructive/15 text-destructive dark:bg-destructive/25",
      }
    case "skipped":
      return {
        label: "Skipped",
        className: "bg-muted text-muted-foreground",
      }
    default:
      return {
        label: "Pending",
        className:
          "bg-amber-500/15 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200",
      }
  }
}

function StepIcon({ status }: { status: string }) {
  if (status === "done") {
    return (
      <span className="flex size-7 items-center justify-center rounded-full bg-foreground text-background shadow-sm">
        <IconCheck className="size-3.5" stroke={2.5} />
      </span>
    )
  }
  if (status === "running") {
    return (
      <span className="relative flex size-7 items-center justify-center rounded-full border-2 border-foreground/25 bg-background">
        <IconLoader2 className="size-3.5 animate-spin text-foreground" />
      </span>
    )
  }
  if (status === "failed") {
    return (
      <span className="flex size-7 items-center justify-center rounded-full bg-destructive text-white shadow-sm">
        <IconX className="size-3.5" stroke={2.5} />
      </span>
    )
  }
  return (
    <span className="flex size-7 items-center justify-center rounded-full border-2 border-muted-foreground/35 bg-background" />
  )
}

function defaultDetail(step: RfpProgressStepView, logs: RfpLogView[]) {
  if (step.detail) return step.detail
  const related = logs
    .filter((log) => log.stepKey === step.key)
    .map((log) => log.message)
  if (related.length > 0) return related[related.length - 1]!
  if (step.blockedByReview) {
    return (
      step.detail ??
      `${step.label} is blocked until open review waits are cleared.`
    )
  }
  switch (step.status) {
    case "done":
      return `${step.label} completed.`
    case "running":
      return `${step.label} is in progress…`
    case "failed":
      return `${step.label} failed.`
    case "skipped":
      return `${step.label} was skipped.`
    default:
      return `Waiting to start ${step.label.toLowerCase()}.`
  }
}

function TimelineStep({
  step,
  isLast,
  ownerName,
  detail,
  defaultOpen,
}: {
  step: RfpProgressStepView
  isLast: boolean
  ownerName: string
  detail: string
  defaultOpen: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const badge = statusBadge(step)
  const lineActive =
    step.status === "done" ||
    step.status === "running" ||
    Boolean(step.blockedByReview)

  return (
    <li className="relative flex gap-4 pb-8 last:pb-0">
      {!isLast ? (
        <span
          aria-hidden
          className={cn(
            "absolute top-7 bottom-0 left-[13px] w-px",
            lineActive ? "bg-foreground/70" : "bg-border"
          )}
        />
      ) : null}

      <div className="relative z-10 mt-0.5 shrink-0">
        <StepIcon status={step.status} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold tracking-tight">
            {step.label}
          </h3>
          <span
            className={cn(
              "inline-flex h-5 items-center rounded-full px-2 text-[11px] font-medium",
              badge.className
            )}
          >
            {badge.label}
          </span>
        </div>

        <Collapsible open={open} onOpenChange={setOpen}>
          <div className="overflow-hidden rounded-xl border bg-card text-card-foreground shadow-xs">
            <CollapsibleTrigger className="flex w-full items-center gap-2.5 px-3.5 py-3 text-left hover:bg-muted/40">
              <Avatar size="sm">
                <AvatarFallback className="text-[10px] font-medium">
                  {initials(ownerName)}
                </AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                {ownerName}
              </span>
              <IconChevronDown
                className={cn(
                  "size-4 shrink-0 text-muted-foreground transition-transform",
                  open && "rotate-180"
                )}
              />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="border-t px-3.5 pt-0 pb-3.5">
                <div className="mt-3 rounded-lg bg-muted/70 px-3 py-2.5 text-sm leading-relaxed text-muted-foreground">
                  {detail}
                </div>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      </div>
    </li>
  )
}

export function FillProgressTimeline({
  steps,
  logs,
  ownerName,
}: {
  steps: RfpProgressStepView[]
  logs: RfpLogView[]
  ownerName: string
}) {
  if (steps.length === 0) {
    return (
      <div className="rounded-xl border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
        No progress steps recorded yet.
      </div>
    )
  }

  return (
    <ol className="m-0 list-none p-0">
      {steps.map((step, index) => {
        const defaultOpen =
          step.status === "running" ||
          step.status === "failed" ||
          Boolean(step.blockedByReview) ||
          (step.status === "done" && Boolean(step.detail))
        return (
          <TimelineStep
            key={step.id}
            step={step}
            isLast={index === steps.length - 1}
            ownerName={ownerName}
            detail={defaultDetail(step, logs)}
            defaultOpen={defaultOpen || index === 0}
          />
        )
      })}
    </ol>
  )
}
