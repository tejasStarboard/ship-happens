import { NextResponse } from "next/server"
import { requireOrgSession } from "@/lib/server/session"
import {
  runStarboardRateSearchSmoke,
  type RateSearchChannelResult,
  type RateSearchResult,
} from "@/lib/starboard/rate-search"

function summarizeChannel(channel: RateSearchChannelResult) {
  if (channel.status === "error") {
    return {
      status: channel.status,
      kind: channel.kind,
      message: channel.message,
      statusCode: channel.statusCode,
    }
  }
  return { status: channel.status, count: channel.count }
}

function httpStatusFor(result: RateSearchResult): number {
  if (result.status !== "error") return 200
  if (
    result.statusCode &&
    result.statusCode >= 400 &&
    result.statusCode < 600
  ) {
    return result.statusCode
  }
  if (result.kind === "config") return 503
  if (result.kind === "auth") return 401
  if (result.kind === "validation") return 400
  return 502
}

/**
 * Dev smoke: read-only contract + spot search (default CNSHA→USLAX 40HC).
 * Requires an authenticated org session. Does not expose secrets.
 */
export async function GET(request: Request) {
  try {
    await requireOrgSession()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(request.url)
  const result = await runStarboardRateSearchSmoke({
    origin: url.searchParams.get("origin") ?? undefined,
    destination: url.searchParams.get("destination") ?? undefined,
    equipment: url.searchParams.get("equipment") ?? undefined,
    spotCarrier: url.searchParams.get("carrier") ?? undefined,
  })

  // Omit bulky raw payloads from the HTTP response; keep counts + status.
  const body =
    result.status === "error"
      ? {
          status: result.status,
          kind: result.kind,
          message: result.message,
          companyId: result.companyId,
          lane: result.lane,
          contract: result.contract
            ? summarizeChannel(result.contract)
            : undefined,
          spot: result.spot ? summarizeChannel(result.spot) : undefined,
        }
      : {
          status: result.status,
          companyId: result.companyId,
          lane: result.lane,
          contract: summarizeChannel(result.contract),
          spot: summarizeChannel(result.spot),
        }

  return NextResponse.json(body, { status: httpStatusFor(result) })
}
