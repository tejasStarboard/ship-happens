import { createFileRoute, Link, useRouter } from "@tanstack/react-router"
import {
  MembersTable,
  type MemberRow,
} from "@/components/members/members-table"
import { listMembers } from "@/lib/auth/session"
import { pageMeta } from "@/lib/seo"

function toMemberRows(
  data: Awaited<ReturnType<typeof listMembers>>
): MemberRow[] {
  if (!data) return []

  const members = Array.isArray(data) ? data : (data.members ?? [])

  return members.map((member) => ({
    id: member.id,
    name: member.user?.name ?? "",
    email: member.user?.email ?? "",
    role: Array.isArray(member.role)
      ? member.role.join(", ")
      : String(member.role),
    image: member.user?.image ?? null,
    createdAt:
      typeof member.createdAt === "string"
        ? member.createdAt
        : new Date(member.createdAt).toISOString(),
  }))
}

export const Route = createFileRoute("/(app)/_/settings/members")({
  loader: async () => {
    const data = await listMembers()
    return { members: toMemberRows(data) }
  },
  head: () => pageMeta({ title: "Members", noIndex: true }),
  component: SettingsMembersPage,
})

function SettingsMembersPage() {
  const { members } = Route.useLoaderData()
  const router = useRouter()

  return (
    <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="px-4 lg:px-6">
        <Link
          to="/settings"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Settings
        </Link>
        <div className="mt-2">
          <h1 className="text-2xl font-semibold tracking-tight">Members</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Invite and manage organization members.
          </p>
        </div>
      </div>
      <MembersTable
        data={members}
        onInvited={() => {
          void router.invalidate()
        }}
      />
    </div>
  )
}
