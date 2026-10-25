"use client"

import { useState } from "react"
import { motion, useReducedMotion } from "motion/react"
import { Button } from "@workspace/ui/components/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@workspace/ui/components/empty"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
import type {
  RfpPendingReviewView,
  RfpProgressStepView,
  RfpStatus,
} from "@/lib/domain/rfp/rfp.types"
import { formatDateTime } from "@/lib/shared/string"

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function proposalCopy(proposal: Record<string, unknown>): {
  summary: string
  rationale: string | null
} {
  const rationale =
    asString(proposal.rationale) ??
    asString(proposal.why) ??
    asString(proposal.reason) ??
    null
  const summary =
    asString(proposal.summary) ??
    asString(proposal.description) ??
    asString(proposal.message) ??
    null
  if (summary) return { summary, rationale }
  try {
    const compact = JSON.stringify(proposal)
    return {
      summary:
        compact === "{}"
          ? "No proposal details yet."
          : compact.length > 160
            ? `${compact.slice(0, 157)}…`
            : compact,
      rationale,
    }
  } catch {
    return { summary: "No proposal details yet.", rationale }
  }
}

function stepLabel(
  stepKey: string | null,
  steps: RfpProgressStepView[]
): string {
  if (!stepKey) return "General"
  const match = steps.find((step) => step.key === stepKey)
  return match?.label ?? stepKey
}

function isAgentWorking(
  status: RfpStatus,
  steps: RfpProgressStepView[]
): boolean {
  if (status === "running") return true
  return steps.some((step) => step.status === "running")
}

function ReviewDetailSheet({
  item,
  step,
  open,
  onOpenChange,
  onAskAgent,
}: {
  item: RfpPendingReviewView | null
  step: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onAskAgent: (reviewId: string) => void
}) {
  if (!item) return null
  const { summary, rationale } = proposalCopy(item.proposal)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{item.title}</SheetTitle>
          <SheetDescription>
            {step}
            {item.source ? ` · ${item.source}` : ""}
            {item.confidence != null ? ` · confidence ${item.confidence}` : ""}
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-auto px-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              Proposal
            </p>
            <p className="mt-1 text-sm whitespace-pre-wrap">{summary}</p>
          </div>
          {rationale ? (
            <div>
              <p className="text-xs font-medium text-muted-foreground">Why</p>
              <p className="mt-1 text-sm whitespace-pre-wrap">{rationale}</p>
            </div>
          ) : null}
          <pre className="tabular max-h-48 overflow-auto rounded-[6px] border border-border bg-background p-3 text-xs text-muted-foreground">
            {JSON.stringify(item.proposal, null, 2)}
          </pre>
          <p className="text-xs text-muted-foreground">
            Opened {formatDateTime(item.createdAt)}
          </p>
        </div>
        <SheetFooter>
          <p className="text-xs text-muted-foreground">
            Confirm / Edit / Reject decisions ship in a follow-up. You can still
            discuss this item with the agent.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled title="Coming in SB-6659">
              Confirm
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onAskAgent(item.id)
                onOpenChange(false)
              }}
            >
              Ask in Agent
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export function WaitingOnYouPanel({
  pendingReviews,
  progressSteps,
  status,
  onAskAgent,
}: {
  pendingReviews: RfpPendingReviewView[]
  progressSteps: RfpProgressStepView[]
  status: RfpStatus
  onAskAgent: (reviewId: string) => void
}) {
  const reduce = useReducedMotion()
  const [activeId, setActiveId] = useState<string | null>(null)
  const active = pendingReviews.find((item) => item.id === activeId) ?? null
  const agentWorking = isAgentWorking(status, progressSteps)

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-medium tracking-tight">Waiting on you</h2>
          <p className="text-xs text-muted-foreground">
            Pending human review items for this fill.
          </p>
        </div>
        {pendingReviews.length > 0 ? (
          <span className="tabular rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {pendingReviews.length}
          </span>
        ) : null}
      </div>

      {pendingReviews.length === 0 ? (
        <Empty className="min-h-[120px] border border-dashed border-border bg-background p-4">
          <EmptyHeader>
            <EmptyTitle className="text-sm">
              {agentWorking
                ? "Nothing waiting — agent working"
                : "Nothing waiting on you"}
            </EmptyTitle>
            <EmptyDescription>
              {agentWorking
                ? "The agent is still running. Review cards appear here when it submits a proposal."
                : "When the agent opens a review item, it shows up here for confirm or follow-up."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="flex flex-col gap-2">
          {pendingReviews.map((item, index) => {
            const step = stepLabel(item.stepKey, progressSteps)
            const { summary, rationale } = proposalCopy(item.proposal)
            return (
              <motion.li
                key={item.id}
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: index * 0.04,
                  duration: 0.3,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="rounded-[6px] border border-border bg-background p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      {step}
                    </p>
                    <p className="mt-0.5 text-sm font-medium tracking-tight">
                      {item.title}
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {summary}
                    </p>
                    {rationale ? (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        Why: {rationale}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setActiveId(item.id)}
                    >
                      Confirm
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setActiveId(item.id)}
                    >
                      Details
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => onAskAgent(item.id)}
                    >
                      Ask in Agent
                    </Button>
                  </div>
                </div>
              </motion.li>
            )
          })}
        </ul>
      )}

      <ReviewDetailSheet
        item={active}
        step={stepLabel(active?.stepKey ?? null, progressSteps)}
        open={activeId != null}
        onOpenChange={(open) => {
          if (!open) setActiveId(null)
        }}
        onAskAgent={onAskAgent}
      />
    </section>
  )
}
