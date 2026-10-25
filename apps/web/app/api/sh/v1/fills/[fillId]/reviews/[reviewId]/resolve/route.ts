import { resolveReview } from "@/lib/domain/sh/fill-api"
import { jsonOk, withShApiKey } from "@/lib/domain/sh/route-helpers"

type Params = { params: Promise<{ fillId: string; reviewId: string }> }

export async function POST(request: Request, { params }: Params) {
  const { fillId, reviewId } = await params
  return withShApiKey(request, { fill: ["reviews"] }, async (ctx) => {
    let body: Record<string, unknown> = {}
    try {
      body = (await request.json()) as Record<string, unknown>
    } catch {
      body = {}
    }
    return jsonOk(
      await resolveReview(ctx, fillId, reviewId, {
        resolution:
          body.resolution && typeof body.resolution === "object"
            ? (body.resolution as Record<string, unknown>)
            : undefined,
      })
    )
  })
}
