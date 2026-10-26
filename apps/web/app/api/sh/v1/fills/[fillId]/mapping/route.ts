import {
  getFillMapping,
  importFillMapping,
  putFillMapping,
} from "@/lib/domain/sh/fill-api"
import { jsonOk, withShApiKey } from "@/lib/domain/sh/route-helpers"

type Params = { params: Promise<{ fillId: string }> }

export async function GET(request: Request, { params }: Params) {
  const { fillId } = await params
  return withShApiKey(request, { fill: ["mapping"] }, async (ctx) =>
    jsonOk(await getFillMapping(ctx, fillId))
  )
}

export async function PUT(request: Request, { params }: Params) {
  const { fillId } = await params
  return withShApiKey(request, { fill: ["mapping"] }, async (ctx) => {
    const body = (await request.json()) as unknown
    return jsonOk(await putFillMapping(ctx, fillId, body))
  })
}

/** Import from request body or workspace `mapping.json` when body empty. */
export async function POST(request: Request, { params }: Params) {
  const { fillId } = await params
  return withShApiKey(request, { fill: ["mapping"] }, async (ctx) => {
    const text = await request.text()
    const body =
      text.trim().length === 0 ? undefined : (JSON.parse(text) as unknown)
    return jsonOk(await importFillMapping(ctx, fillId, body), 201)
  })
}
