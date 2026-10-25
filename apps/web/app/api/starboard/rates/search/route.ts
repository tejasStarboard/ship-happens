import { NextResponse } from "next/server"
import { requireOrgSession } from "@/lib/auth/session"
import { jsonDomainError } from "@/lib/domain/http"
import {
  RATES_SEARCH_PAGE_SIZE,
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

function parsePositiveInt(
  value: string | null,
  fallback: number,
  max?: number
): number {
  if (value == null || value === "") return fallback
  const n = Number.parseInt(value, 10)
  if (!Number.isFinite(n) || n < 1) return fallback
  return max != null ? Math.min(n, max) : n
}

/**
 * Auth’d Rates page search: contract + spot via searchRatesReadOnly.
 * Contract uses Starboard Qv2 pagination (`page` / `page_size` / `cache_key`).
 * Spot is only requested on page 1. Does not expose secrets.
 */
export async function GET(request: Request) {
  try {
    await requireOrgSession()
  } catch (error) {
    const response = jsonDomainError(error, "Unauthorized")
    response.headers.set("Cache-Control", "no-store")
    return response
  }

  const url = new URL(request.url)
  const page = parsePositiveInt(url.searchParams.get("page"), 1)
  const pageSize = parsePositiveInt(
    url.searchParams.get("page_size"),
    RATES_SEARCH_PAGE_SIZE,
    200
  )

  const result = await searchRatesReadOnly({
    origin: url.searchParams.get("origin") ?? undefined,
    destination: url.searchParams.get("destination") ?? undefined,
    equipment: url.searchParams.get("equipment") ?? undefined,
    spotCarrier: url.searchParams.get("carrier") ?? undefined,
    page,
    pageSize,
    cacheKey: url.searchParams.get("cache_key"),
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
        pagination: result.pagination ?? null,
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
      pagination: result.pagination ?? null,
      contract: summarizeChannel(result.contract),
      spot: summarizeChannel(result.spot),
    },
    { status: 200, headers }
  )
}
