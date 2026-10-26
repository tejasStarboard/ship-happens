import { env } from "@/env"

const MS_AUTH = "https://login.microsoftonline.com/common/oauth2/v2.0"
const GRAPH = "https://graph.microsoft.com/v1.0"

export const OUTLOOK_SCOPES = [
  "openid",
  "email",
  "offline_access",
  "User.Read",
  "Mail.Read",
].join(" ")

export function outlookOAuthConfigured(): boolean {
  return Boolean(env.MICROSOFT_CLIENT_ID && env.MICROSOFT_CLIENT_SECRET)
}

export function buildOutlookAuthUrl(state: string): string {
  if (!env.MICROSOFT_CLIENT_ID) {
    throw new Error("MICROSOFT_CLIENT_ID is not configured")
  }
  const redirectUri = `${env.APP_URL}/api/integrations/outlook/callback`
  const params = new URLSearchParams({
    client_id: env.MICROSOFT_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: OUTLOOK_SCOPES,
    response_mode: "query",
    state,
  })
  return `${MS_AUTH}/authorize?${params}`
}

export async function exchangeOutlookCode(code: string): Promise<{
  accessToken: string
  refreshToken: string | null
  expiresIn: number
  email: string
}> {
  if (!env.MICROSOFT_CLIENT_ID || !env.MICROSOFT_CLIENT_SECRET) {
    throw new Error("Microsoft OAuth is not configured")
  }
  const redirectUri = `${env.APP_URL}/api/integrations/outlook/callback`
  const tokenRes = await fetch(`${MS_AUTH}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.MICROSOFT_CLIENT_ID,
      client_secret: env.MICROSOFT_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
      scope: OUTLOOK_SCOPES,
    }),
  })
  if (!tokenRes.ok) {
    const text = await tokenRes.text()
    throw new Error(`Outlook token exchange failed: ${text}`)
  }
  const tokens = (await tokenRes.json()) as {
    access_token: string
    refresh_token?: string
    expires_in: number
  }
  const meRes = await fetch(`${GRAPH}/me?$select=mail,userPrincipalName`, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })
  if (!meRes.ok) {
    throw new Error("Failed to load Outlook profile")
  }
  const me = (await meRes.json()) as {
    mail?: string
    userPrincipalName?: string
  }
  const email = (me.mail || me.userPrincipalName || "").toLowerCase()
  if (!email) throw new Error("Outlook profile missing email")
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? null,
    expiresIn: tokens.expires_in,
    email,
  }
}

export async function refreshOutlookAccessToken(refreshToken: string): Promise<{
  accessToken: string
  expiresIn: number
  refreshToken?: string
}> {
  if (!env.MICROSOFT_CLIENT_ID || !env.MICROSOFT_CLIENT_SECRET) {
    throw new Error("Microsoft OAuth is not configured")
  }
  const tokenRes = await fetch(`${MS_AUTH}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.MICROSOFT_CLIENT_ID,
      client_secret: env.MICROSOFT_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
      scope: OUTLOOK_SCOPES,
    }),
  })
  if (!tokenRes.ok) {
    const text = await tokenRes.text()
    throw new Error(`Outlook token refresh failed: ${text}`)
  }
  const tokens = (await tokenRes.json()) as {
    access_token: string
    expires_in: number
    refresh_token?: string
  }
  return {
    accessToken: tokens.access_token,
    expiresIn: tokens.expires_in,
    refreshToken: tokens.refresh_token,
  }
}

export async function createOutlookSubscription(
  accessToken: string
): Promise<{ id: string; expirationDateTime: string }> {
  const notificationUrl = `${env.APP_URL}/api/webhooks/outlook`
  const clientState = env.OUTLOOK_WEBHOOK_CLIENT_STATE ?? "ship-happens"
  const expiration = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
  const res = await fetch(`${GRAPH}/subscriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      changeType: "created",
      notificationUrl,
      resource: "me/mailFolders('Inbox')/messages",
      expirationDateTime: expiration.toISOString(),
      clientState,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Outlook subscription failed: ${text}`)
  }
  return (await res.json()) as { id: string; expirationDateTime: string }
}

export async function renewOutlookSubscription(
  accessToken: string,
  subscriptionId: string
): Promise<{ expirationDateTime: string }> {
  const expiration = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
  const res = await fetch(
    `${GRAPH}/subscriptions/${encodeURIComponent(subscriptionId)}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        expirationDateTime: expiration.toISOString(),
      }),
    }
  )
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Outlook subscription renew failed: ${text}`)
  }
  return (await res.json()) as { expirationDateTime: string }
}

export type OutlookAttachment = {
  id: string
  fileName: string
  mimeType: string
  sizeBytes: number
  contentBytes?: string
}

export type OutlookMessage = {
  id: string
  conversationId: string
  subject: string
  from: string
  bodyText: string
  receivedAt: Date | null
  attachments: OutlookAttachment[]
}

export async function fetchOutlookMessage(
  accessToken: string,
  messageId: string
): Promise<OutlookMessage> {
  const res = await fetch(
    `${GRAPH}/me/messages/${encodeURIComponent(messageId)}?$select=id,conversationId,subject,from,body,receivedDateTime,hasAttachments`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Outlook get message failed: ${text}`)
  }
  const data = (await res.json()) as {
    id: string
    conversationId?: string
    subject?: string
    from?: { emailAddress?: { address?: string; name?: string } }
    body?: { content?: string; contentType?: string }
    receivedDateTime?: string
    hasAttachments?: boolean
  }

  let attachments: OutlookAttachment[] = []
  if (data.hasAttachments) {
    const attRes = await fetch(
      `${GRAPH}/me/messages/${encodeURIComponent(messageId)}/attachments`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    if (attRes.ok) {
      const attData = (await attRes.json()) as {
        value: Array<{
          id: string
          name: string
          contentType: string
          size: number
          contentBytes?: string
          "@odata.type"?: string
        }>
      }
      attachments = (attData.value ?? [])
        .filter((a) => a["@odata.type"]?.includes("fileAttachment"))
        .map((a) => ({
          id: a.id,
          fileName: a.name,
          mimeType: a.contentType,
          sizeBytes: a.size,
          contentBytes: a.contentBytes,
        }))
    }
  }

  const fromAddr =
    data.from?.emailAddress?.address || data.from?.emailAddress?.name || ""

  return {
    id: data.id,
    conversationId: data.conversationId ?? data.id,
    subject: data.subject ?? "",
    from: fromAddr,
    bodyText: data.body?.content ?? "",
    receivedAt: data.receivedDateTime ? new Date(data.receivedDateTime) : null,
    attachments,
  }
}
