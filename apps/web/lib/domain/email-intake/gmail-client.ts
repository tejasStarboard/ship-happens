import { env } from "@/env"

const GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth"
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token"
const GMAIL_API = "https://gmail.googleapis.com/gmail/v1"

export const GMAIL_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/gmail.readonly",
].join(" ")

export function gmailOAuthConfigured(): boolean {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET)
}

export function buildGmailAuthUrl(state: string): string {
  if (!env.GOOGLE_CLIENT_ID) {
    throw new Error("GOOGLE_CLIENT_ID is not configured")
  }
  const redirectUri = `${env.APP_URL}/api/integrations/gmail/callback`
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GMAIL_SCOPES,
    access_type: "offline",
    prompt: "consent",
    state,
  })
  return `${GOOGLE_AUTH}?${params}`
}

export async function exchangeGmailCode(code: string): Promise<{
  accessToken: string
  refreshToken: string | null
  expiresIn: number
  email: string
}> {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw new Error("Google OAuth is not configured")
  }
  const redirectUri = `${env.APP_URL}/api/integrations/gmail/callback`
  const tokenRes = await fetch(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  })
  if (!tokenRes.ok) {
    const text = await tokenRes.text()
    throw new Error(`Gmail token exchange failed: ${text}`)
  }
  const tokens = (await tokenRes.json()) as {
    access_token: string
    refresh_token?: string
    expires_in: number
  }
  const profileRes = await fetch(`${GMAIL_API}/users/me/profile`, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })
  if (!profileRes.ok) {
    throw new Error("Failed to load Gmail profile")
  }
  const profile = (await profileRes.json()) as { emailAddress: string }
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? null,
    expiresIn: tokens.expires_in,
    email: profile.emailAddress.toLowerCase(),
  }
}

export async function refreshGmailAccessToken(refreshToken: string): Promise<{
  accessToken: string
  expiresIn: number
}> {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw new Error("Google OAuth is not configured")
  }
  const tokenRes = await fetch(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  })
  if (!tokenRes.ok) {
    const text = await tokenRes.text()
    throw new Error(`Gmail token refresh failed: ${text}`)
  }
  const tokens = (await tokenRes.json()) as {
    access_token: string
    expires_in: number
  }
  return { accessToken: tokens.access_token, expiresIn: tokens.expires_in }
}

export async function startGmailWatch(accessToken: string): Promise<{
  historyId: string
  expiration: Date | null
}> {
  const topic = env.GMAIL_PUBSUB_TOPIC
  if (!topic) {
    throw new Error(
      "GMAIL_PUBSUB_TOPIC is not configured — cannot register Gmail watch"
    )
  }
  const res = await fetch(`${GMAIL_API}/users/me/watch`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      topicName: topic,
      labelIds: ["INBOX"],
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Gmail watch failed: ${text}`)
  }
  const data = (await res.json()) as {
    historyId: string
    expiration?: string
  }
  return {
    historyId: data.historyId,
    expiration: data.expiration ? new Date(Number(data.expiration)) : null,
  }
}

export type GmailAttachment = {
  attachmentId: string
  fileName: string
  mimeType: string
  sizeBytes: number
}

export type GmailMessage = {
  id: string
  threadId: string
  subject: string
  from: string
  bodyText: string
  receivedAt: Date | null
  attachments: GmailAttachment[]
}

function walkParts(
  parts: Array<Record<string, unknown>> | undefined,
  out: {
    text: string[]
    attachments: GmailAttachment[]
  }
) {
  if (!parts) return
  for (const part of parts) {
    const filename = String(part.filename ?? "")
    const mimeType = String(part.mimeType ?? "application/octet-stream")
    const body = part.body as
      { attachmentId?: string; data?: string; size?: number } | undefined
    if (filename && body?.attachmentId) {
      out.attachments.push({
        attachmentId: body.attachmentId,
        fileName: filename,
        mimeType,
        sizeBytes: body.size ?? 0,
      })
    }
    if (mimeType === "text/plain" && body?.data) {
      out.text.push(Buffer.from(body.data, "base64url").toString("utf8"))
    }
    if (Array.isArray(part.parts)) {
      walkParts(part.parts as Array<Record<string, unknown>>, out)
    }
  }
}

export async function fetchGmailMessage(
  accessToken: string,
  messageId: string
): Promise<GmailMessage> {
  const res = await fetch(
    `${GMAIL_API}/users/me/messages/${encodeURIComponent(messageId)}?format=full`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Gmail get message failed: ${text}`)
  }
  const data = (await res.json()) as {
    id: string
    threadId: string
    internalDate?: string
    payload?: {
      headers?: Array<{ name: string; value: string }>
      mimeType?: string
      body?: { data?: string }
      parts?: Array<Record<string, unknown>>
    }
  }
  const headers = data.payload?.headers ?? []
  const subject =
    headers.find((h) => h.name.toLowerCase() === "subject")?.value ?? ""
  const from = headers.find((h) => h.name.toLowerCase() === "from")?.value ?? ""
  const collected = {
    text: [] as string[],
    attachments: [] as GmailAttachment[],
  }
  if (data.payload?.body?.data) {
    collected.text.push(
      Buffer.from(data.payload.body.data, "base64url").toString("utf8")
    )
  }
  walkParts(data.payload?.parts, collected)
  return {
    id: data.id,
    threadId: data.threadId,
    subject,
    from,
    bodyText: collected.text.join("\n"),
    receivedAt: data.internalDate ? new Date(Number(data.internalDate)) : null,
    attachments: collected.attachments,
  }
}

export async function downloadGmailAttachment(
  accessToken: string,
  messageId: string,
  attachmentId: string
): Promise<Buffer> {
  const res = await fetch(
    `${GMAIL_API}/users/me/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Gmail attachment download failed: ${text}`)
  }
  const data = (await res.json()) as { data: string }
  return Buffer.from(data.data, "base64url")
}

export async function listGmailHistoryMessageIds(
  accessToken: string,
  startHistoryId: string
): Promise<{ messageIds: string[]; latestHistoryId: string }> {
  const params = new URLSearchParams({
    startHistoryId,
    historyTypes: "messageAdded",
  })
  const res = await fetch(`${GMAIL_API}/users/me/history?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (res.status === 404) {
    return { messageIds: [], latestHistoryId: startHistoryId }
  }
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Gmail history failed: ${text}`)
  }
  const data = (await res.json()) as {
    history?: Array<{
      messagesAdded?: Array<{ message: { id: string } }>
    }>
    historyId?: string
  }
  const ids = new Set<string>()
  for (const h of data.history ?? []) {
    for (const added of h.messagesAdded ?? []) {
      ids.add(added.message.id)
    }
  }
  return {
    messageIds: [...ids],
    latestHistoryId: data.historyId ?? startHistoryId,
  }
}
