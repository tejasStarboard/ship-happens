import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"
import { AuthMarketingPage } from "@/components/auth/auth-marketing"
import { SignUpForm } from "@/components/auth/sign-up-form"
import { pageMeta } from "@/lib/seo"

const signUpSearchSchema = z.object({
  redirect: z.string().optional().catch(undefined),
})

export const Route = createFileRoute("/(auth)/_/sign-up")({
  validateSearch: signUpSearchSchema,
  head: () =>
    pageMeta({
      title: "Create account",
      description:
        "Create a Ship Happens account to automate RFP bid sheets with AI fills, Starboard rates, and team workspaces.",
    }),
  component: SignUpPage,
})

function SignUpPage() {
  const { redirect: redirectTo } = Route.useSearch()

  return (
    <AuthMarketingPage>
      <SignUpForm redirectTo={safeRedirect(redirectTo)} />
    </AuthMarketingPage>
  )
}

/** Only allow same-origin relative paths to avoid open redirects. */
function safeRedirect(value: string | undefined): string | undefined {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return undefined
  }
  return value
}
