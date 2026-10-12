import { redirect } from "next/navigation"
import { AuthMarketingPage } from "@/components/auth/auth-marketing"
import { SignUpForm } from "@/components/auth/sign-up-form"
import { getSession } from "@/lib/auth/session"

function safeRedirect(value: string | undefined): string | undefined {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return undefined
  }
  return value
}

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>
}) {
  const session = await getSession()
  if (session) {
    redirect(session.session.activeOrganizationId ? "/rfp" : "/select-org")
  }

  const params = await searchParams
  return (
    <AuthMarketingPage>
      <SignUpForm redirectTo={safeRedirect(params.redirect)} />
    </AuthMarketingPage>
  )
}
