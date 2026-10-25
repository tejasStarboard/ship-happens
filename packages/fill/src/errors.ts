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

export function isDomainError(error: unknown): error is DomainError {
  return error instanceof DomainError
}

/** Map domain / auth errors to an HTTP status. Defaults to 500 for unknowns. */
export function domainErrorStatus(error: unknown): number {
  if (error instanceof DomainError) {
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
