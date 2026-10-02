import * as React from "react"
import {
  createFileRoute,
  Link,
  redirect,
  useNavigate,
  useRouter,
} from "@tanstack/react-router"
import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
} from "@workspace/ui/components/empty"
import { Spinner } from "@workspace/ui/components/spinner"
import {
  AuthBody,
  AuthCard,
  AuthFooter,
  AuthHeader,
} from "@/components/auth/auth-shell"
import { authClient } from "@/lib/auth/client"
import { getInvitation, getSession } from "@/lib/auth/session"
import { pageMeta } from "@/lib/seo"

export const Route = createFileRoute(
  "/(auth)/_/accept-invitation/$invitationId"
)({
  beforeLoad: async ({ params }) => {
    const session = await getSession()
    if (!session) {
      throw redirect({
        to: "/sign-in",
        search: {
          redirect: `/accept-invitation/${params.invitationId}`,
        },
      })
    }
    return { session }
  },
  loader: async ({ params, context }) => {
    const result = await getInvitation({
      data: { invitationId: params.invitationId },
    })
    return {
      invitation: result.invitation,
      error: result.error,
      userEmail: context.session.user.email,
    }
  },
  head: () =>
    pageMeta({
      title: "Accept invitation",
      noIndex: true,
    }),
  component: AcceptInvitationPage,
})

function AcceptInvitationPage() {
  const { invitation, error: loadError, userEmail } = Route.useLoaderData()
  const { invitationId } = Route.useParams()
  const navigate = useNavigate()
  const router = useRouter()
  const [pending, setPending] = React.useState<"accept" | "reject" | null>(null)
  const [actionError, setActionError] = React.useState<string | null>(null)

  async function accept() {
    setActionError(null)
    setPending("accept")
    try {
      const { error } = await authClient.organization.acceptInvitation({
        invitationId,
      })
      if (error) {
        setActionError(error.message ?? "Could not accept invitation")
        setPending(null)
        return
      }
      void router.invalidate()
      void navigate({ to: "/" })
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Could not accept invitation"
      )
      setPending(null)
    }
  }

  async function reject() {
    setActionError(null)
    setPending("reject")
    try {
      const { error } = await authClient.organization.rejectInvitation({
        invitationId,
      })
      if (error) {
        setActionError(error.message ?? "Could not reject invitation")
        setPending(null)
        return
      }
      void navigate({ to: "/select-org" })
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Could not reject invitation"
      )
      setPending(null)
    }
  }

  if (loadError || !invitation) {
    return (
      <AuthCard>
        <AuthBody>
          <AuthHeader
            title="Invitation unavailable"
            description="This invitation may have expired, already been used, or was sent to a different email address."
          />
          <Alert variant="destructive">
            <AlertDescription>
              {loadError ?? "Invitation not found."}
            </AlertDescription>
          </Alert>
          <Empty className="border-0 p-0">
            <EmptyHeader>
              <EmptyDescription>Signed in as {userEmail}</EmptyDescription>
            </EmptyHeader>
          </Empty>
          <div className="flex flex-col gap-2">
            <Button
              className="h-10 w-full"
              render={<Link to="/select-org" />}
              nativeButton={false}
            >
              Go to organizations
            </Button>
            <Button
              variant="outline"
              className="h-10 w-full"
              render={<Link to="/sign-in" search={{ redirect: undefined }} />}
              nativeButton={false}
            >
              Sign in with another account
            </Button>
          </div>
        </AuthBody>
      </AuthCard>
    )
  }

  return (
    <AuthCard>
      <AuthBody>
        <AuthHeader
          title={`Join ${invitation.organizationName}`}
          description={`${invitation.inviterEmail} invited you to join as ${invitation.role}.`}
        />
        <Empty className="border-0 p-0">
          <EmptyHeader>
            <EmptyDescription>
              Accepting will add{" "}
              <span className="font-medium text-foreground">{userEmail}</span>{" "}
              to this organization.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
        {actionError ? (
          <Alert variant="destructive">
            <AlertDescription>{actionError}</AlertDescription>
          </Alert>
        ) : null}
        <div className="flex flex-col gap-2">
          <Button
            className="h-10 w-full"
            disabled={pending !== null}
            onClick={() => void accept()}
          >
            {pending === "accept" ? <Spinner data-icon="inline-start" /> : null}
            {pending === "accept" ? "Joining…" : "Accept invitation"}
          </Button>
          <Button
            variant="outline"
            className="h-10 w-full"
            disabled={pending !== null}
            onClick={() => void reject()}
          >
            {pending === "reject" ? <Spinner data-icon="inline-start" /> : null}
            {pending === "reject" ? "Rejecting…" : "Decline"}
          </Button>
        </div>
      </AuthBody>
      <AuthFooter>
        <Button
          variant="link"
          size="sm"
          className="h-auto p-0 text-muted-foreground"
          render={<Link to="/select-org" />}
          nativeButton={false}
        >
          Choose another organization
        </Button>
      </AuthFooter>
    </AuthCard>
  )
}
