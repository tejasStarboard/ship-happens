import { NextResponse } from "next/server"
import { createAppContext } from "@/lib/di/create-app-context"
import { decodeOAuthState } from "@/lib/domain/email-intake/oauth-state"
import { exchangeOutlookCode } from "@/lib/domain/email-intake/outlook-client"
import { env } from "@/env"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")
  const oauthError = url.searchParams.get("error")
  const base = env.APP_URL

  if (oauthError) {
    return NextResponse.redirect(
      `${base}/integrations?error=${encodeURIComponent(oauthError)}#outlook`
    )
  }
  if (!code || !state) {
    return NextResponse.redirect(
      `${base}/integrations?error=${encodeURIComponent("missing_code")}#outlook`
    )
  }

  try {
    const payload = decodeOAuthState(state)
    if (payload.provider !== "outlook") {
      throw new Error("Invalid provider state")
    }
    const tokens = await exchangeOutlookCode(code)
    const ctx = createAppContext()
    await ctx.emailIntake.completeOutlookConnect({
      organizationId: payload.organizationId,
      userId: payload.userId,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      email: tokens.email,
    })
    return NextResponse.redirect(
      `${base}/integrations?connected=outlook#outlook`
    )
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Outlook connect failed"
    return NextResponse.redirect(
      `${base}/integrations?error=${encodeURIComponent(message)}#outlook`
    )
  }
}
