import { NextResponse } from "next/server"
import { requireOrgSession } from "@/lib/server/session"
import {
  mapRateSearchResultToRows,
  searchRatesReadOnly,
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
 * Auth’d Rates page search: contract + spot via searchRatesReadOnly.
 * Returns mapped rows (not bulky raw payloads). Does not expose secrets.
 */
export async function GET(request: Request) {
  try {
    await requireOrgSession()
  } catch {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    )
  }

  const url = new URL(request.url)
  const result = await searchRatesReadOnly({
    origin: url.searchParams.get("origin") ?? undefined,
    destination: url.searchParams.get("destination") ?? undefined,
    equipment: url.searchParams.get("equipment") ?? undefined,
    spotCarrier: url.searchParams.get("carrier") ?? undefined,
  })

  const headers = {
    "Cache-Control": "no-store",
  }

  if (result.status === "error") {
    return NextResponse.json(
      {
        status: result.status,
        kind: result.kind,
        message: result.message,
        companyId: result.companyId,
        lane: result.lane,
        rows: [] as const,
        contract: result.contract
          ? summarizeChannel(result.contract)
          : undefined,
        spot: result.spot ? summarizeChannel(result.spot) : undefined,
      },
      { status: httpStatusFor(result), headers }
    )
  }

  return NextResponse.json(
    {
      status: result.status,
      companyId: result.companyId,
      lane: result.lane,
      rows: mapRateSearchResultToRows(result),
      contract: summarizeChannel(result.contract),
      spot: summarizeChannel(result.spot),
    },
    { status: 200, headers }
  )
}
