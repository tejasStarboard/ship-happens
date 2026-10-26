/**
 * Build @starboard/sb-client (if needed) and copy the standalone CLI into
 * apps/web so Next/Vercel file tracing can ship it with serverless functions.
 *
 * Dynamic fs lookups of workspace node_modules/dist/cli.js are not traced,
 * which breaks sandbox inject on Vercel.
 *
 * When Turbo already ran `^build` for @starboard/sb-client, skip the rebuild
 * and only copy dist/cli.js → vendor.
 */
import { cp, mkdir, access } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { spawnSync } from "node:child_process"

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..")
const repoRoot = join(webRoot, "../..")
const packageDir = join(repoRoot, "packages/sb-client")
const cliSrc = join(packageDir, "dist/cli.js")
const vendorDir = join(webRoot, "lib/starboard/vendor")
const cliDest = join(vendorDir, "sb-client.cli.js")

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
      `[vendor-sb-client-cli] reusing existing ${cliSrc} (skip rebuild)`
    )
  } else {
    run("pnpm", ["run", "build"], packageDir)
  }

  if (!(await cliExists())) {
    throw new Error(`Expected CLI at ${cliSrc} after sb-client build`)
  }

  await mkdir(vendorDir, { recursive: true })
  await cp(cliSrc, cliDest)
  console.log(`[vendor-sb-client-cli] wrote ${cliDest}`)
}

await main()
