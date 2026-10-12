import { redirect } from "next/navigation";
import { AuthMarketingPage } from "@/components/auth/auth-marketing";
import { SignInForm } from "@/components/auth/sign-in-form";
import { getSession } from "@/lib/auth/session";

function safeRedirect(value: string | undefined): string | undefined {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return undefined;
  }
  return value;
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const session = await getSession();
  if (session) {
    redirect(session.session.activeOrganizationId ? "/rfp" : "/select-org");
  }

  const params = await searchParams;
  return (
    <AuthMarketingPage>
      <SignInForm redirectTo={safeRedirect(params.redirect)} />
    </AuthMarketingPage>
  );
}
