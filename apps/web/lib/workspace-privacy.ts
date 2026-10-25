/**
 * Agent-private workspace paths (CLIs + injected secrets under `.eve`).
 * User-facing explorer/APIs must not expose these. Attachments are remapped to
 * a top-level `attachments/` alias.
 */

function normalizeRel(relativePath: string): string {
  return relativePath.replaceAll("\\", "/").replace(/^\/+/, "")
}

/** True for agent-only `.eve` paths (env, bin, …) — not attachments. */
export function isAgentPrivateWorkspacePath(relativePath: string): boolean {
  const n = normalizeRel(relativePath)
  if (n === ".eve" || n.startsWith(".eve/")) {
    return !(n === ".eve/attachments" || n.startsWith(".eve/attachments/"))
  }
  return false
}

/** Map user-facing path → on-disk path (`attachments/…` → `.eve/attachments/…`). */
export function toInternalWorkspacePath(relativePath: string): string {
  const n = normalizeRel(relativePath)
  if (n === "attachments" || n.startsWith("attachments/")) {
    return `.eve/${n}`
  }
  return n
}

/** Map on-disk path → user-facing path for tree listing. */
export function toUserFacingWorkspacePath(relativePath: string): string {
  const n = normalizeRel(relativePath)
  if (n === ".eve/attachments" || n.startsWith(".eve/attachments/")) {
    return n.slice(".eve/".length)
  }
  return n
}

/**
 * Reject user API access to raw `.eve` secrets/binaries.
 * Allows `attachments/…` (alias) and non-`.eve` paths.
 */
export function assertUserReadableWorkspacePath(relativePath: string): void {
  const n = normalizeRel(relativePath)
  if (n === ".eve" || n.startsWith(".eve/")) {
    throw new Error("Forbidden path")
  }
  const internal = toInternalWorkspacePath(n)
  if (isAgentPrivateWorkspacePath(internal)) {
    throw new Error("Forbidden path")
  }
}
