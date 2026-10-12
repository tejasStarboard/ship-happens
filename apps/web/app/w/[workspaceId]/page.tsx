import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/app/_components/workspace/workspace-shell";
import { getSession } from "@/lib/auth/session";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { rfps } from "@/lib/db/schema";

/**
 * Legacy / deep-link workspace URLs.
 * When the workspace is an org RFP, send users into the product Agent tab.
 * Otherwise keep the fullscreen eve shell (ad-hoc workspaces).
 */
export default async function WorkspacePage({
  params,
}: {
  readonly params: Promise<{ readonly workspaceId: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }

  const { workspaceId } = await params;
  const organizationId = session.session.activeOrganizationId;

  if (organizationId) {
    const rfp = await db.query.rfps.findFirst({
      where: and(
        eq(rfps.id, workspaceId),
        eq(rfps.organizationId, organizationId),
      ),
      columns: { id: true },
    });
    if (rfp) {
      redirect(`/rfp/${encodeURIComponent(rfp.id)}`);
    }
  }

  return <WorkspaceShell workspaceId={workspaceId} />;
}
