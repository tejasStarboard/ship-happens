/**
 * Gitignore-style ignore rules for the user-facing workspace tree + sandbox sync.
 * Built-in defaults hide dotfiles; per-workspace `.workspaceignore` can refine.
 */

export const WORKSPACE_IGNORE_FILE = ".workspaceignore"

/** Seeded into every workspace; users can edit. */
export const DEFAULT_WORKSPACE_IGNORE = `# Ship Happens workspace ignore (gitignore syntax)
# Hides paths from the Files tree and from sandbox ↔ host sync.

# Hidden files / dirs (uv home noise, editor junk, …)
.*
# Chat uploads live under .eve/attachments but surface as attachments/
!.eve/attachments/
!.eve/attachments/**

# Tooling caches
**/__pycache__/
**/*.pyc
node_modules/
`

type CompiledRule = {
  negate: boolean
  directoryOnly: boolean
  /** Match against full relative path (posix, no leading ./) */
  regex: RegExp
}

function normalizeRel(relativePath: string): string {
  return relativePath.replaceAll("\\", "/").replace(/^\.\//, "").replace(/^\/+/, "")
}

/**
 * Convert one gitignore pattern to a regex over a relative path.
 * Supports `*`, `**`, `?`, leading `/` (root-anchored), trailing `/` (dirs).
 */
function patternToRegex(raw: string): { directoryOnly: boolean; regex: RegExp } {
  let pattern = raw
  let directoryOnly = false
  if (pattern.endsWith("/")) {
    directoryOnly = true
    pattern = pattern.slice(0, -1)
  }

  const anchored = pattern.startsWith("/")
  if (anchored) pattern = pattern.slice(1)

  // No slash → match any path segment (gitignore behavior).
  const segmentOnly = !pattern.includes("/")

  let re = ""
  let i = 0
  while (i < pattern.length) {
    const c = pattern[i]!
    if (c === "*" && pattern[i + 1] === "*") {
      // **/ → zero or more directories; bare ** → anything
      if (pattern[i + 2] === "/") {
        re += "(?:.*/)?"
        i += 3
      } else {
        re += ".*"
        i += 2
      }
      continue
    }
    if (c === "*") {
      re += "[^/]*"
      i += 1
      continue
    }
    if (c === "?") {
      re += "[^/]"
      i += 1
      continue
    }
    if ("+.^$()[]{}|\\".includes(c)) {
      re += `\\${c}`
      i += 1
      continue
    }
    re += c
    i += 1
  }

  if (segmentOnly) {
    // `.*` / `node_modules` match that segment anywhere in the path.
    return {
      directoryOnly,
      regex: new RegExp(`(?:^|/)${re}(?:/|$)`),
    }
  }
  if (anchored) {
    return {
      directoryOnly,
      regex: new RegExp(`^${re}(?:/|$)`),
    }
  }
  return {
    directoryOnly,
    regex: new RegExp(`(?:^|/)${re}(?:/|$)`),
  }
}

export function parseWorkspaceIgnore(content: string): CompiledRule[] {
  const rules: CompiledRule[] = []
  for (const lineRaw of content.split(/\r?\n/)) {
    let line = lineRaw
    if (!line.trim() || line.trimStart().startsWith("#")) continue
    // Unescape trailing spaces only when escaped with \
    if (!line.endsWith("\\ ")) line = line.trimEnd()
    else line = line.slice(0, -2) + " "

    let negate = false
    if (line.startsWith("!")) {
      negate = true
      line = line.slice(1)
    }
    if (!line) continue
    const { directoryOnly, regex } = patternToRegex(line)
    rules.push({ negate, directoryOnly, regex })
  }
  return rules
}

export type WorkspaceIgnoreMatcher = {
  ignores(relativePath: string, isDirectory?: boolean): boolean
}

export function createWorkspaceIgnoreMatcher(
  contents: readonly string[]
): WorkspaceIgnoreMatcher {
  const rules = contents.flatMap((c) => parseWorkspaceIgnore(c))
  return {
    ignores(relativePath: string, isDirectory = false): boolean {
      const path = normalizeRel(relativePath)
      if (!path) return false
      // Internal config — never show in the Files tree (ignore file negations).
      if (path === WORKSPACE_IGNORE_FILE) return true
      // Attachments must sync even though they live under a dot directory.
      if (
        path === ".eve/attachments" ||
        path.startsWith(".eve/attachments/") ||
        path === "attachments" ||
        path.startsWith("attachments/")
      ) {
        return false
      }

      let ignored = false
      for (const rule of rules) {
        let matched = false
        if (rule.directoryOnly && !isDirectory) {
          // Dir-only rules also hide files under a matching parent directory.
          const parts = path.split("/")
          for (let i = 0; i < parts.length - 1; i++) {
            const parent = parts.slice(0, i + 1).join("/")
            if (rule.regex.test(parent) || rule.regex.test(`${parent}/`)) {
              matched = true
              break
            }
          }
        } else {
          matched =
            rule.regex.test(path) ||
            (isDirectory && rule.regex.test(`${path}/`))
        }
        if (!matched) continue
        ignored = !rule.negate
      }
      return ignored
    },
  }
}

/** Built-in defaults (same as DEFAULT_WORKSPACE_IGNORE). */
export function defaultWorkspaceIgnoreMatcher(): WorkspaceIgnoreMatcher {
  return createWorkspaceIgnoreMatcher([DEFAULT_WORKSPACE_IGNORE])
}
