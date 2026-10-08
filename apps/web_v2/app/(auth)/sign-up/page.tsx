import { redirect } from "next/navigation";
import { AuthForm } from "@/app/(auth)/_components/auth-form";
import { getServerSession } from "@/lib/session";

export default async function SignUpPage() {
  const session = await getServerSession();
  if (session) {
    redirect("/");
  }

  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-12">
      <AuthForm mode="sign-up" />
    </main>
  );
}
