import type { ReactNode } from "react"
import { cn } from "@workspace/ui/lib/utils"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Separator } from "@workspace/ui/components/separator"
import { ShipHappensMark } from "@/components/brand/ship-happens-logo"

export function AuthPage({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex min-h-svh w-full flex-col items-center justify-center bg-background px-4 py-10",
        className
      )}
    >
      {children}
    </div>
  )
}

export function AuthCard({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <Card
      className={cn(
        "w-full max-w-[25rem] gap-0 rounded-2xl py-0 shadow-sm ring-border/60 dark:shadow-none",
        className
      )}
    >
      {children}
    </Card>
  )
}

export function AuthBrand({ className }: { className?: string }) {
  return (
    <ShipHappensMark className={cn("size-11", className)} aria-hidden />
  )
}

export function AuthHeader({
  title,
  description,
  centered = true,
}: {
  title: string
  description?: string
  centered?: boolean
}) {
  return (
    <CardHeader
      className={cn(
        "gap-1.5 px-0",
        centered
          ? "items-center justify-items-center text-center"
          : "items-start text-left"
      )}
    >
      {centered ? <AuthBrand /> : null}
      <CardTitle className="text-lg font-semibold tracking-tight">
        {title}
      </CardTitle>
      {description ? <CardDescription>{description}</CardDescription> : null}
    </CardHeader>
  )
}

export function AuthBody({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <CardContent className={cn("flex flex-col gap-5 p-6 sm:p-8", className)}>
      {children}
    </CardContent>
  )
}

export function AuthFooter({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <CardFooter
      className={cn(
        "justify-center bg-muted/40 px-6 py-4 text-center text-sm text-muted-foreground dark:bg-muted/20",
        className
      )}
    >
      {children}
    </CardFooter>
  )
}

export function AuthDivider({ label = "or" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3">
      <Separator className="flex-1" />
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      <Separator className="flex-1" />
    </div>
  )
}

/** Multicolor Google G mark used on OAuth buttons. */
export function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={cn("size-4", className)} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}
