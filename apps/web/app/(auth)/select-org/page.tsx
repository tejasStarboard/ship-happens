import { redirect } from "next/navigation"
import { SelectOrgClient } from "@/components/auth/select-org-client"
import { getSession, listOrganizations } from "@/lib/auth/session"

export default async function SelectOrgPage() {
  const session = await getSession()
  if (!session) {
    redirect("/sign-in")
  }

  const organizations = (await listOrganizations()) ?? []

  return (
    <SelectOrgClient
      organizations={organizations.map((org) => ({
        id: org.id,
        name: org.name,
        slug: org.slug,
        logo: org.logo ?? null,
      }))}
    />
  )
}
