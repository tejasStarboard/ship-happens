/**
 * Redact secrets from agent-visible / user-visible text so credentials never
 * land in the chat DOM (or React props passed to message components).
 */

const REDACTED = "****"

/** Env keys we inject into `/workspace/.eve/*.env` for the agent. */
const SECRET_ENV_KEYS = [
  "SH_API_KEY",
  "SH_APP_URL",
  "SH_FILL_ID",
  "STARBOARD_APP_DOMAIN",
  "STARBOARD_HANDSHAKE_KEY",
  "SB_CLIENT_ID",
  "SB_CLIENT_SECRET",
  "BETTER_AUTH_SECRET",
  "BLOB_READ_WRITE_TOKEN",
  "RESEND_API_KEY",
] as const

const SECRET_KEY_PATTERN = SECRET_ENV_KEYS.join("|")

const PATTERNS: readonly RegExp[] = [
  // KEY='value' / KEY="value" / KEY=value (env files & shell dumps)
  new RegExp(
    `\\b(?:${SECRET_KEY_PATTERN})\\s*=\\s*(?:'[^']*'|"[^"]*"|\\S+)`,
    "gi"
  ),
  // Common API key / token prefixes
  /\b(?:sk-[A-Za-z0-9_-]{8,}|sk_live_[A-Za-z0-9_-]{8,}|sk_test_[A-Za-z0-9_-]{8,}|AKIA[0-9A-Z]{12,}|ghp_[A-Za-z0-9]{20,}|gho_[A-Za-z0-9]{20,}|ghs_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|xox[bpas]-[A-Za-z0-9-]{10,}|glpat-[A-Za-z0-9_-]{20,}|pypi-[A-Za-z0-9_-]{20,})\b/g,
  // PEM private keys
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
  // JWT-looking triples
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
  // Basic auth in URLs
  /\b[a-z][a-z0-9+.-]*:\/\/[^/\s:@]+:[^/\s@]+@/gi,
]

export function redactSecrets(text: string): string {
  if (!text) return text
  let next = text
  for (const pattern of PATTERNS) {
    next = next.replace(pattern, (match) => {
      const eq = match.indexOf("=")
      if (eq !== -1 && /^[A-Z0-9_]+=/i.test(match)) {
        return `${match.slice(0, eq + 1)}${REDACTED}`
      }
      return REDACTED
    })
  }
  return next
}

/** Deep-redact string leaves in JSON-like tool payloads. */
export function redactSecretsDeep(value: unknown): unknown {
  if (typeof value === "string") return redactSecrets(value)
  if (Array.isArray(value)) return value.map(redactSecretsDeep)
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {}
    for (const [key, child] of Object.entries(value)) {
      out[key] = redactSecretsDeep(child)
    }
    return out
  }
  return value
}
