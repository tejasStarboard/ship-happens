import { NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { requireOrgSession } from "@/lib/auth/session"
import { jsonDomainError } from "@/lib/domain/http"
import { encodeOAuthState } from "@/lib/domain/email-intake/oauth-state"
import {
  buildOutlookAuthUrl,
  outlookOAuthConfigured,
} from "@/lib/domain/email-intake/outlook-client"

export async function GET() {
  try {
    const { organizationId, session } = await requireOrgSession()
    if (!outlookOAuthConfigured()) {
      return NextResponse.json(
        { error: "Microsoft OAuth is not configured" },
        { status: 503 }
      )
    }
    const state = encodeOAuthState({
      organizationId,
      userId: session.user.id,
      provider: "outlook",
      nonce: randomUUID(),
      exp: Date.now() + 10 * 60 * 1000,
    })
    return NextResponse.redirect(buildOutlookAuthUrl(state))
  } catch (error) {
    return jsonDomainError(error, "Connect failed")
  }
}
