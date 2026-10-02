import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"
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
      description: "Create a Ship Happens account to start filling RFP sheets.",
    }),
  component: SignUpPage,
})

function SignUpPage() {
  const { redirect: redirectTo } = Route.useSearch()

  return <SignUpForm redirectTo={safeRedirect(redirectTo)} />
}

/** Only allow same-origin relative paths to avoid open redirects. */
function safeRedirect(value: string | undefined): string | undefined {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return undefined
  }
  return value
}
