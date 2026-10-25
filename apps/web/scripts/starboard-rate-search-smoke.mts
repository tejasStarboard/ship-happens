/**
 * Dev smoke for SB-6652: read-only contract + spot rate search.
 *
 *   pnpm --filter web starboard:smoke-rates
 *
 * Exit 0 on status ok or empty; exit 1 on error (config/auth/api).
 */
import { runStarboardRateSearchSmoke } from "../lib/starboard/rate-search.ts"

const result = await runStarboardRateSearchSmoke()

const summary =
  result.status === "error"
    ? {
        status: result.status,
        kind: result.kind,
        message: result.message,
        statusCode: result.statusCode,
        companyId: result.companyId,
        lane: result.lane,
        contract:
          result.contract == null
            ? undefined
            : result.contract.status === "error"
              ? {
                  status: result.contract.status,
                  kind: result.contract.kind,
                  message: result.contract.message,
                }
              : {
                  status: result.contract.status,
                  count: result.contract.count,
                },
        spot:
          result.spot == null
            ? undefined
            : result.spot.status === "error"
              ? {
                  status: result.spot.status,
                  kind: result.spot.kind,
                  message: result.spot.message,
                }
              : {
                  status: result.spot.status,
                  count: result.spot.count,
                },
      }
    : {
        status: result.status,
        companyId: result.companyId,
        lane: result.lane,
        contract:
          result.contract.status === "error"
            ? {
                status: result.contract.status,
                kind: result.contract.kind,
                message: result.contract.message,
              }
            : {
                status: result.contract.status,
                count: result.contract.count,
              },
        spot:
          result.spot.status === "error"
            ? {
                status: result.spot.status,
                kind: result.spot.kind,
                message: result.spot.message,
              }
            : {
                status: result.spot.status,
                count: result.spot.count,
              },
      }

process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`)
process.exit(result.status === "error" ? 1 : 0)
