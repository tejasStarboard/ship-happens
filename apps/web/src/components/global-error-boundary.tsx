import * as React from "react"
import { Link } from "@tanstack/react-router"
import type { ErrorComponentProps } from "@tanstack/react-router"
import { IconAlertTriangle, IconHome, IconRefresh } from "@tabler/icons-react"
import { Button } from "@workspace/ui/components/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty"
import { isProduction } from "@/lib/constants"

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }
  if (typeof error === "string" && error.trim()) {
    return error
  }
  return "An unexpected error occurred."
}

export function GlobalErrorBoundary({
  error,
  info,
  reset,
}: ErrorComponentProps) {
  const message = getErrorMessage(error)
  const showDetails = !isProduction

  React.useEffect(() => {
    console.error("[GlobalErrorBoundary]", error, info?.componentStack)
  }, [error, info?.componentStack])

  return (
    <main className="grid min-h-[calc(100svh-var(--header-height,0px))] w-full place-items-center p-6">
      <Empty className="max-w-md border-none">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <IconAlertTriangle aria-hidden />
          </EmptyMedia>
          <EmptyTitle>Something went wrong</EmptyTitle>
          <EmptyDescription>
            This page hit an unexpected error. You can try again, or go back to
            the home page.
          </EmptyDescription>
        </EmptyHeader>

        <EmptyContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button type="button" onClick={reset}>
              <IconRefresh data-icon="inline-start" />
              Try again
            </Button>
            <Button
              type="button"
              variant="outline"
              render={<Link to="/" />}
              nativeButton={false}
            >
              <IconHome data-icon="inline-start" />
              Go home
            </Button>
          </div>

          {showDetails ? (
            <details className="w-full">
              <summary className="mx-auto w-fit cursor-pointer list-none text-xs text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
                Error details
              </summary>
              <pre className="mt-2 max-h-48 overflow-auto rounded-lg border bg-muted/40 p-3 text-left font-mono text-xs break-words whitespace-pre-wrap text-muted-foreground">
                {message}
                {info?.componentStack
                  ? `\n\nComponent stack:${info.componentStack}`
                  : null}
              </pre>
            </details>
          ) : null}
        </EmptyContent>
      </Empty>
    </main>
  )
}
