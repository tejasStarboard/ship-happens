import { env } from "@/env"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "@better-auth/drizzle-adapter"
import { organization } from "better-auth/plugins/organization"
import { tanstackStartCookies } from "better-auth/tanstack-start"
import { db, redis } from "@/db"
import * as schema from "@/db/schema"
import { generateUUID } from "@/lib/utils"
import { emailClient } from "@/email"
import {
  ForgotPasswordEmail,
  OrganizationInvitationEmail,
  VerifyEmail,
} from "@/email/templates"
import { isProduction } from "@/lib/constants"

const appHost = (() => {
  try {
    return new URL(env.APP_URL).host
  } catch {
    return null
  }
})()

const googleEnabled = Boolean(
  env.GOOGLE_CLIENT_ID?.trim() && env.GOOGLE_CLIENT_SECRET?.trim()
)

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: {
    allowedHosts: [
      "localhost:*",
      "127.0.0.1:*",
      ...(appHost ? [appHost] : []),
      "*.vercel.app",
    ],
    fallback: env.APP_URL,
    protocol: isProduction ? "https" : "auto",
  },
  trustedOrigins: [
    env.APP_URL,
    env.VITE_APP_URL,
    "http://localhost:*",
    "http://127.0.0.1:*",
    env.VERCEL_URL ? `https://${env.VERCEL_URL}` : null,
    env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`
      : null,
    "https://*.vercel.app",
  ].filter((v, i, arr): v is string => Boolean(v) && arr.indexOf(v) === i),
  advanced: {
    database: {
      generateId: (_options) => generateUUID(),
    },
    trustedProxyHeaders: Boolean(env.VERCEL_URL),
    ...(env.BETTER_AUTH_DOMAIN &&
    !["localhost", "127.0.0.1"].includes(env.BETTER_AUTH_DOMAIN) &&
    !env.BETTER_AUTH_DOMAIN.endsWith(".vercel.app")
      ? {
          crossSubDomainCookies: {
            enabled: true,
            domain: env.BETTER_AUTH_DOMAIN,
          },
        }
      : {}),
  },
  socialProviders: googleEnabled
    ? {
        google: {
          clientId: env.GOOGLE_CLIENT_ID!,
          clientSecret: env.GOOGLE_CLIENT_SECRET!,
        },
      }
    : {},
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      await emailClient.emails.send({
        from: `${env.EMAIL_SENDER_NAME} <${env.EMAIL_SENDER_ADDRESS}>`,
        to: user.email,
        subject: "Verify your email",
        react: VerifyEmail({
          username: user.name,
          verifyUrl: url,
          senderName: env.EMAIL_SENDER_NAME,
        }),
      })
    },
    sendOnSignUp: isProduction,
  },
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      await emailClient.emails.send({
        from: `${env.EMAIL_SENDER_NAME} <${env.EMAIL_SENDER_ADDRESS}>`,
        to: user.email,
        subject: "Reset your password",
        react: ForgotPasswordEmail({
          username: user.name,
          resetUrl: url,
          userEmail: user.email,
        }),
      })
    },
    requireEmailVerification: isProduction,
  },
  user: {
    additionalFields: {
      username: {
        type: "string",
        required: false,
        input: true,
      },
    },
    changeEmail: {
      enabled: true,
      updateEmailWithoutVerification: true,
    },
  },
  secondaryStorage: {
    get: async (key) => redis.get(key),
    set: async (key, value, ttl) => {
      if (ttl) await redis.set(key, value, "EX", ttl)
      else await redis.set(key, value)
    },
    delete: async (key) => {
      await redis.del(key)
    },
    getAndDelete: async (key) => {
      const value = await redis.get(key)
      if (value !== null) await redis.del(key)
      return value
    },
    increment: async (key, ttl) => {
      const count = await redis.incr(key)
      if (count === 1) await redis.expire(key, ttl)
      return count
    },
  },
  plugins: [
    organization({
      allowUserToCreateOrganization: true,
      async sendInvitationEmail(data) {
        const inviteLink = `${env.APP_URL}/accept-invitation/${data.id}`

        await emailClient.emails.send({
          from: `${env.EMAIL_SENDER_NAME} <${env.EMAIL_SENDER_ADDRESS}>`,
          to: data.email,
          subject: "You've been invited to join our organization",
          react: OrganizationInvitationEmail({
            email: data.email,
            invitedByUsername: data.inviter.user.name,
            invitedByEmail: data.inviter.user.email,
            organizationName: data.organization.name,
            inviteLink,
          }),
        })
      },
    }),
    tanstackStartCookies(),
  ],
})

export type Session = typeof auth.$Infer.Session
