import { access, readFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { env } from "@/env"

type SandboxHandle = {
  writeBinaryFile(options: {
    path: string
    content: Uint8Array
  }): PromiseLike<unknown>
  writeTextFile(options: {
    path: string
    content: string
  }): PromiseLike<unknown>
  run(options: { command: string }): PromiseLike<{
    exitCode: number
    stdout: string
    stderr: string
  }>
}

/** Bundled CLI JS inside the sandbox workspace. */
export const SB_CLIENT_WORKSPACE_JS = ".eve/bin/sb-client.js"

/** Shell wrapper on PATH (sources Starboard env, then runs the JS). */
export const SB_CLIENT_WORKSPACE_BIN = ".eve/bin/sb-client"

export const SB_CLIENT_SANDBOX_JS = `/workspace/${SB_CLIENT_WORKSPACE_JS}`
export const SB_CLIENT_SANDBOX_BIN = `/workspace/${SB_CLIENT_WORKSPACE_BIN}`
export const SB_CLIENT_ENV_FILE = "/workspace/.eve/sb-client.env"

/**
 * Writable home for uv/agent-xlsx under `.eve` so tool caches never land in the
 * user-visible workspace root (Vercel image `$HOME` is often not writable).
 */
export const SANDBOX_WORKSPACE_HOME = "/workspace/.eve/home"
export const SANDBOX_UV_CACHE_DIR = "/workspace/.eve/uv-cache"
export const SANDBOX_UV_TOOL_DIR = "/workspace/.eve/uv-tools"
export const AGENT_XLSX_WORKSPACE_BIN = ".eve/bin/agent-xlsx"
export const AGENT_XLSX_SANDBOX_BIN = `/workspace/${AGENT_XLSX_WORKSPACE_BIN}`

/**
 * Env so `uv` / `uvx` / `agent-xlsx` write under `/workspace` instead of a
 * read-only `/home/vercel-sandbox`.
 */
export function sandboxWritableHomeEnv(): Record<string, string> {
  return {
    HOME: SANDBOX_WORKSPACE_HOME,
    UV_CACHE_DIR: SANDBOX_UV_CACHE_DIR,
    UV_TOOL_DIR: SANDBOX_UV_TOOL_DIR,
    XDG_CACHE_HOME: "/workspace/.eve/xdg-cache",
    XDG_DATA_HOME: "/workspace/.eve/xdg-data",
  }
}

const SANDBOX_PATH_EXPORT =
  'export PATH="/workspace/.eve/home/.local/bin:/usr/local/bin:/usr/bin:/bin:$PATH"'

function sandboxHomeExports(): string {
  const env = sandboxWritableHomeEnv()
  return Object.entries(env)
    .map(([key, value]) => `export ${key}=${shellSingleQuote(value)}`)
    .concat(SANDBOX_PATH_EXPORT)
    .join("; ")
}

/**
 * Starboard env for microsandbox command environment / env file.
 * Omits unset keys so we don't pass empty strings.
 */
export function starboardSandboxEnv(): Record<string, string> {
  const entries: Array<[string, string | undefined]> = [
    ["STARBOARD_APP_DOMAIN", env.STARBOARD_APP_DOMAIN],
    ["STARBOARD_HANDSHAKE_KEY", env.STARBOARD_HANDSHAKE_KEY],
    ["SB_CLIENT_CLIENT_ID", env.SB_CLIENT_CLIENT_ID],
    ["SB_CLIENT_CLIENT_SECRET", env.SB_CLIENT_CLIENT_SECRET],
    ["SB_CLIENT_COMPANY_ID", env.SB_CLIENT_COMPANY_ID],
  ]
  const out: Record<string, string> = { ...sandboxWritableHomeEnv() }
  for (const [key, value] of entries) {
    if (value) out[key] = value
  }
  return out
}

function shellSingleQuote(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`
}

function formatEnvFile(vars: Record<string, string>): string {
  return (
    Object.entries(vars)
      .map(([key, value]) => `${key}=${shellSingleQuote(value)}`)
      .join("\n") + (Object.keys(vars).length > 0 ? "\n" : "")
  )
}

export async function resolveSbClientCliPath(): Promise<string> {
  const candidates: string[] = []

  // Prefer the vendored copy under apps/web (included via outputFileTracingIncludes).
  // Workspace node_modules/dist/cli.js is not traced into Vercel functions.
  try {
    candidates.push(
      fileURLToPath(new URL("./vendor/sb-client.cli.js", import.meta.url))
    )
  } catch {
    // ignore
  }

  try {
    const resolved = fileURLToPath(
      import.meta.resolve("@ship-happens/sb-client")
    )
    candidates.push(join(dirname(resolved), "cli.js"))
  } catch {
    // Fall through to cwd-relative candidates.
  }

  candidates.push(
    join(process.cwd(), "lib/starboard/vendor/sb-client.cli.js"),
    join(process.cwd(), "node_modules/@ship-happens/sb-client/dist/cli.js"),
    join(process.cwd(), "../../packages/sb-client/dist/cli.js"),
    join(process.cwd(), "../packages/sb-client/dist/cli.js"),
    join(process.cwd(), "packages/sb-client/dist/cli.js")
  )

  for (const candidate of candidates) {
    try {
      await access(candidate)
      return candidate
    } catch {
      // try next
    }
  }

  throw new Error(
    "Built @ship-happens/sb-client CLI not found. Run: pnpm --filter web build:sb-client-cli"
  )
}

/**
 * Microsandbox prepare throws if `sandbox.run` exits non-zero — probes must
 * always exit 0 and signal missing tools via stdout markers instead.
 */
const MISSING_NODE = "__NODE_MISSING__"
const MISSING_UVX = "__UVX_MISSING__"
const UV_INSTALL_FAILED = "__UV_INSTALL_FAILED__"
const MISSING_AGENT_XLSX = "__AGENT_XLSX_MISSING__"
const AGENT_XLSX_INSTALL_FAILED = "__AGENT_XLSX_INSTALL_FAILED__"

/**
 * Install Node into the sandbox image/snapshot when missing (eve base image
 * is bash-only; sb-client needs `node` on PATH).
 */
export async function ensureSandboxNode(sandbox: SandboxHandle): Promise<void> {
  const existing = await sandbox.run({
    command: `if command -v node >/dev/null 2>&1; then node -v; else echo "${MISSING_NODE}"; fi`,
  })
  if (!existing.stdout.includes(MISSING_NODE)) return

  const install = await sandbox.run({
    command: [
      "set -euo pipefail",
      "ARCH=$(uname -m)",
      'case "$ARCH" in aarch64|arm64) NODE_ARCH=arm64 ;; x86_64) NODE_ARCH=x64 ;; *) echo "unsupported arch: $ARCH" >&2; exit 1 ;; esac',
      "NODE_VERSION=22.14.0",
      'curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${NODE_ARCH}.tar.xz" -o /tmp/node.tar.xz',
      "sudo tar -xJf /tmp/node.tar.xz -C /usr/local --strip-components=1",
      "rm -f /tmp/node.tar.xz",
      "node -v",
      "npm -v",
    ].join(" && "),
  })
  if (install.exitCode !== 0) {
    throw new Error(
      `Failed to install Node in sandbox: ${install.stderr || install.stdout}`
    )
  }
}

/**
 * Install Astral `uv`/`uvx` when missing. Uses writable `/workspace` home —
 * Vercel sandbox `$HOME` often cannot create `~/.local/share/uv`.
 * Best-effort: never fail sandbox prepare (sb-client still works without uv).
 */
export async function ensureSandboxUv(sandbox: SandboxHandle): Promise<void> {
  const home = sandboxHomeExports()
  const existing = await sandbox.run({
    command: `${home}; if command -v uvx >/dev/null 2>&1; then uvx --version; else echo "${MISSING_UVX}"; fi`,
  })
  if (!existing.stdout.includes(MISSING_UVX)) return

  // Soft install: always exit 0 so prepare does not abort the template.
  const install = await sandbox.run({
    command: [
      "set +e",
      home,
      "mkdir -p /workspace/.eve/home/.local/bin /workspace/.eve/uv-cache /workspace/.eve/uv-tools /workspace/.eve/xdg-cache /workspace/.eve/xdg-data",
      "curl -LsSf https://astral.sh/uv/install.sh | sh",
      home,
      "if [[ -x /workspace/.eve/home/.local/bin/uv ]]; then sudo ln -sfn /workspace/.eve/home/.local/bin/uv /usr/local/bin/uv; fi",
      "if [[ -x /workspace/.eve/home/.local/bin/uvx ]]; then sudo ln -sfn /workspace/.eve/home/.local/bin/uvx /usr/local/bin/uvx; fi",
      `if command -v uvx >/dev/null 2>&1; then uvx --version; else echo "${UV_INSTALL_FAILED}"; fi`,
      "exit 0",
    ].join("; "),
  })
  if (install.stdout.includes(UV_INSTALL_FAILED)) {
    console.warn(
      `[sandbox] uv/uvx install failed (agent-xlsx unavailable): ${install.stderr || install.stdout}`
    )
  }
}

const AGENT_XLSX_WRAPPER = `#!/usr/bin/env bash
set -euo pipefail
export HOME=${SANDBOX_WORKSPACE_HOME}
export UV_CACHE_DIR=${SANDBOX_UV_CACHE_DIR}
export UV_TOOL_DIR=${SANDBOX_UV_TOOL_DIR}
export XDG_CACHE_HOME=/workspace/.eve/xdg-cache
export XDG_DATA_HOME=/workspace/.eve/xdg-data
export PATH="/workspace/.eve/home/.local/bin:/usr/local/bin:/usr/bin:/bin:\${PATH:-}"
# Prefer the tool install from sandbox prepare (no per-turn download).
if [[ -x /workspace/.eve/home/.local/bin/agent-xlsx ]]; then
  exec /workspace/.eve/home/.local/bin/agent-xlsx "$@"
fi
# Fallback: click is required by current agent-xlsx wheels but often undeclared.
exec uvx --with click agent-xlsx "$@"
`

/**
 * Pre-install `agent-xlsx` into `/workspace` during prepare so agent turns do
 * not pay for a ~150MB uvx download. Soft-fail — never abort prepare.
 */
export async function ensureSandboxAgentXlsx(
  sandbox: SandboxHandle
): Promise<void> {
  const home = sandboxHomeExports()

  await sandbox.writeTextFile({
    path: AGENT_XLSX_WORKSPACE_BIN,
    content: AGENT_XLSX_WRAPPER,
  })
  await sandbox.run({
    command: [
      `chmod +x ${AGENT_XLSX_SANDBOX_BIN}`,
      `sudo cp ${AGENT_XLSX_SANDBOX_BIN} /usr/local/bin/agent-xlsx`,
      "sudo chmod +x /usr/local/bin/agent-xlsx",
    ].join(" && "),
  })

  const existing = await sandbox.run({
    command: [
      home,
      // Smoke: help must exit 0 (avoids click import failures).
      `if command -v agent-xlsx >/dev/null 2>&1 && agent-xlsx probe -h >/dev/null 2>&1; then echo ready; else echo "${MISSING_AGENT_XLSX}"; fi`,
    ].join("; "),
  })
  if (!existing.stdout.includes(MISSING_AGENT_XLSX)) return

  const install = await sandbox.run({
    command: [
      "set +e",
      home,
      "mkdir -p /workspace/.eve/home/.local/bin /workspace/.eve/uv-cache /workspace/.eve/uv-tools",
      // click is required but often undeclared on the published wheel.
      "uv tool install --force --with click agent-xlsx",
      home,
      `if [[ -x /workspace/.eve/home/.local/bin/agent-xlsx ]] && agent-xlsx probe -h >/dev/null 2>&1; then agent-xlsx probe -h | head -5; else echo "${AGENT_XLSX_INSTALL_FAILED}"; fi`,
      "exit 0",
    ].join("; "),
  })
  if (install.stdout.includes(AGENT_XLSX_INSTALL_FAILED)) {
    console.warn(
      `[sandbox] agent-xlsx install failed: ${install.stderr || install.stdout}`
    )
  }
}

/**
 * Re-install the PATH wrapper on each sandbox open (prepare may be cached;
 * `/usr/local/bin` may not persist the tool, but `/workspace/.eve` does).
 */
export async function injectAgentXlsxCli(
  sandbox: SandboxHandle
): Promise<void> {
  await sandbox.run({
    command:
      "mkdir -p /workspace/.eve/bin /workspace/.eve/home/.local/bin /workspace/.eve/uv-cache /workspace/.eve/uv-tools /workspace/.eve/xdg-cache /workspace/.eve/xdg-data",
  })
  await sandbox.writeTextFile({
    path: AGENT_XLSX_WORKSPACE_BIN,
    content: AGENT_XLSX_WRAPPER,
  })
  await sandbox.run({
    command: [
      `chmod +x ${AGENT_XLSX_SANDBOX_BIN}`,
      `sudo cp ${AGENT_XLSX_SANDBOX_BIN} /usr/local/bin/agent-xlsx`,
      "sudo chmod +x /usr/local/bin/agent-xlsx",
      // If prepare already installed the tool under .eve/home, we're done.
      // Otherwise best-effort install (may download once per fresh workspace).
      sandboxHomeExports(),
      "if [[ ! -x /workspace/.eve/home/.local/bin/agent-xlsx ]]; then uv tool install --force --with click agent-xlsx || true; fi",
      "exit 0",
    ].join("; "),
  })
}

/** Node (sb-client) + uv + agent-xlsx for the RFP sandbox. */
export async function prepareStarboardSandbox(
  sandbox: SandboxHandle
): Promise<void> {
  await ensureSandboxNode(sandbox)
  await ensureSandboxUv(sandbox)
  await ensureSandboxAgentXlsx(sandbox)
}

const SB_CLIENT_WRAPPER = `#!/usr/bin/env bash
set -euo pipefail
if [[ -f ${SB_CLIENT_ENV_FILE} ]]; then
  set -a
  # shellcheck disable=SC1091
  source ${SB_CLIENT_ENV_FILE}
  set +a
fi
exec node ${SB_CLIENT_SANDBOX_JS} "$@"
`

/**
 * Copy the built `@ship-happens/sb-client` CLI into the sandbox and install on PATH.
 * Re-run on each sandbox open so local rebuilds are picked up.
 * Writes Starboard env to `.eve/sb-client.env` (sourced by the wrapper).
 */
export async function injectSbClientCli(sandbox: SandboxHandle): Promise<void> {
  const cliPath = await resolveSbClientCliPath()
  const bytes = await readFile(cliPath)
  const envFile = formatEnvFile(starboardSandboxEnv())

  await sandbox.run({ command: "mkdir -p /workspace/.eve/bin" })
  await sandbox.writeBinaryFile({
    path: SB_CLIENT_WORKSPACE_JS,
    content: new Uint8Array(bytes),
  })
  await sandbox.writeTextFile({
    path: ".eve/sb-client.env",
    content: envFile,
  })
  await sandbox.writeTextFile({
    path: SB_CLIENT_WORKSPACE_BIN,
    content: SB_CLIENT_WRAPPER,
  })

  const install = await sandbox.run({
    command: [
      `chmod +x ${SB_CLIENT_SANDBOX_BIN} ${SB_CLIENT_SANDBOX_JS}`,
      `sudo cp ${SB_CLIENT_SANDBOX_BIN} /usr/local/bin/sb-client`,
      "sudo chmod +x /usr/local/bin/sb-client",
      "command -v sb-client",
      "command -v node",
    ].join(" && "),
  })
  if (install.exitCode !== 0) {
    throw new Error(
      `Failed to install sb-client in sandbox: ${install.stderr || install.stdout}`
    )
  }
}
