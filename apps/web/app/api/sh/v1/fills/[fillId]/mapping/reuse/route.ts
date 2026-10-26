import { DomainError } from "@ship-happens/fill"
import {
  applyMappingReuse,
  previewMappingReuse,
} from "@/lib/domain/sh/fill-api"
import { jsonOk, withShApiKey } from "@/lib/domain/sh/route-helpers"

type Params = { params: Promise<{ fillId: string }> }

function parentFromBody(body: unknown): {
  parentFillId?: string
  fingerprint?: unknown
} {
  if (body == null || body === "") return {}
  if (typeof body !== "object" || Array.isArray(body)) {
    throw new DomainError("Body must be a JSON object", "VALIDATION")
  }
  const row = body as Record<string, unknown>
  return {
    parentFillId:
      typeof row.parentFillId === "string" ? row.parentFillId : undefined,
    fingerprint: row.fingerprint,
  }
}

/** Classify parent mapping against this fill. Does not write lanes or reviews. */
export async function GET(request: Request, { params }: Params) {
  const { fillId } = await params
  const parentFillId = new URL(request.url).searchParams.get("parentFillId")
  return withShApiKey(request, { fill: ["mapping"] }, async (ctx) =>
    jsonOk(await previewMappingReuse(ctx, fillId, { parentFillId }))
  )
}

/** Apply parent mapping: upsert nearby lanes, open reviews for drifted ones. */
export async function POST(request: Request, { params }: Params) {
  const { fillId } = await params
  return withShApiKey(request, { fill: ["mapping"] }, async (ctx) => {
    const text = await request.text()
    const body =
      text.trim().length === 0
        ? {}
        : parentFromBody(JSON.parse(text) as unknown)
    return jsonOk(await applyMappingReuse(ctx, fillId, body))
  })
}
