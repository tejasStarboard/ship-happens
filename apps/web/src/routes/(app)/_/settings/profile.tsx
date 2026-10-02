import { createFileRoute, Link } from "@tanstack/react-router"
import { ProfileForm } from "@/components/settings/profile-form"
import { getSession, listOrganizations } from "@/lib/auth/session"
import { pageMeta } from "@/lib/seo"

export const Route = createFileRoute("/(app)/_/settings/profile")({
  loader: async () => {
    const [session, orgs] = await Promise.all([
      getSession(),
      listOrganizations(),
    ])
    if (!session) {
      return {
        user: {
          name: "",
          email: "",
          image: null as string | null,
          username: null as string | null,
        },
        organization: null,
      }
    }

    const userRecord = session.user as typeof session.user & {
      username?: string | null
    }
    const activeOrgId = session.session.activeOrganizationId
    const organization =
      orgs.find((org) => org.id === activeOrgId) ?? orgs[0] ?? null

    return {
      user: {
        name: userRecord.name,
        email: userRecord.email,
        image: userRecord.image ?? null,
        username: userRecord.username ?? null,
      },
      organization: organization
        ? { id: organization.id, name: organization.name }
        : null,
    }
  },
  head: () => pageMeta({ title: "Profile", noIndex: true }),
  component: ProfileSettingsPage,
})

function ProfileSettingsPage() {
  const { user, organization } = Route.useLoaderData()

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 lg:px-6">
      <div>
        <Link
          to="/settings"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Settings
        </Link>
        <div className="mt-2">
          <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        </div>
      </div>

      <ProfileForm user={user} organization={organization} />
    </div>
  )
}
