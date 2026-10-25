import { describe, expect, it } from "vitest"
import { DomainError, domainErrorStatus, isDomainError } from "./errors"

describe("DomainError", () => {
  it("maps codes to HTTP status", () => {
    expect(domainErrorStatus(new DomainError("x", "UNAUTHORIZED"))).toBe(401)
    expect(domainErrorStatus(new DomainError("x", "NOT_FOUND"))).toBe(404)
  })

  it("detects instances", () => {
    expect(isDomainError(new DomainError("n", "VALIDATION"))).toBe(true)
  })
})
