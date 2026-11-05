"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@ship-happens/ui/components/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@ship-happens/ui/components/alert-dialog"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@ship-happens/ui/components/empty"
import { Label } from "@ship-happens/ui/components/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@ship-happens/ui/components/sheet"
import { Textarea } from "@ship-happens/ui/components/textarea"
import { useServerMutation } from "@/hooks/use-server-mutation"
import type {
  RfpPendingReviewView,
  RfpProgressStepView,
  RfpStatus,
} from "@/lib/domain/rfp/rfp.types"
import {
  decideReviewItem,
  decideReviewItemsBulk,
} from "@/lib/server/actions/reviews"
import { formatDateTime } from "@/lib/shared/string"

type SheetMode = "actions" | "edit" | "reject"
type BulkKind = "approve" | "reject" | null

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
          <div>
            <p className="text-xs font-medium text-muted-foreground">Proposal</p>
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
                Ask in Chat
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

export function RfpReviewsPanel({
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
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { mutate, pending } = useServerMutation()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [bulkKind, setBulkKind] = useState<BulkKind>(null)
  const [bulkRejectNote, setBulkRejectNote] = useState("")
  const active = pendingReviews.find((item) => item.id === activeId) ?? null
  const agentWorking = isAgentWorking(status, progressSteps)
  const count = pendingReviews.length

  const stepFilterHint = useMemo(() => {
    const keys = new Set(
      pendingReviews.map((r) => r.stepKey).filter(Boolean) as string[]
    )
    return keys.size <= 1 ? [...keys][0] ?? null : null
  }, [pendingReviews])

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
    next.set("tab", "reviews")
    router.replace(`${pathname}?${next.toString()}`, { scroll: false })
  }

  async function runBulk() {
    if (!bulkKind) return
    if (bulkKind === "reject" && !bulkRejectNote.trim()) return
    await mutate(
      () =>
        decideReviewItemsBulk(fillId, {
          decision: bulkKind === "approve" ? "approved" : "rejected",
          decisionNote:
            bulkKind === "reject" ? bulkRejectNote.trim() : undefined,
          stepKey: stepFilterHint ?? undefined,
        }),
      {
        successMessage:
          bulkKind === "approve" ? "Approved all pending" : "Rejected all pending",
      }
    )
    setBulkKind(null)
    setBulkRejectNote("")
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-medium tracking-tight">Reviews</h2>
          <p className="text-sm text-muted-foreground">
            Confirm, edit, or reject agent proposals. Bulk actions apply to all
            pending items
            {stepFilterHint ? ` in step “${stepFilterHint}”` : ""}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            disabled={pending || count === 0}
            onClick={() => setBulkKind("approve")}
          >
            Approve all
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending || count === 0}
            onClick={() => setBulkKind("reject")}
          >
            Cancel all
          </Button>
          {count > 0 ? (
            <span className="tabular self-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {count} pending
            </span>
          ) : null}
        </div>
      </div>

      {count === 0 ? (
        <Empty className="min-h-[160px] border border-dashed border-border bg-card p-6">
          <EmptyHeader>
            <EmptyTitle className="text-sm">
              {agentWorking
                ? "Nothing waiting — agent working"
                : "No pending reviews"}
            </EmptyTitle>
            <EmptyDescription>
              {agentWorking
                ? "The agent is still running. Review cards appear here when it submits a proposal."
                : "When the agent opens a review item, it shows up here."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="flex flex-col gap-2">
          {pendingReviews.map((item) => {
            const step = stepLabel(item.stepKey, progressSteps)
            const { summary, rationale } = proposalCopy(item.proposal)
            return (
              <li
                key={item.id}
                className="rounded-[6px] border border-border bg-card p-3"
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
                      disabled={pending}
                      onClick={() =>
                        void mutate(
                          () =>
                            decideReviewItem(fillId, item.id, {
                              decision: "approved",
                            }),
                          { successMessage: "Confirmed" }
                        )
                      }
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
                      Ask in Chat
                    </Button>
                  </div>
                </div>
              </li>
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

      <AlertDialog
        open={bulkKind != null}
        onOpenChange={(open) => {
          if (!open) {
            setBulkKind(null)
            setBulkRejectNote("")
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bulkKind === "approve" ? "Approve all pending?" : "Cancel all pending?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {bulkKind === "approve"
                ? `Confirm ${count} pending review${count === 1 ? "" : "s"}. Map proposals will be written; export sign-off unlocks download.`
                : `Reject ${count} pending review${count === 1 ? "" : "s"}. The agent can follow up after rejection.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {bulkKind === "reject" ? (
            <div className="flex flex-col gap-2 px-1">
              <Label htmlFor="bulk-reject-note">Reason (required)</Label>
              <Textarea
                id="bulk-reject-note"
                value={bulkRejectNote}
                onChange={(e) => setBulkRejectNote(e.target.value)}
                rows={3}
                placeholder="Short reason for canceling all"
                disabled={pending}
              />
            </div>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Back</AlertDialogCancel>
            <AlertDialogAction
              disabled={
                pending ||
                (bulkKind === "reject" && !bulkRejectNote.trim())
              }
              onClick={(e) => {
                e.preventDefault()
                void runBulk()
              }}
            >
              {bulkKind === "approve" ? "Approve all" : "Cancel all"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
