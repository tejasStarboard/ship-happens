"use client"

import { createAuthClient } from "better-auth/react"
import { apiKeyClient } from "@better-auth/api-key/client"
import { organizationClient } from "better-auth/client/plugins"

export const authClient = createAuthClient({
  plugins: [organizationClient(), apiKeyClient()],
})

export const { signIn, signOut, signUp, useSession } = authClient
