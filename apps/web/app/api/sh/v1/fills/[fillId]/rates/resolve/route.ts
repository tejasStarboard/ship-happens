import { resolveFillRates } from "@/lib/domain/sh/fill-api"
import { jsonOk, withShApiKey } from "@/lib/domain/sh/route-helpers"

type Params = { params: Promise<{ fillId: string }> }

export async function POST(request: Request, { params }: Params) {
  const { fillId } = await params
  return withShApiKey(request, { fill: ["rates"] }, async (ctx) =>
    jsonOk(await resolveFillRates(ctx, fillId))
  )
}
