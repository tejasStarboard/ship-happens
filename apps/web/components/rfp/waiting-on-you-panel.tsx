"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { motion, useReducedMotion } from "motion/react"
import { Button } from "@workspace/ui/components/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@workspace/ui/components/empty"
import { Label } from "@workspace/ui/components/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
import { Textarea } from "@workspace/ui/components/textarea"
import { useServerMutation } from "@/hooks/use-server-mutation"
import type {
  RfpPendingReviewView,
  RfpProgressStepView,
  RfpStatus,
} from "@/lib/domain/rfp/rfp.types"
import { decideReviewItem } from "@/lib/server/actions/reviews"
import { formatDateTime } from "@/lib/shared/string"

type SheetMode = "actions" | "edit" | "reject"

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

function editPrefill(proposal: Record<string, unknown>): string {
  const value = asString(proposal.value) ?? asString(proposal.summary)
  if (value) return value
  try {
    const compact = JSON.stringify(proposal, null, 2)
    return compact === "{}" ? "" : compact
  } catch {
    return ""
  }
}

function contextBits(
  proposal: Record<string, unknown>,
  sourceMetadata: Record<string, unknown> | null
): string[] {
  const meta = sourceMetadata ?? {}
  const sheet =
    asString(proposal.sheet) ??
    asString(meta.sheet) ??
    asString(proposal.sheetName) ??
    asString(meta.sheetName)
  const lane = asString(proposal.lane) ?? asString(meta.lane)
  const column =
    asString(proposal.column) ??
    asString(proposal.col) ??
    asString(meta.column) ??
    asString(meta.col)
  const bits: string[] = []
  if (sheet) bits.push(`Sheet ${sheet}`)
  if (lane) bits.push(`Lane ${lane}`)
  if (column) bits.push(`Column ${column}`)
  return bits
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
  // Open waits set fill to needs_review — empty copy should not say agent working.
  if (status === "needs_review") return false
  if (status === "running") return true
  return steps.some(
    (step) => step.status === "running" && !step.blockedByReview
  )
}

function ReviewDetailSheet({
  fillId,
  item,
  step,
  open,
  onOpenChange,
  onAskAgent,
}: {
  fillId: string
  item: RfpPendingReviewView | null
  step: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onAskAgent: (reviewId: string) => void
}) {
  const { mutate, pending } = useServerMutation()
  const [mode, setMode] = useState<SheetMode>("actions")
  const [editValue, setEditValue] = useState("")
  const [rejectReason, setRejectReason] = useState("")

  useEffect(() => {
    if (!item || !open) {
      setMode("actions")
      setEditValue("")
      setRejectReason("")
      return
    }
    setMode("actions")
    setEditValue(editPrefill(item.proposal))
    setRejectReason("")
  }, [item, open])

  if (!item) return null

  const { summary, rationale } = proposalCopy(item.proposal)
  const context = contextBits(item.proposal, item.sourceMetadata)
  const rejectReady = rejectReason.trim().length > 0
  const editReady = editValue.trim().length > 0

  async function runDecide(
    input: Parameters<typeof decideReviewItem>[2],
    successMessage: string
  ) {
    await mutate(() => decideReviewItem(fillId, item!.id, input), {
      successMessage,
    })
    onOpenChange(false)
  }

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
          {context.length > 0 ? (
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Context
              </p>
              <p className="mt-1 text-sm">{context.join(" · ")}</p>
            </div>
          ) : null}
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

          {mode === "edit" ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor={`review-edit-${item.id}`}>Edited value</Label>
              <Textarea
                id={`review-edit-${item.id}`}
                value={editValue}
                onChange={(event) => setEditValue(event.target.value)}
                rows={4}
                disabled={pending}
              />
            </div>
          ) : null}

          {mode === "reject" ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor={`review-reject-${item.id}`}>
                Rejection reason
              </Label>
              <Textarea
                id={`review-reject-${item.id}`}
                value={rejectReason}
                onChange={(event) => setRejectReason(event.target.value)}
                rows={3}
                placeholder="Short reason required"
                disabled={pending}
              />
            </div>
          ) : null}

          <p className="text-xs text-muted-foreground">
            Opened {formatDateTime(item.createdAt)}
          </p>
        </div>
        <SheetFooter>
          {mode === "actions" ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={pending}
                onClick={() =>
                  void runDecide({ decision: "approved" }, "Confirmed")
                }
              >
                Confirm
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => setMode("edit")}
              >
                Edit
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => setMode("reject")}
              >
                Reject
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={pending}
                onClick={() => {
                  onAskAgent(item.id)
                  onOpenChange(false)
                }}
              >
                Ask in Agent
              </Button>
            </div>
          ) : null}

          {mode === "edit" ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={pending || !editReady}
                onClick={() =>
                  void runDecide(
                    {
                      decision: "edited",
                      resolution: { value: editValue.trim() },
                    },
                    "Saved edit"
                  )
                }
              >
                Save edit
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={pending}
                onClick={() => setMode("actions")}
              >
                Cancel
              </Button>
            </div>
          ) : null}

          {mode === "reject" ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="destructive"
                disabled={pending || !rejectReady}
                onClick={() =>
                  void runDecide(
                    {
                      decision: "rejected",
                      decisionNote: rejectReason.trim(),
                    },
                    "Rejected"
                  )
                }
              >
                Reject
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={pending}
                onClick={() => setMode("actions")}
              >
                Cancel
              </Button>
            </div>
          ) : null}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export function WaitingOnYouPanel({
  fillId,
  pendingReviews,
  progressSteps,
  status,
  initialReviewId,
  onAskAgent,
}: {
  fillId: string
  pendingReviews: RfpPendingReviewView[]
  progressSteps: RfpProgressStepView[]
  status: RfpStatus
  initialReviewId?: string | null
  onAskAgent: (reviewId: string) => void
}) {
  const reduce = useReducedMotion()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [activeId, setActiveId] = useState<string | null>(null)
  const active = pendingReviews.find((item) => item.id === activeId) ?? null
  const agentWorking = isAgentWorking(status, progressSteps)

  useEffect(() => {
    if (!initialReviewId) return
    if (!pendingReviews.some((item) => item.id === initialReviewId)) return
    setActiveId(initialReviewId)
  }, [initialReviewId, pendingReviews])

  function clearReviewQuery() {
    if (!searchParams.has("review")) return
    const next = new URLSearchParams(searchParams.toString())
    next.delete("review")
    const query = next.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  function openReview(id: string) {
    setActiveId(id)
    const next = new URLSearchParams(searchParams.toString())
    next.set("review", id)
    router.replace(`${pathname}?${next.toString()}`, { scroll: false })
  }

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
                      onClick={() => openReview(item.id)}
                    >
                      Confirm
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => openReview(item.id)}
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
        fillId={fillId}
        item={active}
        step={stepLabel(active?.stepKey ?? null, progressSteps)}
        open={activeId != null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setActiveId(null)
            clearReviewQuery()
          }
        }}
        onAskAgent={onAskAgent}
      />
    </section>
  )
}
