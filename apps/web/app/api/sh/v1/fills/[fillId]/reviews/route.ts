import { createReview, listReviews } from "@/lib/domain/sh/fill-api"
import { jsonOk, withShApiKey } from "@/lib/domain/sh/route-helpers"

type Params = { params: Promise<{ fillId: string }> }

export async function GET(request: Request, { params }: Params) {
  const { fillId } = await params
  const status = new URL(request.url).searchParams.get("status") ?? undefined
  return withShApiKey(request, { fill: ["reviews"] }, async (ctx) =>
    jsonOk(await listReviews(ctx, fillId, { status }))
  )
}

export async function POST(request: Request, { params }: Params) {
  const { fillId } = await params
  return withShApiKey(request, { fill: ["reviews"] }, async (ctx) => {
    const body = (await request.json()) as Record<string, unknown>
    return jsonOk(
      await createReview(ctx, fillId, {
        title: String(body.title ?? ""),
        stepKey:
          body.stepKey === undefined
            ? undefined
            : body.stepKey == null
              ? null
              : String(body.stepKey),
        proposal:
          body.proposal && typeof body.proposal === "object"
            ? (body.proposal as Record<string, unknown>)
            : undefined,
        confidence:
          body.confidence === undefined
            ? undefined
            : (body.confidence as string | number | null),
        source:
          body.source === undefined
            ? undefined
            : body.source == null
              ? null
              : String(body.source),
        sourceMetadata:
          body.sourceMetadata && typeof body.sourceMetadata === "object"
            ? (body.sourceMetadata as Record<string, unknown>)
            : undefined,
      }),
      201
    )
  })
}
