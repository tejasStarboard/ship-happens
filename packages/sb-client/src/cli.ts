/**
 * sb-client — standalone Starboard CLI.

 *
 *   sb-client auth test
 *   sb-client rates resolve --body '...'
 *   sb-client margins apply --body '{"buy":1000,"pct":5}'
 *
 * Env: STARBOARD_APP_DOMAIN, STARBOARD_HANDSHAKE_KEY,
 *      SB_CLIENT_CLIENT_ID + SB_CLIENT_CLIENT_SECRET (or SB_CLIENT_COMPANY_ID)
 */

import { parseArgs } from "node:util"
import { AuthError } from "./auth/types.js"
import { createClient } from "./createClient.js"
import { loadConfig } from "./config.js"
import { StarboardApiError } from "./http/starboardHttp.js"
import { readJsonInput } from "./cli/parseBody.js"

const HELP = `sb-client — Starboard client CLI (rates, globals, locations, margins)

Usage:
  sb-client <module> <command> [options]

Auth:
  auth test                         Verify credentials / print company_id

Rates:
  rates search-contract --body …    POST /api/qv2/rates/search
  rates search-spot --body …        POST /api/vendor_rates/spot/{carrier}
  rates resolve --body …            Search + attach global defaults (quote-view shape)
  rates recommend --body …          { "rates": [...], "preferred_carriers"?: [] }

Margins:
  margins apply --body …            { "buy", "pct"?, "amount"? }
  margins check-floor --body …      { "buy", "sell", "min_amount"?, "min_pct"? }

Globals:
  globals list [--service ocean_fcl] [--defaults-only]
  globals match --body …            { "service", "defaults_only"?, "name_contains"? }
  globals classify --name "AMS"
  globals rollup --body …           { "charges": [...], "headings"?: [] }

Locations:
  locations resolve --query "Shanghai"
  locations resolve-lane --origin "CNSHA" --destination "Chicago via LA"

Options:
  --body <json>     JSON payload
  --file <path>     JSON file (or use stdin)
  --help            Show this help

Env:
  STARBOARD_APP_DOMAIN
  STARBOARD_HANDSHAKE_KEY
  SB_CLIENT_CLIENT_ID / SB_CLIENT_CLIENT_SECRET
  (dev) SB_CLIENT_COMPANY_ID
`

function printJson(data: unknown): void {
  process.stdout.write(`${JSON.stringify(data, null, 2)}\n`)
}

function fail(err: unknown): never {
  const message = err instanceof Error ? err.message : String(err)
  const status =
    err instanceof AuthError || err instanceof StarboardApiError
      ? err.statusCode
      : undefined
  printJson({ error: message, ...(status != null ? { status } : {}) })
  process.exit(1)
}

function strFlag(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined
}

function boolFlag(v: unknown): boolean | undefined {
  return typeof v === "boolean" ? v : undefined
}

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
      help: { type: "boolean", short: "h" },
      body: { type: "string" },
      file: { type: "string" },
      service: { type: "string" },
      "defaults-only": { type: "boolean" },
      name: { type: "string" },
      query: { type: "string" },
      origin: { type: "string" },
      destination: { type: "string" },
      "origin-via": { type: "string" },
      "include-airports": { type: "boolean" },
    },
    allowPositionals: true,
    strict: true,
  })

  const bodyFlag = strFlag(values.body)
  const fileFlag = strFlag(values.file)

  if (values.help || positionals.length === 0) {
    process.stdout.write(HELP)
    process.exit(values.help || positionals.length === 0 ? 0 : 1)
  }

  const [mod, cmd] = positionals
  if (!mod || !cmd) {
    process.stdout.write(HELP)
    process.exit(1)
  }

  try {
    const config = loadConfig()
    const client = await createClient({ config })

    if (mod === "auth" && cmd === "test") {
      printJson({
        status: "OK",
        company_id: client.companyId,
        client_id: client.clientId,
      })
      return
    }

    if (mod === "rates") {
      if (cmd === "search-contract") {
        const body = await readJsonInput({ body: bodyFlag, file: fileFlag })
        printJson(await client.rates.searchContract(body as never))
        return
      }
      if (cmd === "search-spot") {
        const body = await readJsonInput({ body: bodyFlag, file: fileFlag })
        printJson(await client.rates.searchSpot(body as never))
        return
      }
      if (cmd === "resolve") {
        const body = await readJsonInput({ body: bodyFlag, file: fileFlag })
        printJson(await client.rates.resolve(body as never))
        return
      }
      if (cmd === "recommend") {
        const body = await readJsonInput({ body: bodyFlag, file: fileFlag })
        const rates = Array.isArray(body.rates) ? body.rates : []
        const preferred = Array.isArray(body.preferred_carriers)
          ? (body.preferred_carriers as string[])
          : undefined
        printJson({
          recommendation: client.rates.recommend(rates as never, {
            preferred_carriers: preferred,
          }),
        })
        return
      }
    }

    if (mod === "margins") {
      const body = await readJsonInput({ body: bodyFlag, file: fileFlag })
      if (cmd === "apply") {
        printJson(client.margins.apply(body as never))
        return
      }
      if (cmd === "check-floor") {
        printJson(client.margins.checkFloor(body as never))
        return
      }
    }

    if (mod === "globals") {
      if (cmd === "list") {
        printJson(
          await client.globals.list({
            service: strFlag(values.service),
            filters: boolFlag(values["defaults-only"])
              ? { has_default_rate: true }
              : undefined,
          })
        )
        return
      }
      if (cmd === "match") {
        const body = await readJsonInput({ body: bodyFlag, file: fileFlag })
        printJson(await client.globals.matchToLane(body as never))
        return
      }
      if (cmd === "classify") {
        const name =
          strFlag(values.name) ??
          (await readJsonInput({ body: bodyFlag, file: fileFlag })).name
        if (typeof name !== "string" || !name)
          throw new Error("--name required")
        printJson(client.globals.classify(name))
        return
      }
      if (cmd === "rollup") {
        const body = await readJsonInput({ body: bodyFlag, file: fileFlag })
        printJson(client.globals.rollup(body as never))
        return
      }
    }

    if (mod === "locations") {
      if (cmd === "resolve") {
        const query =
          strFlag(values.query) ??
          String(
            (await readJsonInput({ body: bodyFlag, file: fileFlag })).query ??
              ""
          )
        if (!query) throw new Error("--query required")
        printJson(
          await client.locations.resolve(query, {
            include_airports: boolFlag(values["include-airports"]),
          })
        )
        return
      }
      if (cmd === "resolve-lane") {
        let origin = strFlag(values.origin)
        let destination = strFlag(values.destination)
        let origin_via = strFlag(values["origin-via"])
        if (!origin || !destination) {
          const body = await readJsonInput({
            body: bodyFlag,
            file: fileFlag,
            allowEmpty: true,
          })
          origin = origin ?? (body.origin as string)
          destination = destination ?? (body.destination as string)
          origin_via = origin_via ?? (body.origin_via as string | undefined)
        }
        if (!origin || !destination)
          throw new Error("--origin and --destination required")
        printJson(
          await client.locations.resolveLane({
            origin,
            destination,
            origin_via,
            include_airports: boolFlag(values["include-airports"]),
          })
        )
        return
      }
    }

    throw new Error(`Unknown command: ${mod} ${cmd}\n\n${HELP}`)
  } catch (err) {
    fail(err)
  }
}

main()
