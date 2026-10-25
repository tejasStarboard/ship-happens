"use client"

import type { ReactNode } from "react"
import Image from "next/image"
import { motion, useReducedMotion } from "motion/react"
import { cn } from "@workspace/ui/lib/utils"
import {
  ShipHappensMark,
  ShipHappensWordmark,
} from "@/components/brand/ship-happens-logo"
import { AuthHeroStage } from "@/components/marketing/auth-hero-stage"
import { APP_DESCRIPTION, APP_NAME } from "@/lib/seo"

const HIGHLIGHTS = [
  "Upload the BCO sheet",
  "Match Starboard rates",
  "Review exceptions · download",
] as const

export function AuthMarketingPage({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const reduce = useReducedMotion()

  return (
    <div
      className={cn(
        "auth-marketing relative min-h-svh overflow-x-hidden text-foreground",
        className
      )}
    >
      <div className="grid min-h-svh lg:grid-cols-[minmax(0,1fr)_minmax(28rem,36rem)] xl:grid-cols-[minmax(0,1fr)_minmax(30rem,38rem)]">
        {/* Cinematic story — one column, no stacked absolute layers */}
        <section className="relative hidden min-h-svh flex-col lg:flex">
          <Image
            src="/marketing/port-night.jpg"
            alt=""
            fill
            priority
            sizes="(max-width: 1280px) 55vw, 60vw"
            className="object-cover object-[center_40%]"
          />
          <div className="auth-hero-stage-veil absolute inset-0" />

          <div className="relative z-10 flex min-h-svh flex-col px-10 py-9 xl:px-14">
            <header className="flex shrink-0 items-center gap-2.5">
              <ShipHappensMark className="size-9" title={APP_NAME} />
              <div className="flex min-w-0 flex-col gap-0.5">
                <ShipHappensWordmark
                  className="leading-none"
                  size="md"
                  tone="on-dark"
                />
                <p className="text-xs text-white/55">{APP_DESCRIPTION}</p>
              </div>
            </header>

            <div className="flex flex-1 flex-col justify-center gap-8 py-8 xl:gap-9">
              <div className="max-w-xl space-y-3.5">
                <motion.h1
                  className="font-heading text-[2.1rem] leading-[1.12] font-semibold tracking-tight text-balance text-white xl:text-[2.4rem]"
                  initial={reduce ? false : { opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                >
                  The freight fill desk that finishes the sheet.
                </motion.h1>
                <motion.p
                  className="max-w-md text-[15px] leading-relaxed text-white/65"
                  initial={reduce ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: 0.08,
                    duration: 0.45,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  From messy BCO workbooks to filled rates—exceptions flagged,
                  download ready.
                </motion.p>
                <motion.ul
                  className="flex flex-wrap gap-2 pt-0.5"
                  initial={reduce ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.16, duration: 0.4 }}
                >
                  {HIGHLIGHTS.map((item) => (
                    <li
                      key={item}
                      className="rounded-full border border-white/15 bg-black/25 px-3 py-1 text-xs font-medium text-white/80 backdrop-blur-sm"
                    >
                      {item}
                    </li>
                  ))}
                </motion.ul>
              </div>

              <AuthHeroStage className="w-full" />
            </div>
          </div>
        </section>

        {/* Auth column — wide, centered, no nested chrome card */}
        <aside className="relative flex min-h-svh flex-col border-l border-border bg-background">
          <div className="auth-marketing-panel absolute inset-0" aria-hidden />
          <div className="relative flex flex-1 flex-col justify-center px-6 py-10 sm:px-10 lg:px-12 xl:px-14">
            <header className="mb-8 flex items-center gap-2.5 lg:hidden">
              <ShipHappensMark className="size-9" title={APP_NAME} />
              <div className="flex min-w-0 flex-col gap-0.5">
                <ShipHappensWordmark className="leading-none" size="md" />
                <p className="text-xs text-muted-foreground">{APP_DESCRIPTION}</p>
              </div>
            </header>

            <div className="mx-auto w-full max-w-[22.5rem]">
              <div className="mb-6 lg:hidden">
                <h1 className="font-heading text-2xl font-semibold tracking-tight text-balance">
                  Finish the bid sheet.
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Upload the template, match contract rates, review exceptions.
                </p>
              </div>

              {children}

              <div className="mt-8 overflow-hidden rounded-xl border border-border lg:hidden">
                <div className="relative h-40">
                  <Image
                    src="/marketing/port-night.jpg"
                    alt=""
                    fill
                    className="object-cover"
                    sizes="100vw"
                  />
                  <div className="auth-hero-stage-veil absolute inset-0" />
                </div>
                <div className="bg-muted/40 p-4">
                  <AuthHeroStage />
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
