import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/app/_components/workspace/workspace-shell";
import { getServerSession } from "@/lib/session";

export default async function WorkspacePage({
  params,
}: {
  readonly params: Promise<{ readonly workspaceId: string }>;
}) {
  const session = await getServerSession();
  if (!session) {
    redirect("/sign-in");
  }

  const { workspaceId } = await params;
  return <WorkspaceShell workspaceId={workspaceId} />;
}
