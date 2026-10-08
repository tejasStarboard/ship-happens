import { redirect } from "next/navigation";
import { WorkspaceHome } from "@/app/_components/workspace/workspace-home";
import { getServerSession } from "@/lib/session";

export default async function Page() {
  const session = await getServerSession();
  if (!session) {
    redirect("/sign-in");
  }

  return <WorkspaceHome />;
}
