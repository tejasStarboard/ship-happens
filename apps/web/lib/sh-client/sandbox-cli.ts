import { access, readFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { env } from "@/env"
import { createFillAgentApiKey } from "@/lib/auth/sh-api-key"
import { createAppContext } from "@/lib/di/create-app-context"
import { DomainError } from "@/lib/domain/errors"

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

export const SH_CLIENT_WORKSPACE_JS = ".eve/bin/sh-client.js"
export const SH_CLIENT_WORKSPACE_BIN = ".eve/bin/sh-client"
export const SH_CLIENT_SANDBOX_JS = `/workspace/${SH_CLIENT_WORKSPACE_JS}`
export const SH_CLIENT_SANDBOX_BIN = `/workspace/${SH_CLIENT_WORKSPACE_BIN}`
export const SH_CLIENT_ENV_FILE = "/workspace/.eve/sh-client.env"

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

export async function resolveShClientCliPath(): Promise<string> {
  const candidates: string[] = []

  try {
    candidates.push(
      fileURLToPath(new URL("./vendor/sh-client.cli.js", import.meta.url))
    )
  } catch {
    // ignore
  }

  try {
    const resolved = fileURLToPath(
      import.meta.resolve("@ship-happens/sh-client")
    )
    candidates.push(join(dirname(resolved), "cli.js"))
  } catch {
    // Fall through
  }

  candidates.push(
    join(process.cwd(), "lib/sh-client/vendor/sh-client.cli.js"),
    join(process.cwd(), "node_modules/@ship-happens/sh-client/dist/cli.js"),
    join(process.cwd(), "../../packages/sh-client/dist/cli.js"),
    join(process.cwd(), "../packages/sh-client/dist/cli.js"),
    join(process.cwd(), "packages/sh-client/dist/cli.js")
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
    "Built @ship-happens/sh-client CLI not found. Run: pnpm --filter web build:sh-client-cli"
  )
}

const SH_CLIENT_WRAPPER = `#!/usr/bin/env bash
set -euo pipefail
if [[ -f ${SH_CLIENT_ENV_FILE} ]]; then
  set -a
  # shellcheck disable=SC1091
  source ${SH_CLIENT_ENV_FILE}
  set +a
fi
exec node ${SH_CLIENT_SANDBOX_JS} "$@"
`

/**
 * Ensure sandbox has an executable sh-client and env matching current APP_URL.
 * Re-injects when missing or when SH_APP_URL is stale (e.g. localhost → ngrok).
 */
export async function ensureShClientCli(
  sandbox: SandboxHandle,
  options: { fillId: string }
): Promise<void> {
  const appUrl = env.APP_URL.replace(/\/$/, "")
  const probe = await sandbox.run({
    command: [
      "set +e",
      "if [[ ! -f /workspace/.eve/sh-client.env ]]; then",
      "  echo __SH_ENV_MISSING__",
      `elif grep -F ${shellSingleQuote(appUrl)} /workspace/.eve/sh-client.env >/dev/null 2>&1; then`,
      "  echo __SH_ENV_CURRENT__",
      "else",
      "  echo __SH_ENV_STALE__",
      "fi",
      `if [[ -x ${SH_CLIENT_SANDBOX_BIN} ]] && command -v sh-client >/dev/null 2>&1; then`,
      "  echo __SH_BIN_OK__",
      "else",
      "  echo __SH_BIN_BAD__",
      "fi",
    ].join("\n"),
  })
  const out = probe.stdout
  const needsInject =
    out.includes("__SH_ENV_MISSING__") || out.includes("__SH_ENV_STALE__")
  if (needsInject) {
    await injectShClientCli(sandbox, options)
    return
  }
  if (out.includes("__SH_BIN_BAD__")) {
    const fix = await sandbox.run({
      command: [
        `chmod +x ${SH_CLIENT_SANDBOX_BIN} ${SH_CLIENT_SANDBOX_JS} 2>/dev/null || true`,
        `if [[ -f ${SH_CLIENT_SANDBOX_BIN} ]]; then sudo cp ${SH_CLIENT_SANDBOX_BIN} /usr/local/bin/sh-client && sudo chmod +x /usr/local/bin/sh-client; fi`,
        "command -v sh-client",
      ].join(" && "),
    })
    if (fix.exitCode !== 0) {
      await injectShClientCli(sandbox, options)
    }
  }
}

/**
 * Install sh-client on PATH and write fill-scoped API key env for the sandbox.
 */
export async function injectShClientCli(
  sandbox: SandboxHandle,
  options: { fillId: string }
): Promise<void> {
  const app = createAppContext()
  const fill = await app.repos.rfps.findById(options.fillId)
  if (!fill) {
    throw new DomainError(`Fill not found: ${options.fillId}`, "NOT_FOUND")
  }

  const { key } = await createFillAgentApiKey({
    userId: fill.ownerUserId,
    organizationId: fill.organizationId,
    fillId: fill.id,
  })

  const cliPath = await resolveShClientCliPath()
  const bytes = await readFile(cliPath)
  const envFile = formatEnvFile({
    SH_APP_URL: env.APP_URL,
    SH_API_KEY: key,
    SH_FILL_ID: fill.id,
  })

  await sandbox.run({ command: "mkdir -p /workspace/.eve/bin" })
  await sandbox.writeBinaryFile({
    path: SH_CLIENT_WORKSPACE_JS,
    content: new Uint8Array(bytes),
  })
  await sandbox.writeTextFile({
    path: ".eve/sh-client.env",
    content: envFile,
  })
  await sandbox.writeTextFile({
    path: SH_CLIENT_WORKSPACE_BIN,
    content: SH_CLIENT_WRAPPER,
  })

  const install = await sandbox.run({
    command: [
      `chmod +x ${SH_CLIENT_SANDBOX_BIN} ${SH_CLIENT_SANDBOX_JS}`,
      `sudo cp ${SH_CLIENT_SANDBOX_BIN} /usr/local/bin/sh-client`,
      "sudo chmod +x /usr/local/bin/sh-client",
      "command -v sh-client",
      "command -v node",
    ].join(" && "),
  })
  if (install.exitCode !== 0) {
    throw new Error(
      `Failed to install sh-client in sandbox: ${install.stderr || install.stdout}`
    )
  }
}
