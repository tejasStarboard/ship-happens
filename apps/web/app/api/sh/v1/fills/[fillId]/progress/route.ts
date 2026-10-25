import { getFillProgress } from "@/lib/domain/sh/fill-api"
import { jsonOk, withShApiKey } from "@/lib/domain/sh/route-helpers"

type Params = { params: Promise<{ fillId: string }> }

export async function GET(request: Request, { params }: Params) {
  const { fillId } = await params
  return withShApiKey(request, { fill: ["read"] }, async (ctx) =>
    jsonOk(await getFillProgress(ctx, fillId))
  )
}
