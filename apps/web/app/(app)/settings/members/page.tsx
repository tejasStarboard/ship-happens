import {
  MembersTable,
  type MemberRow,
} from "@/components/members/members-table"
import { listMembers } from "@/lib/auth/session"

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

export default async function SettingsMembersPage() {
  const data = await listMembers()
  const members = toMemberRows(data)

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 lg:px-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Members</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          People in your active organization.
        </p>
      </div>
      <MembersTable data={members} />
    </div>
  )
}
