import { ProfileForm } from "@/components/settings/profile-form"
import { getSession, listOrganizations } from "@/lib/auth/session"

export default async function SettingsProfilePage() {
  const [session, orgs] = await Promise.all([getSession(), listOrganizations()])

  if (!session) {
    return null
  }

  const userRecord = session.user as typeof session.user & {
    username?: string | null
  }
  const activeOrgId = session.session.activeOrganizationId
  const organization =
    orgs?.find((org) => org.id === activeOrgId) ?? orgs?.[0] ?? null

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 lg:px-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Update your personal details.
        </p>
      </div>
      <ProfileForm
        user={{
          name: userRecord.name,
          email: userRecord.email,
          image: userRecord.image ?? null,
          username: userRecord.username ?? null,
        }}
        organization={
          organization ? { id: organization.id, name: organization.name } : null
        }
      />
    </div>
  )
}
