import { redirect } from "next/navigation"
import { getServerSession } from "@/lib/session"

export default async function Page() {
  const session = await getServerSession()
  if (!session) {
    redirect("/sign-in")
  }
  if (!session.session.activeOrganizationId) {
    redirect("/select-org")
  }
  redirect("/rfp")
}
