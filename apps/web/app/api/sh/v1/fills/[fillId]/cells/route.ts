import { getFillCells } from "@/lib/domain/sh/fill-api"
import { jsonOk, withShApiKey } from "@/lib/domain/sh/route-helpers"

type Params = { params: Promise<{ fillId: string }> }

export async function GET(request: Request, { params }: Params) {
  const { fillId } = await params
  const url = new URL(request.url)
  const laneId = url.searchParams.get("laneId")
  return withShApiKey(request, { fill: ["read"] }, async (ctx) =>
    jsonOk(await getFillCells(ctx, fillId, { laneId }))
  )
}
