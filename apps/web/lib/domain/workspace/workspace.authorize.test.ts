import { describe, expect, it } from "vitest"
import { isValidWorkspaceId } from "@/lib/domain/workspace/workspace.authorize"

describe("isValidWorkspaceId", () => {
  it("accepts workspace-style ids", () => {
    expect(isValidWorkspaceId("ws_abc123def4567890abcd")).toBe(true)
    expect(isValidWorkspaceId("fill_0123456789abcdef0123")).toBe(true)
  })

  it("rejects empty and path traversal", () => {
    expect(isValidWorkspaceId("")).toBe(false)
    expect(isValidWorkspaceId("../etc")).toBe(false)
    expect(isValidWorkspaceId("a/b")).toBe(false)
  })
})
