import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/session";
import {
  createWorkspace,
  findWorkspaceIdByChatOrSession,
  getWorkspace,
} from "@/lib/workspace-registry";

/** Legacy session URLs: send the user to the owning workspace when possible. */
export default async function SessionPage({
  params,
}: {
  readonly params: Promise<{ readonly sessionId: string }>;
}) {
  const session = await getServerSession();
  if (!session) {
    redirect("/sign-in");
  }

  const { sessionId } = await params;
  const existing = findWorkspaceIdByChatOrSession(sessionId);
  if (existing && getWorkspace(existing)) {
    redirect(`/w/${encodeURIComponent(existing)}`);
  }

  // Unknown legacy session: open a fresh workspace instead of a broken shell.
  const workspace = createWorkspace();
  redirect(`/w/${encodeURIComponent(workspace.id)}`);
}
