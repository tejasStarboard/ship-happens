import { redirect } from "next/navigation";
import { AcceptInvitationClient } from "@/components/auth/accept-invitation-client";
import { getInvitation, getSession } from "@/lib/auth/session";

export default async function AcceptInvitationPage({
  params,
}: {
  params: Promise<{ invitationId: string }>;
}) {
  const { invitationId } = await params;
  const session = await getSession();
  if (!session) {
    redirect(`/sign-in?redirect=${encodeURIComponent(`/accept-invitation/${invitationId}`)}`);
  }

  const result = await getInvitation(invitationId);

  return (
    <AcceptInvitationClient
      invitationId={invitationId}
      userEmail={session.user.email}
      invitation={
        result.invitation
          ? {
              organizationName: result.invitation.organizationName,
              inviterEmail: result.invitation.inviterEmail,
              role: String(result.invitation.role),
            }
          : null
      }
      loadError={result.error}
    />
  );
}
