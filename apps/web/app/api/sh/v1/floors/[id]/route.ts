import { jsonOk, withShApiKey } from "@/lib/domain/sh/route-helpers"
import {
  deleteFloorRuleApi,
  updateFloorRuleApi,
} from "@/lib/domain/sh/rules-api"

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params
  return withShApiKey(request, { floors: ["write"] }, async (ctx) => {
    const body = await request.json().catch(() => null)
    return jsonOk(await updateFloorRuleApi(ctx, id, body))
  })
}

export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params
  return withShApiKey(request, { floors: ["write"] }, async (ctx) =>
    jsonOk(await deleteFloorRuleApi(ctx, id))
  )
}
