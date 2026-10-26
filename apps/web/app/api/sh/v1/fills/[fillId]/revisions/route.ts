import { DomainError, type CreateFillRevisionInput } from "@ship-happens/fill"
import { createFillRevision } from "@/lib/domain/sh/fill-api"
import { jsonOk, withShApiKey } from "@/lib/domain/sh/route-helpers"

type Params = { params: Promise<{ fillId: string }> }

function asRevisionBody(
  body: unknown
): Omit<CreateFillRevisionInput, "parentFillId"> {
  if (body == null || typeof body !== "object" || Array.isArray(body)) {
    throw new DomainError("Body must be a JSON object", "VALIDATION")
  }
  const row = body as Record<string, unknown>
  if (typeof row.fileName !== "string" || typeof row.base64 !== "string") {
    throw new DomainError("fileName and base64 are required", "VALIDATION")
  }
  if (typeof row.contentType !== "string") {
    throw new DomainError("contentType is required", "VALIDATION")
  }
  return {
    fileName: row.fileName,
    contentType: row.contentType as CreateFillRevisionInput["contentType"],
    base64: row.base64,
    name: typeof row.name === "string" ? row.name : undefined,
    customer: typeof row.customer === "string" ? row.customer : undefined,
    templateId: typeof row.templateId === "string" ? row.templateId : undefined,
  }
}

/** Start the next workbook round from this fill and reuse its confirmed mapping. */
export async function POST(request: Request, { params }: Params) {
  const { fillId } = await params
  return withShApiKey(request, { fill: ["mapping"] }, async (ctx) => {
    const body = asRevisionBody((await request.json()) as unknown)
    return jsonOk(await createFillRevision(ctx, fillId, body), 201)
  })
}
