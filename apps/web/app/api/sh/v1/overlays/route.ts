import { jsonOk, withShApiKey } from "@/lib/domain/sh/route-helpers"
import {
  createOverlayRuleApi,
  listOverlayRulesApi,
} from "@/lib/domain/sh/rules-api"

export async function GET(request: Request) {
  return withShApiKey(request, { overlays: ["read"] }, async (ctx) =>
    jsonOk(await listOverlayRulesApi(ctx))
  )
}

export async function POST(request: Request) {
  return withShApiKey(request, { overlays: ["write"] }, async (ctx) => {
    const body = await request.json().catch(() => null)
    return jsonOk(await createOverlayRuleApi(ctx, body), 201)
  })
}
