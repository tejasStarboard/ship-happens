"use client"

import { motion, useReducedMotion } from "motion/react"
import {
  IconCheck,
  IconMap,
  IconCurrencyDollar,
  IconRobot,
  IconEye,
  IconDownload,
} from "@tabler/icons-react"
import { cn } from "@ship-happens/ui/lib/utils"
import type { RfpStatus } from "@/lib/domain/rfp/rfp.types"

const STEPS = [
  { key: "map", label: "Map", icon: IconMap },
  { key: "rates", label: "Rates", icon: IconCurrencyDollar },
  { key: "fill", label: "Fill", icon: IconRobot },
  { key: "review", label: "Review", icon: IconEye },
  { key: "export", label: "Export", icon: IconDownload },
] as const

type StepState = "done" | "active" | "upcoming" | "blocked"

function statesForStatus(status: RfpStatus): StepState[] {
  switch (status) {
    case "queued":
      return ["active", "upcoming", "upcoming", "upcoming", "upcoming"]
    case "running":
      return ["done", "done", "active", "upcoming", "upcoming"]
    case "needs_review":
      return ["done", "done", "done", "active", "upcoming"]
    case "done":
      return ["done", "done", "done", "done", "done"]
    case "failed":
      return ["done", "done", "blocked", "upcoming", "upcoming"]
    default:
      return ["upcoming", "upcoming", "upcoming", "upcoming", "upcoming"]
  }
}

export function FillFlowRail({
  status,
  className,
}: {
  status: RfpStatus
  className?: string
}) {
  const reduce = useReducedMotion()
  const states = statesForStatus(status)

  return (
    <nav
      aria-label="Fill pipeline"
      className={cn(
        "fill-flow-rail overflow-x-auto rounded-xl border border-border bg-card px-3 py-3",
        className
      )}
    >
      <ol className="flex min-w-[28rem] items-center gap-0">
        {STEPS.map((step, i) => {
          const state = states[i]!
          const Icon = step.icon
          return (
            <li key={step.key} className="flex min-w-0 flex-1 items-center">
              <div className="flex min-w-0 flex-col items-center gap-1.5 px-1">
                <motion.div
                  className={cn(
                    "relative flex size-9 items-center justify-center rounded-full border text-xs",
                    state === "done" &&
                      "border-primary/40 bg-primary/15 text-primary",
                    state === "active" &&
                      "border-primary bg-primary text-primary-foreground shadow-[0_0_0_4px_color-mix(in_srgb,var(--primary)_18%,transparent)]",
                    state === "blocked" &&
                      "border-destructive/50 bg-destructive/10 text-destructive",
                    state === "upcoming" &&
                      "border-border bg-muted text-muted-foreground"
                  )}
                  initial={reduce ? false : { scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{
                    delay: i * 0.06,
                    duration: 0.35,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  {state === "done" ? (
                    <IconCheck className="size-4" aria-hidden />
                  ) : (
                    <Icon className="size-4" aria-hidden />
                  )}
                  {state === "active" && !reduce ? (
                    <span className="fill-flow-pulse absolute inset-0 rounded-full" />
                  ) : null}
                </motion.div>
                <span
                  className={cn(
                    "text-[11px] font-medium tracking-tight",
                    state === "active" || state === "done"
                      ? "text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 ? (
                <div
                  className={cn(
                    "mx-1 mb-5 h-px flex-1",
                    states[i] === "done" || states[i + 1] === "done"
                      ? "bg-primary/50"
                      : "bg-border"
                  )}
                  aria-hidden
                />
              ) : null}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
