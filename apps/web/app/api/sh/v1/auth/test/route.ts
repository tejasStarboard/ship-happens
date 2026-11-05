import { requireShApiKey } from "@/lib/auth/sh-api-key"
import { jsonDomainError } from "@/lib/domain/http"
import { jsonOk } from "@/lib/domain/sh/route-helpers"

/**
 * Smoke check for sandbox `sh-client auth test`.
 * Accepts fill-scoped or org account-rules keys (overlays read).
 */
export async function GET(request: Request) {
  try {
    let ctx
    try {
      ctx = await requireShApiKey(request, {
        permissions: { fill: ["read"] },
      })
    } catch {
      ctx = await requireShApiKey(request, {
        permissions: { overlays: ["read"] },
      })
    }
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
