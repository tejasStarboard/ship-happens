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
  const out: Record<string, string> = {}
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
 * Install Astral `uv`/`uvx` when missing so `uvx agent-xlsx` works without a
 * global Python install. Best-effort: never fail sandbox prepare (sb-client
 * still works without uv).
 */
export async function ensureSandboxUv(sandbox: SandboxHandle): Promise<void> {
  const pathPrefix = 'export PATH="$HOME/.local/bin:/usr/local/bin:$PATH"'
  const existing = await sandbox.run({
    command: `${pathPrefix}; if command -v uvx >/dev/null 2>&1; then uvx --version; else echo "${MISSING_UVX}"; fi`,
  })
  if (!existing.stdout.includes(MISSING_UVX)) return

  // Soft install: always exit 0 so prepare does not abort the template.
  const install = await sandbox.run({
    command: [
      "set +e",
      pathPrefix,
      "curl -LsSf https://astral.sh/uv/install.sh | sh",
      pathPrefix,
      'if [[ -x "$HOME/.local/bin/uv" ]]; then sudo ln -sfn "$HOME/.local/bin/uv" /usr/local/bin/uv; fi',
      'if [[ -x "$HOME/.local/bin/uvx" ]]; then sudo ln -sfn "$HOME/.local/bin/uvx" /usr/local/bin/uvx; fi',
      `if command -v uvx >/dev/null 2>&1; then uvx --version; else echo "${UV_INSTALL_FAILED}"; fi`,
      "exit 0",
    ].join("; "),
  })
  if (install.stdout.includes(UV_INSTALL_FAILED)) {
    console.warn(
      `[sandbox] uv/uvx install failed (agent-xlsx via uvx unavailable): ${install.stderr || install.stdout}`
    )
  }
}

/** Node (sb-client) + uv (agent-xlsx) for the RFP sandbox. */
export async function prepareStarboardSandbox(
  sandbox: SandboxHandle
): Promise<void> {
  await ensureSandboxNode(sandbox)
  await ensureSandboxUv(sandbox)
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
