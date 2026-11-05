import { jsonOk, withShApiKey } from "@/lib/domain/sh/route-helpers"
import {
  createFloorRuleApi,
  listFloorRulesApi,
} from "@/lib/domain/sh/rules-api"

export async function GET(request: Request) {
  return withShApiKey(request, { floors: ["read"] }, async (ctx) =>
    jsonOk(await listFloorRulesApi(ctx))
  )
}

export async function POST(request: Request) {
  return withShApiKey(request, { floors: ["write"] }, async (ctx) => {
    const body = await request.json().catch(() => null)
    return jsonOk(await createFloorRuleApi(ctx, body), 201)
  })
}
