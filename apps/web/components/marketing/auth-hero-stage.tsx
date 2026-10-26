"use client"

import Image from "next/image"
import { useEffect, useRef, useState, type ReactNode } from "react"
import { motion, useReducedMotion } from "motion/react"
import {
  IconCheck,
  IconCurrencyDollar,
  IconEye,
  IconFileSpreadsheet,
  IconMap,
  IconRobot,
  IconDownload,
} from "@tabler/icons-react"
import { cn } from "@ship-happens/ui/lib/utils"

const LANES = [
  {
    lane: "CNSHA → USLAX",
    carrier: "OOCL",
    rate: "$2,450",
    tone: "ok" as const,
  },
  {
    lane: "CNNGB → USLGB",
    carrier: "MSC",
    rate: "$2,310",
    tone: "ok" as const,
  },
  {
    lane: "HKHKG → USOAK",
    carrier: "COSCO",
    rate: "Review",
    tone: "warn" as const,
  },
  {
    lane: "KRPUS → USSEA",
    carrier: "ONE",
    rate: "$2,180",
    tone: "ok" as const,
  },
]

const PIPELINE = [
  { label: "Map", icon: IconMap, done: true },
  { label: "Rates", icon: IconCurrencyDollar, done: true },
  { label: "Fill", icon: IconRobot, done: true },
  { label: "Review", icon: IconEye, done: false, active: true },
  { label: "Export", icon: IconDownload, done: false },
] as const

const RATE_HITS = [
  { lane: "CNSHA–USLAX", buy: "$2,450", src: "Contract · OOCL" },
  { lane: "CNNGB–USLGB", buy: "$2,310", src: "Contract · MSC" },
  { lane: "KRPUS–USSEA", buy: "$2,180", src: "Spot · ONE" },
] as const

function Glass({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-white/15 bg-[#0c1524]/94 shadow-[0_28px_56px_-28px_rgba(0,0,0,0.85)] backdrop-blur-md",
        className
      )}
    >
      {children}
    </div>
  )
}

export function AuthHeroStage({ className }: { className?: string }) {
  const reduce = useReducedMotion()
  const stageRef = useRef<HTMLDivElement>(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })

  useEffect(() => {
    if (reduce) return
    const el = stageRef.current
    if (!el) return

    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect()
      const px = (e.clientX - rect.left) / rect.width - 0.5
      const py = (e.clientY - rect.top) / rect.height - 0.5
      setTilt({ x: py * -4, y: px * 6 })
    }
    const onLeave = () => setTilt({ x: 0, y: 0 })

    el.addEventListener("pointermove", onMove)
    el.addEventListener("pointerleave", onLeave)
    return () => {
      el.removeEventListener("pointermove", onMove)
      el.removeEventListener("pointerleave", onLeave)
    }
  }, [reduce])

  return (
    <div
      ref={stageRef}
      className={cn("relative w-full", className)}
      aria-hidden
    >
      <div
        className="auth-hero-perspective w-full max-w-3xl"
        style={
          reduce
            ? undefined
            : {
                transform: `perspective(1200px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
              }
        }
      >
        <motion.div
          className="auth-hero-float flex flex-col gap-3"
          initial={reduce ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Pipeline strip */}
          <Glass className="px-3 py-2.5">
            <ol className="flex items-center gap-1">
              {PIPELINE.map((step, i) => {
                const Icon = step.icon
                const active = "active" in step && step.active
                return (
                  <li
                    key={step.label}
                    className="flex min-w-0 flex-1 items-center"
                  >
                    <div className="flex min-w-0 flex-col items-center gap-1 px-0.5">
                      <span
                        className={cn(
                          "flex size-7 items-center justify-center rounded-full border text-[10px]",
                          step.done &&
                            "border-teal-400/40 bg-teal-400/15 text-teal-200",
                          active &&
                            "border-teal-300 bg-teal-400 text-[#042f2e] shadow-[0_0_0_3px_rgba(45,212,191,0.2)]",
                          !step.done &&
                            !active &&
                            "border-white/15 bg-white/5 text-white/40"
                        )}
                      >
                        {step.done ? (
                          <IconCheck className="size-3.5" />
                        ) : (
                          <Icon className="size-3.5" />
                        )}
                      </span>
                      <span
                        className={cn(
                          "text-[10px] font-medium tracking-tight",
                          step.done || active
                            ? "text-white/85"
                            : "text-white/40"
                        )}
                      >
                        {step.label}
                      </span>
                    </div>
                    {i < PIPELINE.length - 1 ? (
                      <div
                        className={cn(
                          "mb-4 h-px flex-1",
                          step.done ? "bg-teal-400/45" : "bg-white/12"
                        )}
                      />
                    ) : null}
                  </li>
                )
              })}
            </ol>
          </Glass>

          <div className="grid gap-3 md:grid-cols-[minmax(0,1.35fr)_minmax(12rem,0.85fr)]">
            {/* Main workbook */}
            <Glass>
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <div className="flex min-w-0 items-center gap-2 text-white">
                  <IconFileSpreadsheet className="size-4 shrink-0 text-teal-300" />
                  <span className="truncate text-sm font-medium tracking-tight">
                    Nordstrom_FCL_Bid_Q2.xlsx
                  </span>
                </div>
                <span className="shrink-0 font-mono text-[11px] text-white/55">
                  3 / 4 filled
                </span>
              </div>

              <div className="px-3 pt-3">
                <div className="overflow-hidden rounded-lg">
                  <Image
                    src="/marketing/workbook-glow.jpg"
                    alt=""
                    width={560}
                    height={140}
                    className="h-[4.75rem] w-full object-cover"
                  />
                </div>
              </div>

              <div className="grid grid-cols-[1.45fr_0.65fr_0.7fr] gap-px p-3 text-[11px] text-white/90">
                <div className="rounded-tl-md bg-white/5 px-2.5 py-1.5 font-medium text-white/45">
                  Lane
                </div>
                <div className="bg-white/5 px-2.5 py-1.5 font-medium text-white/45">
                  Carrier
                </div>
                <div className="rounded-tr-md bg-white/5 px-2.5 py-1.5 font-medium text-white/45">
                  Rate
                </div>
                {LANES.map((row, i) => (
                  <motion.div
                    key={row.lane}
                    className="contents"
                    initial={reduce ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: 0.22 + i * 0.07,
                      duration: 0.35,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  >
                    <div
                      className={cn(
                        "bg-[#0a1320] px-2.5 py-2 font-mono",
                        i === LANES.length - 1 && "rounded-bl-md"
                      )}
                    >
                      {row.lane}
                    </div>
                    <div className="bg-[#0a1320] px-2.5 py-2">
                      {row.carrier}
                    </div>
                    <div
                      className={cn(
                        "bg-[#0a1320] px-2.5 py-2",
                        i === LANES.length - 1 && "rounded-br-md"
                      )}
                    >
                      <span
                        className={cn(
                          "inline-flex rounded-md px-1.5 py-0.5 font-medium",
                          row.tone === "ok"
                            ? "bg-teal-400/20 text-teal-200"
                            : "bg-amber-400/20 text-amber-200"
                        )}
                      >
                        {row.rate}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </Glass>

            {/* Satellite stack */}
            <div className="flex flex-col gap-3">
              <Glass className="flex-1">
                <div className="flex items-center gap-2 border-b border-white/10 px-3.5 py-2.5">
                  <IconCurrencyDollar className="size-3.5 text-teal-300" />
                  <span className="text-xs font-semibold tracking-tight text-white">
                    Starboard rates
                  </span>
                </div>
                <ul className="flex flex-col gap-2 p-3">
                  {RATE_HITS.map((hit, i) => (
                    <motion.li
                      key={hit.lane}
                      className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-2"
                      initial={reduce ? false : { opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        delay: 0.35 + i * 0.08,
                        duration: 0.35,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-mono text-[10px] text-white/70">
                          {hit.lane}
                        </span>
                        <span className="text-[11px] font-semibold text-teal-200">
                          {hit.buy}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[10px] text-white/40">
                        {hit.src}
                      </p>
                    </motion.li>
                  ))}
                </ul>
              </Glass>

              <Glass>
                <div className="flex items-center gap-2 border-b border-white/10 px-3.5 py-2.5">
                  <IconEye className="size-3.5 text-amber-300" />
                  <span className="text-xs font-semibold tracking-tight text-white">
                    Needs review
                  </span>
                  <span className="ml-auto rounded-md bg-amber-400/20 px-1.5 py-0.5 font-mono text-[10px] text-amber-200">
                    1
                  </span>
                </div>
                <div className="space-y-2 p-3">
                  <p className="text-[11px] leading-snug text-white/70">
                    HKHKG → USOAK · COSCO — no contract match; confirm overlay
                    or skip.
                  </p>
                  <div className="flex gap-1.5">
                    <span className="rounded-md bg-teal-400/20 px-2 py-1 text-[10px] font-medium text-teal-100">
                      Accept
                    </span>
                    <span className="rounded-md bg-white/10 px-2 py-1 text-[10px] font-medium text-white/60">
                      Skip cell
                    </span>
                  </div>
                </div>
              </Glass>

              <Glass>
                <div className="flex items-start gap-2.5 px-3.5 py-3">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-teal-400/20 text-teal-200">
                    <IconRobot className="size-3.5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium tracking-wide text-teal-200/90 uppercase">
                      Fill agent
                    </p>
                    <p className="mt-0.5 text-[11px] leading-snug text-white/70">
                      Filled 47 cells from contracts. One lane waiting on you.
                    </p>
                  </div>
                </div>
              </Glass>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
