export type DomainErrorCode =
  "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "VALIDATION"

export class DomainError extends Error {
  readonly code: DomainErrorCode

  constructor(message: string, code: DomainErrorCode) {
    super(message)
    this.name = "DomainError"
    this.code = code
  }
}

/**
 * Duck-type DomainError so detection works across package entry points
 * (`@ship-happens/fill` vs `/browser`) where `instanceof` can fail.
 */
export function isDomainError(error: unknown): error is DomainError {
  if (error instanceof DomainError) return true
  if (!error || typeof error !== "object") return false
  const candidate = error as { name?: unknown; code?: unknown }
  return (
    candidate.name === "DomainError" &&
    typeof candidate.code === "string" &&
    (
      ["UNAUTHORIZED", "FORBIDDEN", "NOT_FOUND", "VALIDATION"] as const
    ).includes(candidate.code as DomainErrorCode)
  )
}

/** Map domain / auth errors to an HTTP status. Defaults to 500 for unknowns. */
export function domainErrorStatus(error: unknown): number {
  if (isDomainError(error)) {
    switch (error.code) {
      case "UNAUTHORIZED":
        return 401
      case "FORBIDDEN":
        return 403
      case "NOT_FOUND":
        return 404
      case "VALIDATION":
        return 400
    }
  }
  if (error instanceof Error) {
    if (
      error.message === "Unauthorized" ||
      error.message === "No active organization"
    ) {
      return 401
    }
  }
  return 500
}

export function domainErrorMessage(
  error: unknown,
  fallback = "Request failed"
) {
  if (error instanceof Error && error.message) return error.message
  return fallback
}
