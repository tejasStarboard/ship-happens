# Starboard Client (`packages/sb-client`)

Standalone **TypeScript library + CLI** for Ship Happens (and other agents) to call Starboard with Public API **client id / client secret**.

No MCP. No quote lifecycle. Rate search returns **resolved** rates (carrier surcharges + matching global defaults), like the webapp quote view after add-rate — without saving a quote.

## Source of truth (starboard-2)

When adding or changing client methods, request/response shapes, auth, or
rate/margin/globals behavior, implement against the **Starboard webapp** — not
from memory:

```
/Users/sanskrutibadnore/Desktop/Starboard/starboard-2
```

Search that repo for the matching API route/controller and serializers before
editing this package. Keep Freight Index / multi-round quote flows out of RFP
fill pricing unless a ticket explicitly requires them.

```
sb-client / library
  → verify POST /api/public_api_clients/verify
  → webapp APIs (handshake + X-User-Company-Id)
```

## Modules

| Module      | Purpose                                                                   |
| ----------- | ------------------------------------------------------------------------- |
| `rates`     | Contract search, spot search, **`resolve`** (search + globals), recommend |
| `margins`   | Apply %/$ markup, floor guardrails (`min_amount` / `min_pct`)             |
| `globals`   | List / match company rate items; classify & rollup for BCO columns        |
| `locations` | Name → UN/LOCODE; resolve lane (+ via split)                              |

## Library

```ts
import { createClient } from "@ship-happens/sb-client"

const client = await createClient() // reads env
const { rates } = await client.rates.resolve({
  service_type: "ocean_fcl",
  origin_locodes: ["CNSHA"],
  destination_locodes: ["USLAX"],
  cargo: { cargo_type: "container", container_types: ["40HC"] },
})
```

## Read-only rate search smoke (Ship Happens)

After env is pointed at Starboard **dev**, run the web smoke (contract + spot, CNSHA→USLAX 40HC):

```bash
pnpm --filter @ship-happens/sb-client build
pnpm --filter web starboard:smoke-rates
```

Exit `0` for `ok` or honest `empty`; exit `1` for typed config/auth/API errors. Server code uses `searchRatesReadOnly` / `runStarboardRateSearchSmoke` in `apps/web/lib/starboard/rate-search.ts` (also `GET /api/starboard/rates/smoke` when signed in).

## CLI

Published bin: `bin/sb-client.js` → runs the built `dist/cli.js`.

```bash
# from repo root
pnpm --filter @ship-happens/sb-client build
pnpm --filter @ship-happens/sb-client start -- auth test

# via apps/web (workspace dependency)
pnpm --filter web sb-client -- auth test

# after publish
npx @ship-happens/sb-client auth test
```

JSON always on **stdout**; errors are JSON on stdout with non-zero exit.

### Commands

```
sb-client auth test
sb-client rates search-contract --body '...'
sb-client rates search-spot --body '{"carrier":"cma",...}'
sb-client rates resolve --body '...'
sb-client rates recommend --body '{"rates":[...]}'
sb-client margins apply --body '{"buy":1000,"pct":5}'
sb-client margins check-floor --body '{"buy":1000,"sell":1100,"min_amount":150}'
sb-client globals list --service ocean_fcl --defaults-only
sb-client locations resolve --query Shanghai
sb-client locations resolve-lane --origin Shanghai --destination "Chicago via LA"
```

## Env

| Var                                               | Required         |
| ------------------------------------------------- | ---------------- |
| `STARBOARD_APP_DOMAIN`                            | yes              |
| `STARBOARD_HANDSHAKE_KEY`                         | yes (webapp BFF) |
| `SB_CLIENT_CLIENT_ID` + `SB_CLIENT_CLIENT_SECRET` | recommended      |
| `SB_CLIENT_COMPANY_ID`                            | dev only         |

Keys are issued from Starboard admin → company → **Public API keys**.

## Build

```bash
pnpm --filter @ship-happens/sb-client build   # tsup → dist/
pnpm --filter @ship-happens/sb-client test
pnpm --filter @ship-happens/sb-client typecheck
```
