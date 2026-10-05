import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"
import { AuthMarketingPage } from "@/components/auth/auth-marketing"
import { SignInForm } from "@/components/auth/sign-in-form"
import { pageMeta } from "@/lib/seo"

const signInSearchSchema = z.object({
  redirect: z.string().optional().catch(undefined),
})

export const Route = createFileRoute("/(auth)/_/sign-in")({
  validateSearch: signInSearchSchema,
  head: () =>
    pageMeta({
      title: "Sign in",
      description:
        "Sign in to Ship Happens — automate RFP bid sheets with AI fills, Starboard rates, and reusable templates.",
    }),
  component: SignInPage,
})

function SignInPage() {
  const { redirect: redirectTo } = Route.useSearch()

  return (
    <AuthMarketingPage>
      <SignInForm redirectTo={safeRedirect(redirectTo)} />
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
