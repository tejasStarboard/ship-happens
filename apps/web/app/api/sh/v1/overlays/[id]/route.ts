import { jsonOk, withShApiKey } from "@/lib/domain/sh/route-helpers"
import {
  deleteOverlayRuleApi,
  updateOverlayRuleApi,
} from "@/lib/domain/sh/rules-api"

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params
  return withShApiKey(request, { overlays: ["write"] }, async (ctx) => {
    const body = await request.json().catch(() => null)
    return jsonOk(await updateOverlayRuleApi(ctx, id, body))
  })
}

export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params
  return withShApiKey(request, { overlays: ["write"] }, async (ctx) =>
    jsonOk(await deleteOverlayRuleApi(ctx, id))
  )
}
