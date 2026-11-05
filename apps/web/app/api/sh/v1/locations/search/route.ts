import { jsonOk, withShApiKey } from "@/lib/domain/sh/route-helpers"
import { searchLocationsApi } from "@/lib/domain/sh/rules-api"

export async function GET(request: Request) {
  return withShApiKey(request, { locations: ["read"] }, async () => {
    const url = new URL(request.url)
    const q = url.searchParams.get("q") ?? url.searchParams.get("query") ?? ""
    return jsonOk(await searchLocationsApi(q))
  })
}
