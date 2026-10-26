import { exportFillWorkbook } from "@/lib/domain/sh/fill-api"
import { jsonOk, withShApiKey } from "@/lib/domain/sh/route-helpers"

type Params = { params: Promise<{ fillId: string }> }

export async function POST(request: Request, { params }: Params) {
  const { fillId } = await params
  return withShApiKey(request, { fill: ["export"] }, async (ctx) =>
    jsonOk(await exportFillWorkbook(ctx, fillId))
  )
}
