import { DomainError } from "@ship-happens/fill"
import type { ProposeLanesInput } from "@ship-happens/fill"
import { proposeFillMapping } from "@/lib/domain/sh/fill-api"
import { jsonOk, withShApiKey } from "@/lib/domain/sh/route-helpers"

type Params = { params: Promise<{ fillId: string }> }

function asProposeBody(body: unknown): ProposeLanesInput {
  if (body == null || typeof body !== "object" || Array.isArray(body)) {
    throw new DomainError("Body must be a JSON object", "VALIDATION")
  }
  const record = body as Record<string, unknown>
  if (!Array.isArray(record.lanes)) {
    throw new DomainError("lanes must be an array", "VALIDATION")
  }
  return {
    lanes: record.lanes as ProposeLanesInput["lanes"],
    customerLabel:
      typeof record.customerLabel === "string"
        ? record.customerLabel
        : record.customerLabel === null
          ? null
          : undefined,
  }
}

/** Jev-backed geo propose for free-text O-D labels. */
export async function POST(request: Request, { params }: Params) {
  const { fillId } = await params
  return withShApiKey(request, { fill: ["mapping"] }, async (ctx) => {
    const body = asProposeBody((await request.json()) as unknown)
    return jsonOk(await proposeFillMapping(ctx, fillId, body), 201)
  })
}
