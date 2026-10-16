/**
 * Split "Chicago via LA/LGB" style destination strings into dest + via parts.
 */

const VIA_RE = /\s+via\s+/i

export function splitVia(text: string): {
  primary: string
  via: string | null
} {
  const trimmed = text.trim()
  if (!VIA_RE.test(trimmed)) {
    return { primary: trimmed, via: null }
  }
  const parts = trimmed.split(VIA_RE)
  return {
    primary: parts[0].trim(),
    via: parts.slice(1).join(" via ").trim() || null,
  }
}

/** Split slash/comma via lists: "LA/LGB" → ["LA", "LGB"] */
export function splitViaAlternates(via: string): string[] {
  return via
    .split(/[/,|&]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}
