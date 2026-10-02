import { createFileRoute, useRouter } from "@tanstack/react-router"
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

export const Route = createFileRoute("/(app)/_/members")({
  loader: async () => {
    const data = await listMembers()
    return { members: toMemberRows(data) }
  },
  head: () => pageMeta({ title: "Members", noIndex: true }),
  component: MembersPage,
})

function MembersPage() {
  const { members } = Route.useLoaderData()
  const router = useRouter()

  return (
    <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <MembersTable
        data={members}
        onInvited={() => {
          void router.invalidate()
        }}
      />
    </div>
  )
}
