import { requireShApiKey } from "@/lib/auth/sh-api-key"
import { jsonDomainError } from "@/lib/domain/http"
import { jsonOk } from "@/lib/domain/sh/route-helpers"

/** Smoke check for sandbox `sh-client auth test`. */
export async function GET(request: Request) {
  try {
    const ctx = await requireShApiKey(request, {
      permissions: { fill: ["read"] },
    })
    return jsonOk({
      ok: true as const,
      organizationId: ctx.organizationId,
      fillId: ctx.fillId,
      userId: ctx.userId,
    })
  } catch (error) {
    const response = jsonDomainError(error)
    response.headers.set("Cache-Control", "no-store")
    return response
  }
}
