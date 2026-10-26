import { NextResponse } from "next/server"
import { createAppContext } from "@/lib/di/create-app-context"
import { decodeOAuthState } from "@/lib/domain/email-intake/oauth-state"
import { exchangeGmailCode } from "@/lib/domain/email-intake/gmail-client"
import { env } from "@/env"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")
  const oauthError = url.searchParams.get("error")
  const base = env.APP_URL

  if (oauthError) {
    return NextResponse.redirect(
      `${base}/integrations?error=${encodeURIComponent(oauthError)}#gmail`
    )
  }
  if (!code || !state) {
    return NextResponse.redirect(
      `${base}/integrations?error=${encodeURIComponent("missing_code")}#gmail`
    )
  }

  try {
    const payload = decodeOAuthState(state)
    if (payload.provider !== "gmail") {
      throw new Error("Invalid provider state")
    }
    const tokens = await exchangeGmailCode(code)
    const ctx = createAppContext()
    await ctx.emailIntake.completeGmailConnect({
      organizationId: payload.organizationId,
      userId: payload.userId,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      email: tokens.email,
    })
    return NextResponse.redirect(`${base}/integrations?connected=gmail#gmail`)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gmail connect failed"
    return NextResponse.redirect(
      `${base}/integrations?error=${encodeURIComponent(message)}#gmail`
    )
  }
}
