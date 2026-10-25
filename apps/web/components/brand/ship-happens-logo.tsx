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

/** Mark: soft slate tile + mint filled cell (pilot-house signal). */
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
          y1="4"
          x2="34"
          y2="36"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#1a2438" />
          <stop offset="1" stopColor="#0b1220" />
        </linearGradient>
      </defs>

      <rect width="40" height="40" rx="12" fill={`url(#${gid}-bg)`} />

      <rect
        x="9"
        y="9"
        width="6.5"
        height="6.5"
        rx="2"
        fill="white"
        fillOpacity="0.9"
      />
      <rect
        x="16.75"
        y="9"
        width="6.5"
        height="6.5"
        rx="2"
        fill="white"
        fillOpacity="0.45"
      />
      <rect
        x="9"
        y="16.75"
        width="6.5"
        height="6.5"
        rx="2"
        fill="white"
        fillOpacity="0.35"
      />
      <rect
        x="16.75"
        y="16.75"
        width="6.5"
        height="6.5"
        rx="2"
        fill="#2dd4bf"
      />

      <path
        d="M8 28.5C9 26.8 10.6 25.8 12.6 25.8H28.2C30.2 25.8 31.7 27.1 32.1 29L32.6 31.1C32.75 31.7 32.3 32.2 31.7 32.2H9C8.2 32.2 7.7 31.4 8 30.7L8 28.5Z"
        fill="white"
        fillOpacity="0.92"
      />
      <path
        d="M22.8 20.6H27.4C27.95 20.6 28.4 21.05 28.4 21.6V25.8H22.2V21.9C22.2 21.2 22.5 20.6 22.8 20.6Z"
        fill="white"
        fillOpacity="0.85"
      />
    </svg>
  )
}

/** Wordmark: calm Figtree — mint on Happens. */
export function ShipHappensWordmark({
  className,
  size = "md",
  tone = "default",
}: {
  className?: string
  size?: LogoSize
  tone?: "default" | "on-dark"
}) {
  return (
    <span
      className={cn(
        "inline-flex items-baseline font-semibold tracking-[-0.03em]",
        SIZE[size].text,
        className
      )}
    >
      <span className={tone === "on-dark" ? "text-white" : "text-foreground"}>
        Ship
      </span>
      <span
        className={cn(
          "ml-[0.2em]",
          tone === "on-dark" ? "text-teal-300" : "text-primary"
        )}
      >
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
}: {
  className?: string
  size?: LogoSize
  markClassName?: string
}) {
  return (
    <span className={cn("inline-flex items-center", SIZE[size].gap, className)}>
      <ShipHappensMark className={cn(SIZE[size].mark, markClassName)} />
      <ShipHappensWordmark size={size} />
    </span>
  )
}
