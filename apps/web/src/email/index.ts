import { env } from "@/env"
import { Resend } from "resend"

declare global {
  var _emailClient: Resend
}

export const emailClient = global._emailClient ?? new Resend(env.RESEND_API_KEY)

if (!global._emailClient) global._emailClient = emailClient
