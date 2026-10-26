import { NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { requireOrgSession } from "@/lib/auth/session"
import { jsonDomainError } from "@/lib/domain/http"
import { encodeOAuthState } from "@/lib/domain/email-intake/oauth-state"
import {
  buildGmailAuthUrl,
  gmailOAuthConfigured,
} from "@/lib/domain/email-intake/gmail-client"

export async function GET() {
  try {
    const { organizationId, session } = await requireOrgSession()
    if (!gmailOAuthConfigured()) {
      return NextResponse.json(
        { error: "Google OAuth is not configured" },
        { status: 503 }
      )
    }
    const state = encodeOAuthState({
      organizationId,
      userId: session.user.id,
      provider: "gmail",
      nonce: randomUUID(),
      exp: Date.now() + 10 * 60 * 1000,
    })
    return NextResponse.redirect(buildGmailAuthUrl(state))
  } catch (error) {
    return jsonDomainError(error, "Connect failed")
  }
}
