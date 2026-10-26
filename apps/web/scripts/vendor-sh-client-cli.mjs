/**
 * Build @ship-happens/sh-client (if needed) and copy the standalone CLI into
 * apps/web so Next/Vercel file tracing can ship it with serverless functions.
 */
import { cp, mkdir, access } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { spawnSync } from "node:child_process"

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..")
const repoRoot = join(webRoot, "../..")
const packageDir = join(repoRoot, "packages/sh-client")
const cliSrc = join(packageDir, "dist/cli.js")
const vendorDir = join(webRoot, "lib/sh-client/vendor")
const cliDest = join(vendorDir, "sh-client.cli.js")

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
  })
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed with status ${result.status}`
    )
  }
}

async function cliExists() {
  try {
    await access(cliSrc)
    return true
  } catch {
    return false
  }
}

async function main() {
  if (await cliExists()) {
    console.log(
      `[vendor-sh-client-cli] reusing existing ${cliSrc} (skip rebuild)`
    )
  } else {
    run("pnpm", ["run", "build"], packageDir)
  }

  if (!(await cliExists())) {
    throw new Error(`Expected CLI at ${cliSrc} after sh-client build`)
  }

  await mkdir(vendorDir, { recursive: true })
  await cp(cliSrc, cliDest)
  console.log(`[vendor-sh-client-cli] wrote ${cliDest}`)
}

await main()
