import { getFillLogs } from "@/lib/domain/sh/fill-api"
import { jsonOk, withShApiKey } from "@/lib/domain/sh/route-helpers"

type Params = { params: Promise<{ fillId: string }> }

export async function GET(request: Request, { params }: Params) {
  const { fillId } = await params
  const url = new URL(request.url)
  const limitRaw = url.searchParams.get("limit")
  const limit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined
  return withShApiKey(request, { fill: ["read"] }, async (ctx) =>
    jsonOk(
      await getFillLogs(ctx, fillId, {
        limit: Number.isFinite(limit) ? limit : undefined,
        level: url.searchParams.get("level"),
      })
    )
  )
}
