import { NextResponse } from "next/server"
import { createAppContext } from "@/lib/di/create-app-context"
import { env } from "@/env"

/**
 * Google Pub/Sub push endpoint for Gmail users.watch notifications.
 * Body: { message: { data: base64({ emailAddress, historyId }) }, subscription }
 */
export async function POST(request: Request) {
  try {
    const expected = env.GMAIL_PUBSUB_VERIFICATION_TOKEN
    if (expected) {
      const urlToken = new URL(request.url).searchParams.get("token")
      if (urlToken !== expected) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    const body = (await request.json()) as {
      message?: { data?: string }
    }
    if (!body.message?.data) {
      return NextResponse.json({ ok: true })
    }
    const decoded = JSON.parse(
      Buffer.from(body.message.data, "base64").toString("utf8")
    ) as { emailAddress?: string; historyId?: string | number }

    if (!decoded.emailAddress || decoded.historyId == null) {
      return NextResponse.json({ ok: true })
    }

    const ctx = createAppContext()
    await ctx.emailIntake.processGmailPubSub(
      decoded.emailAddress,
      String(decoded.historyId)
    )
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[webhooks/gmail]", error)
    // Ack to avoid endless Pub/Sub retries; errors are persisted on integration rows
    return NextResponse.json({ ok: true })
  }
}
