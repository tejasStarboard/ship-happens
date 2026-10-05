import type { ReactNode } from "react"
import {
  IconFileSpreadsheet,
  IconTemplate,
  IconCurrencyDollar,
  IconRobot,
  IconSandbox,
  IconUsersGroup,
} from "@tabler/icons-react"
import { cn } from "@workspace/ui/lib/utils"
import { ShipHappensLogo } from "@/components/brand/ship-happens-logo"
import { APP_DESCRIPTION } from "@/lib/seo"

const FEATURES = [
  {
    icon: IconFileSpreadsheet,
    title: "RFP fill jobs",
    description:
      "Upload a customer bid sheet, run the fill, review cell outcomes, and download the completed workbook.",
  },
  {
    icon: IconTemplate,
    title: "Bid-sheet templates",
    description:
      "Save customer Excel templates once and reuse them across lanes, seasons, and RFP cycles.",
  },
  {
    icon: IconCurrencyDollar,
    title: "Starboard contract rates",
    description:
      "Pull origin, destination, carrier, and container rates so every cell reflects your live contracts.",
  },
  {
    icon: IconRobot,
    title: "AI fill agent",
    description:
      "Chat-guided filling maps sheet requirements to rates and customer rules, with a clear fill report.",
  },
  {
    icon: IconSandbox,
    title: "Isolated Excel sandbox",
    description:
      "Each fill runs in a secure Python sandbox so complex workbooks stay accurate and side-effect free.",
  },
  {
    icon: IconUsersGroup,
    title: "Org workspaces",
    description:
      "Invite your pricing team, switch organizations, and keep RFP work scoped to the right workspace.",
  },
] as const

const fadeUp =
  "animate-in fade-in slide-in-from-bottom-3 fill-mode-both duration-700 ease-out motion-reduce:animate-none"

export function AuthMarketingPage({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "bg-brand-glass relative min-h-svh overflow-x-hidden text-foreground",
        className
      )}
    >
      <div
        aria-hidden
        className="bg-brand-glass-grid pointer-events-none absolute inset-0"
      />

      <div className="relative mx-auto flex min-h-svh w-full max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <header className="mb-8 flex flex-col gap-1.5 lg:mb-10">
          <ShipHappensLogo size="md" />
          <p className="pl-[2.875rem] text-xs text-muted-foreground">
            {APP_DESCRIPTION}
          </p>
        </header>

        <div className="grid flex-1 items-start gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(22rem,24rem)] lg:gap-14 xl:gap-16">
          <div className="order-2 flex min-w-0 flex-col gap-14 lg:order-1 lg:gap-20">
            <section className="flex flex-col gap-8">
              <div className={cn(fadeUp, "hidden flex-col gap-5 lg:flex")}>
                <ShipHappensLogo size="xl" className="leading-[1.05]" />
                <h1 className="max-w-xl text-2xl font-medium tracking-tight text-balance text-foreground/90">
                  Turn messy RFP bid sheets into filled workbooks—fast.
                </h1>
                <p className="max-w-lg text-base leading-relaxed text-pretty text-muted-foreground">
                  Upload the customer template, match Starboard contract rates,
                  and let the fill agent complete the sheet while your team
                  reviews exceptions.
                </p>
              </div>

              <BidSheetPreview className={cn(fadeUp, "delay-100")} />
            </section>

            <section
              aria-labelledby="auth-features-heading"
              className={cn(
                fadeUp,
                "flex flex-col gap-8 pb-6 delay-200 lg:pb-10"
              )}
            >
              <div className="flex flex-col gap-2">
                <h2
                  id="auth-features-heading"
                  className="font-heading text-2xl font-semibold tracking-tight"
                >
                  Everything your pricing desk needs
                </h2>
                <p className="max-w-lg text-sm leading-relaxed text-pretty text-muted-foreground">
                  From template intake to filled download—built for freight
                  teams running high-volume bid seasons.
                </p>
              </div>

              <ul className="grid gap-8 sm:grid-cols-2">
                {FEATURES.map((feature) => (
                  <li key={feature.title} className="flex flex-col gap-2">
                    <div className="flex items-center gap-2.5">
                      <feature.icon
                        className="size-5 shrink-0 text-primary"
                        aria-hidden
                      />
                      <h3 className="text-sm font-semibold tracking-tight">
                        {feature.title}
                      </h3>
                    </div>
                    <p className="text-sm leading-relaxed text-pretty text-muted-foreground">
                      {feature.description}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <aside className="order-1 w-full lg:sticky lg:top-10 lg:order-2 lg:self-start">
            <div className={cn(fadeUp, "mb-2 lg:hidden")}>
              <h1 className="text-lg font-medium tracking-tight text-balance">
                Turn messy RFP bid sheets into filled workbooks—fast.
              </h1>
            </div>
            <div
              className={cn(
                fadeUp,
                "mx-auto w-full max-w-[25rem] delay-100 lg:mx-0 lg:max-w-none"
              )}
            >
              {children}
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

const PREVIEW_ROWS = [
  {
    lane: "CNSHA → USLAX",
    carrier: "OOCL",
    status: "filled",
    delay: "delay-0",
  },
  {
    lane: "CNNGB → USLGB",
    carrier: "MSC",
    status: "filled",
    delay: "delay-300",
  },
  {
    lane: "HKHKG → USOAK",
    carrier: "COSCO",
    status: "review",
    delay: "delay-700",
  },
  {
    lane: "KRPUS → USSEA",
    carrier: "ONE",
    status: "filled",
    delay: "delay-1000",
  },
] as const

function BidSheetPreview({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border/80 bg-card/90 shadow-[0_24px_60px_-28px_color-mix(in_oklch,var(--foreground)_28%,transparent)] backdrop-blur-sm dark:shadow-none",
        className
      )}
      aria-hidden
    >
      <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
        <div className="flex items-center gap-2">
          <IconFileSpreadsheet className="size-4 text-primary" />
          <span className="text-sm font-medium tracking-tight">
            Nordstrom_FCL_Bid_Q2.xlsx
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          3 / 4 cells filled
        </span>
      </div>

      <div className="relative px-4 py-4">
        <svg
          className="pointer-events-none absolute inset-x-6 top-2 h-16 w-[calc(100%-3rem)] text-primary/35"
          viewBox="0 0 320 40"
          fill="none"
        >
          <path
            d="M0 28 C60 8, 120 8, 160 22 S260 36, 320 14"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="6 6"
          />
        </svg>

        <div className="relative grid grid-cols-[1.4fr_0.7fr_0.7fr] gap-px overflow-hidden rounded-lg bg-border/60 text-xs">
          <div className="bg-muted/80 px-3 py-2 font-medium text-muted-foreground">
            Lane
          </div>
          <div className="bg-muted/80 px-3 py-2 font-medium text-muted-foreground">
            Carrier
          </div>
          <div className="bg-muted/80 px-3 py-2 font-medium text-muted-foreground">
            Rate
          </div>
          {PREVIEW_ROWS.map((row) => (
            <div key={row.lane} className="contents">
              <div className="bg-background px-3 py-2.5">{row.lane}</div>
              <div className="bg-background px-3 py-2.5">{row.carrier}</div>
              <div className="bg-background px-3 py-2.5">
                <span
                  className={cn(
                    "inline-flex animate-pulse rounded-md px-1.5 py-0.5 font-medium motion-reduce:animate-none",
                    row.delay,
                    row.status === "filled"
                      ? "bg-primary/15 text-primary"
                      : "bg-secondary text-secondary-foreground"
                  )}
                >
                  {row.status === "filled" ? "$2,450" : "Review"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
