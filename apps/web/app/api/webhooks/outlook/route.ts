import { NextResponse } from "next/server"
import { createAppContext } from "@/lib/di/create-app-context"
import { env } from "@/env"

/**
 * Microsoft Graph change notification endpoint.
 * Validation: GET/POST with ?validationToken=… must echo plain text.
 */
export async function POST(request: Request) {
  const url = new URL(request.url)
  const validationToken = url.searchParams.get("validationToken")
  if (validationToken) {
    return new NextResponse(validationToken, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    })
  }

  try {
    const body = (await request.json()) as {
      value?: Array<{
        subscriptionId?: string
        clientState?: string
        resourceData?: { id?: string }
        resource?: string
      }>
    }

    const expected = env.OUTLOOK_WEBHOOK_CLIENT_STATE ?? "ship-happens"
    const ctx = createAppContext()

    for (const note of body.value ?? []) {
      if (note.clientState && note.clientState !== expected) {
        continue
      }
      const subscriptionId = note.subscriptionId
      const messageId = note.resourceData?.id ?? note.resource?.split("/").pop()
      if (!subscriptionId || !messageId) continue
      try {
        await ctx.emailIntake.processOutlookNotification({
          subscriptionId,
          messageId,
        })
      } catch (error) {
        console.error("[webhooks/outlook] message", messageId, error)
      }
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[webhooks/outlook]", error)
    return NextResponse.json({ ok: true })
  }
}

export async function GET(request: Request) {
  const validationToken = new URL(request.url).searchParams.get(
    "validationToken"
  )
  if (validationToken) {
    return new NextResponse(validationToken, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    })
  }
  return NextResponse.json({ ok: true })
}
