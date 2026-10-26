export type ReviewCreatedNotify = {
  id: string
  rfpId: string
  title: string
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function getCommand(input: unknown): string {
  const record = asRecord(input)
  const command = record?.command
  return typeof command === "string" ? command : ""
}

function getStdout(output: unknown): string {
  if (typeof output === "string") return output
  const record = asRecord(output)
  const stdout = record?.stdout
  return typeof stdout === "string" ? stdout : ""
}

function getExitCode(output: unknown): number | null {
  const record = asRecord(output)
  return typeof record?.exitCode === "number" ? record.exitCode : null
}

function parseReviewJson(text: string): ReviewCreatedNotify | null {
  const trimmed = text.trim()
  if (!trimmed) return null

  const candidates: string[] = [trimmed]
  const start = trimmed.indexOf("{")
  const end = trimmed.lastIndexOf("}")
  if (start >= 0 && end > start) {
    candidates.push(trimmed.slice(start, end + 1))
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as unknown
      const record = asRecord(parsed)
      if (!record) continue
      const id = record.id
      const rfpId = record.rfpId
      const title = record.title
      const status = record.status
      if (
        typeof id === "string" &&
        id.startsWith("rev_") &&
        typeof rfpId === "string" &&
        rfpId.length > 0 &&
        typeof title === "string" &&
        title.length > 0 &&
        status === "pending"
      ) {
        return { id, rfpId, title }
      }
    } catch {
      // try next candidate
    }
  }
  return null
}

/** Detect a successful `sh-client reviews create` bash tool result. */
export function parseReviewCreatedFromBash(
  input: unknown,
  output: unknown,
  errorText?: string | null
): ReviewCreatedNotify | null {
  if (errorText) return null
  const exitCode = getExitCode(output)
  if (exitCode !== null && exitCode !== 0) return null

  const command = getCommand(input)
  if (!/\bsh-client\b/.test(command) || !/\breviews\b/.test(command)) {
    return null
  }
  if (!/\bcreate\b/.test(command)) return null

  return parseReviewJson(getStdout(output))
}
