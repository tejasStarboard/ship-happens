"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@ship-happens/ui/components/button"
import { Input } from "@ship-happens/ui/components/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ship-happens/ui/components/select"
import {
  clearFillBidOutcome,
  decideFillBidOutcome,
  setFillDueAt,
} from "@/lib/server/actions/fill-bid-outcome"
import {
  RFP_BID_OUTCOME_HINT,
  RFP_BID_OUTCOME_LABEL,
  RFP_BID_OUTCOMES,
  type RfpBidOutcome,
  type RfpDetailView,
} from "@/lib/domain/rfp/rfp.types"
import { parseSelectString } from "@/lib/preferences"
import { formatDateTime } from "@/lib/shared/string"
import { domainErrorMessage, isDomainError } from "@ship-happens/fill/browser"

function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return d.toISOString().slice(0, 10)
}

function outcomeToneClass(outcome: RfpBidOutcome | null | undefined) {
  switch (outcome) {
    case "won":
      return "status-pill status-pill-positive"
    case "lost":
    case "expired":
      return "status-pill status-pill-negative"
    case "closed":
      return "status-pill status-pill-neutral"
    default:
      return "status-pill status-pill-neutral"
  }
}

export function FillBidOutcomePanel({ rfp }: { rfp: RfpDetailView }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [dueDraft, setDueDraft] = useState(toDateInputValue(rfp.dueAt))
  const [outcomeDraft, setOutcomeDraft] = useState<RfpBidOutcome | "">(
    rfp.bidOutcome ?? ""
  )

  const effective = rfp.effectiveBidOutcome
  const derived = rfp.bidOutcomeDerived

  function refresh() {
    router.refresh()
  }

  function saveDue() {
    startTransition(async () => {
      try {
        const dueAt =
          dueDraft.trim().length > 0
            ? new Date(`${dueDraft}T23:59:59.000Z`).toISOString()
            : null
        await setFillDueAt(rfp.id, { dueAt })
        toast.success(dueAt ? "Due date saved" : "Due date cleared")
        refresh()
      } catch (error) {
        toast.error(
          isDomainError(error)
            ? domainErrorMessage(error)
            : error instanceof Error
              ? error.message
              : "Could not save due date"
        )
      }
    })
  }

  function saveOutcome(outcome: RfpBidOutcome) {
    startTransition(async () => {
      try {
        await decideFillBidOutcome(rfp.id, { outcome })
        setOutcomeDraft(outcome)
        toast.success(`Marked ${RFP_BID_OUTCOME_LABEL[outcome].toLowerCase()}`)
        refresh()
      } catch (error) {
        toast.error(
          isDomainError(error)
            ? domainErrorMessage(error)
            : error instanceof Error
              ? error.message
              : "Could not save outcome"
        )
      }
    })
  }

  function clearOutcome() {
    startTransition(async () => {
      try {
        await clearFillBidOutcome(rfp.id)
        setOutcomeDraft("")
        toast.success("Outcome cleared")
        refresh()
      } catch (error) {
        toast.error(
          isDomainError(error)
            ? domainErrorMessage(error)
            : error instanceof Error
              ? error.message
              : "Could not clear outcome"
        )
      }
    })
  }

  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium tracking-tight">Bid outcome</p>
          <p className="text-xs text-muted-foreground">
            Optional due date and won / lost / closed / expired. Never blocks
            export or download.
          </p>
        </div>
        {effective ? (
          <span className={outcomeToneClass(effective)}>
            {RFP_BID_OUTCOME_LABEL[effective]}
            {derived ? " (past due)" : ""}
          </span>
        ) : (
          <span className="status-pill status-pill-neutral">Undecided</span>
        )}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor={`fill-due-${rfp.id}`}
            className="text-xs text-muted-foreground"
          >
            Due date
          </label>
          <div className="flex flex-wrap gap-2">
            <Input
              id={`fill-due-${rfp.id}`}
              type="date"
              value={dueDraft}
              onChange={(e) => setDueDraft(e.target.value)}
              disabled={pending}
              className="max-w-[11rem]"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={saveDue}
            >
              Save due
            </Button>
          </div>
          {rfp.dueAt ? (
            <p className="text-[11px] text-muted-foreground">
              Stored: {formatDateTime(rfp.dueAt)}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground">Outcome</label>
          <div className="flex flex-wrap gap-2">
            <Select
              value={outcomeDraft || undefined}
              onValueChange={(next) => {
                const value = parseSelectString(next)
                if (
                  value === "won" ||
                  value === "lost" ||
                  value === "closed" ||
                  value === "expired"
                ) {
                  setOutcomeDraft(value)
                  saveOutcome(value)
                }
              }}
              disabled={pending}
            >
              <SelectTrigger className="w-[11rem]" size="sm">
                <SelectValue>
                  {outcomeDraft
                    ? RFP_BID_OUTCOME_LABEL[outcomeDraft]
                    : "Set outcome…"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {RFP_BID_OUTCOMES.map((outcome) => (
                    <SelectItem key={outcome} value={outcome}>
                      {RFP_BID_OUTCOME_LABEL[outcome]}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {rfp.bidOutcome ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={clearOutcome}
              >
                Clear
              </Button>
            ) : null}
          </div>
          {outcomeDraft ? (
            <p className="text-[11px] text-muted-foreground">
              {RFP_BID_OUTCOME_HINT[outcomeDraft]}
            </p>
          ) : derived ? (
            <p className="text-[11px] text-muted-foreground">
              Past due — mark expired explicitly or set won / lost / closed.
            </p>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              No decision yet.
            </p>
          )}
          {rfp.decidedAt ? (
            <p className="text-[11px] text-muted-foreground">
              Decided {formatDateTime(rfp.decidedAt)}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
