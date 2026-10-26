import { NextResponse } from "next/server"
import { jsonDomainError } from "@/lib/domain/http"
import { requireShApiKey, type ShApiKeyContext } from "@/lib/auth/sh-api-key"

export async function withShApiKey(
  request: Request,
  permissions: Record<string, string[]>,
  handler: (ctx: ShApiKeyContext) => Promise<NextResponse | Response>
): Promise<NextResponse | Response> {
  try {
    const ctx = await requireShApiKey(request, { permissions })
    return await handler(ctx)
  } catch (error) {
    const response = jsonDomainError(error)
    response.headers.set("Cache-Control", "no-store")
    return response
  }
}

export function jsonOk(data: unknown, status = 200): NextResponse {
  const response = NextResponse.json(data, { status })
  response.headers.set("Cache-Control", "no-store")
  return response
}
