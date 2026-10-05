import { useId, type ComponentProps } from "react"
import { cn } from "@workspace/ui/lib/utils"
import { APP_NAME } from "@/lib/seo"

const SIZE = {
  sm: { mark: "size-7", text: "text-base", gap: "gap-2" },
  md: { mark: "size-9", text: "text-xl", gap: "gap-2.5" },
  lg: { mark: "size-12", text: "text-4xl sm:text-5xl", gap: "gap-3.5" },
  xl: {
    mark: "size-14 sm:size-16",
    text: "text-5xl sm:text-6xl lg:text-[4.25rem]",
    gap: "gap-4",
  },
} as const

type LogoSize = keyof typeof SIZE

/** Custom mark: ship hull + bid-sheet cells being filled. */
export function ShipHappensMark({
  className,
  title,
  ...props
}: ComponentProps<"svg"> & { title?: string }) {
  const rawId = useId()
  const gid = rawId.replace(/:/g, "")

  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("size-10 shrink-0", className)}
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      <defs>
        <linearGradient
          id={`${gid}-bg`}
          x1="6"
          y1="2"
          x2="36"
          y2="38"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#0B2F3F" />
          <stop offset="0.55" stopColor="#146B7A" />
          <stop offset="1" stopColor="#1FA3A0" />
        </linearGradient>
        <linearGradient
          id={`${gid}-cell`}
          x1="22"
          y1="10"
          x2="30"
          y2="18"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#7EF0D8" />
          <stop offset="1" stopColor="#3CD4C0" />
        </linearGradient>
      </defs>

      <rect width="40" height="40" rx="11" fill={`url(#${gid}-bg)`} />

      {/* Bid-sheet grid (cargo / sail) */}
      <rect x="9" y="9" width="6.5" height="6.5" rx="1.4" fill="white" fillOpacity="0.92" />
      <rect x="16.75" y="9" width="6.5" height="6.5" rx="1.4" fill="white" fillOpacity="0.55" />
      <rect x="9" y="16.75" width="6.5" height="6.5" rx="1.4" fill="white" fillOpacity="0.4" />
      <rect
        x="16.75"
        y="16.75"
        width="6.5"
        height="6.5"
        rx="1.4"
        fill={`url(#${gid}-cell)`}
      />

      {/* Ship hull */}
      <path
        d="M7.5 28.2C8.2 26.4 9.6 25.2 11.5 25.2H29.2C31.4 25.2 33 26.7 33.4 28.8L34 31.2C34.15 31.85 33.65 32.45 33 32.45H8.4C7.55 32.45 6.95 31.55 7.25 30.75L7.5 28.2Z"
        fill="white"
      />
      {/* Bridge */}
      <path
        d="M23.2 20.4H28.1C28.7 20.4 29.2 20.9 29.2 21.5V25.2H22.5V21.8C22.5 21.05 22.9 20.4 23.2 20.4Z"
        fill="white"
      />
      {/* Stack */}
      <rect x="25.1" y="17.2" width="2.2" height="3.2" rx="0.7" fill="white" fillOpacity="0.85" />
      {/* Wake */}
      <path
        d="M10 34.2C14.5 35.1 20.2 35.2 25.5 34.5C28.8 34.05 31.6 33.3 33.5 32.5"
        stroke="white"
        strokeOpacity="0.45"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** Wordmark: "Ship" solid + "Happens" gradient, set in Syne. */
export function ShipHappensWordmark({
  className,
  size = "md",
}: {
  className?: string
  size?: LogoSize
}) {
  return (
    <span
      className={cn(
        "font-brand inline-flex items-baseline font-semibold tracking-[-0.02em]",
        SIZE[size].text,
        className
      )}
    >
      <span className="text-foreground">Ship</span>
      <span className="ml-[0.22em] bg-gradient-to-r from-primary via-chart-1 to-chart-5 bg-clip-text text-transparent">
        Happens
      </span>
    </span>
  )
}

/** Full logo: mark + wordmark. */
export function ShipHappensLogo({
  className,
  size = "md",
  markClassName,
  wordmarkClassName,
}: {
  className?: string
  size?: LogoSize
  markClassName?: string
  wordmarkClassName?: string
}) {
  const s = SIZE[size]

  return (
    <span
      className={cn("inline-flex items-center", s.gap, className)}
      role="img"
      aria-label={APP_NAME}
    >
      <ShipHappensMark className={cn(s.mark, markClassName)} />
      <ShipHappensWordmark size={size} className={wordmarkClassName} />
    </span>
  )
}
