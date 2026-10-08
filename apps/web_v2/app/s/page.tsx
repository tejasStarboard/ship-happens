import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/session";

/** “New chat” used to clear the session URL; workspaces own multiple chats now. */
export default async function NewSessionPage() {
  const session = await getServerSession();
  if (!session) {
    redirect("/sign-in");
  }
  redirect("/");
}
