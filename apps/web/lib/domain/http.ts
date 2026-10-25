import { NextResponse } from "next/server"
import {
  domainErrorMessage,
  domainErrorStatus,
  isDomainError,
} from "@/lib/domain/errors"

/** JSON error response from a thrown DomainError / auth error. */
export function jsonDomainError(
  error: unknown,
  fallbackMessage = "Request failed"
): NextResponse {
  const status = domainErrorStatus(error)
  const message =
    status === 500
      ? fallbackMessage
      : domainErrorMessage(error, fallbackMessage)
  return NextResponse.json({ error: message }, { status })
}

export function isAuthFailure(error: unknown): boolean {
  if (isDomainError(error)) {
    return error.code === "UNAUTHORIZED"
  }
  return (
    error instanceof Error &&
    (error.message === "Unauthorized" ||
      error.message === "No active organization")
  )
}
