/**
 * sh-client — Ship Happens fill control-plane CLI.
 *
 *   sh-client auth test
 *   sh-client status [--fill id]
 *   sh-client progress [--fill id]
 *   sh-client logs [--fill id] [--limit N] [--level info]
 *   sh-client cells [--fill id] [--lane id]
 *   sh-client reviews list|get|create|update|resolve …
 *   sh-client mapping get|put|import …
 *   sh-client rates resolve [--fill id]
 *   sh-client export [--fill id]
 *
 * Env: SH_APP_URL, SH_API_KEY, SH_FILL_ID
 */

import { parseArgs } from "node:util"
import { createClient } from "./createClient.js"
import { ShClientError } from "./errors.js"
import { readJsonInput } from "./cli/parseBody.js"

const HELP = `sh-client — Ship Happens fill CLI (status, progress, logs, cells, mapping, reviews, rates, export)

Usage:
  sh-client <command> [subcommand] [options]

Auth:
  auth test                         Verify API key

Inspect:
  status [--fill id]                Fill run status
  progress [--fill id]              Progress steps
  logs [--fill id] [--limit N] [--level info|warn|…]
  cells [--fill id] [--lane id]     Per-row audit (Starboard + overlay + markup)

Mapping (Postgres; mapping.json is import/export only):
  mapping get [--fill id]           List confirmed lanes
  mapping put [--fill id] --body '{ "version": 1, "lanes": […] }'
  mapping import [--fill id] [--body …]  Body or workspace mapping.json → DB

Reviews:
  reviews list [--fill id] [--status pending|…]
  reviews get --id <reviewId> [--fill id]
  reviews create [--fill id] --body '{ title, proposal?, … }'
  reviews update --id <reviewId> [--fill id] --body '{ … }'
  reviews resolve --id <reviewId> [--fill id] [--body '{ resolution? }']

Rates:
  rates resolve [--fill id]         Starboard resolve for DB-mapped lanes; advances Progress rates

Export:
  export [--fill id]                Write sells into original BCO template; opens final export sign-off (Confirm unlocks download)

Options:
  --fill <id>       Fill / workspace id (default: SH_FILL_ID)
  --body <json>     JSON payload
  --file <path>     JSON file (or use stdin)
  --help            Show this help

Env:
  SH_APP_URL
  SH_API_KEY
  SH_FILL_ID
`

function printJson(data: unknown): void {
  process.stdout.write(`${JSON.stringify(data, null, 2)}\n`)
}

function fail(err: unknown): never {
  const message = err instanceof Error ? err.message : String(err)
  const status = err instanceof ShClientError ? err.status : undefined
  const code = err instanceof ShClientError ? err.code : undefined
  printJson({
    error: message,
    ...(status != null ? { status } : {}),
    ...(code ? { code } : {}),
  })
  process.exit(1)
}

function strFlag(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined
}

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
      help: { type: "boolean", short: "h" },
      fill: { type: "string" },
      body: { type: "string" },
      file: { type: "string" },
      id: { type: "string" },
      status: { type: "string" },
      limit: { type: "string" },
      level: { type: "string" },
      lane: { type: "string" },
    },
    allowPositionals: true,
    strict: true,
  })

  if (values.help || positionals.length === 0) {
    process.stdout.write(HELP)
    process.exit(0)
  }

  const client = createClient()
  const fill = strFlag(values.fill)
  const [cmd, sub] = positionals

  try {
    if (cmd === "auth" && sub === "test") {
      printJson(await client.authTest())
      return
    }

    if (cmd === "status") {
      printJson(await client.status(fill))
      return
    }

    if (cmd === "progress") {
      printJson(await client.progress(fill))
      return
    }

    if (cmd === "logs") {
      const limitRaw = strFlag(values.limit)
      const limit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined
      printJson(
        await client.logs(fill, {
          limit: Number.isFinite(limit) ? limit : undefined,
          level: strFlag(values.level),
        })
      )
      return
    }

    if (cmd === "cells") {
      printJson(await client.cells(fill, { laneId: strFlag(values.lane) }))
      return
    }

    if (cmd === "reviews") {
      if (sub === "list") {
        printJson(
          await client.reviewsList(fill, { status: strFlag(values.status) })
        )
        return
      }
      if (sub === "get") {
        const id = strFlag(values.id)
        if (!id) throw new Error("reviews get requires --id")
        printJson(await client.reviewsGet(id, fill))
        return
      }
      if (sub === "create") {
        const body = await readJsonInput({
          body: strFlag(values.body),
          file: strFlag(values.file),
        })
        printJson(await client.reviewsCreate(body, fill))
        return
      }
      if (sub === "update") {
        const id = strFlag(values.id)
        if (!id) throw new Error("reviews update requires --id")
        const body = await readJsonInput({
          body: strFlag(values.body),
          file: strFlag(values.file),
        })
        printJson(await client.reviewsUpdate(id, body, fill))
        return
      }
      if (sub === "resolve") {
        const id = strFlag(values.id)
        if (!id) throw new Error("reviews resolve requires --id")
        const body = await readJsonInput({
          body: strFlag(values.body),
          file: strFlag(values.file),
          allowEmpty: true,
        })
        printJson(await client.reviewsResolve(id, body, fill))
        return
      }
      throw new Error(
        `Unknown reviews subcommand: ${sub ?? "(none)"}. Try list|get|create|update|resolve`
      )
    }

    if (cmd === "mapping") {
      if (sub === "get") {
        printJson(await client.mappingGet(fill))
        return
      }
      if (sub === "put") {
        const body = await readJsonInput({
          body: strFlag(values.body),
          file: strFlag(values.file),
        })
        printJson(await client.mappingPut(body, fill))
        return
      }
      if (sub === "import") {
        const hasInput =
          strFlag(values.body) != null || strFlag(values.file) != null
        const body = hasInput
          ? await readJsonInput({
              body: strFlag(values.body),
              file: strFlag(values.file),
            })
          : undefined
        printJson(await client.mappingImport(body, fill))
        return
      }
      throw new Error(
        `Unknown mapping subcommand: ${sub ?? "(none)"}. Try get|put|import`
      )
    }

    if (cmd === "rates") {
      if (sub === "resolve") {
        printJson(await client.ratesResolve(fill))
        return
      }
      throw new Error(
        `Unknown rates subcommand: ${sub ?? "(none)"}. Try resolve`
      )
    }

    if (cmd === "export") {
      printJson(await client.exportWorkbook(fill))
      return
    }

    throw new Error(`Unknown command: ${cmd}. Run sh-client --help`)
  } catch (err) {
    fail(err)
  }
}

main().catch(fail)
