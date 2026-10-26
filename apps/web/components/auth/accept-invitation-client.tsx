"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Alert, AlertDescription } from "@ship-happens/ui/components/alert"
import { Button } from "@ship-happens/ui/components/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
} from "@ship-happens/ui/components/empty"
import { Spinner } from "@ship-happens/ui/components/spinner"
import {
  AuthBody,
  AuthCard,
  AuthFooter,
  AuthHeader,
  AuthPage,
} from "@/components/auth/auth-shell"
import { authClient } from "@/lib/auth/client"

type InvitationSummary = {
  organizationName: string
  inviterEmail: string
  role: string
}

export function AcceptInvitationClient({
  invitationId,
  invitation,
  loadError,
  userEmail,
}: {
  invitationId: string
  invitation: InvitationSummary | null
  loadError: string | null
  userEmail: string
}) {
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
      router.push("/rfp")
      router.refresh()
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
      router.push("/select-org")
      router.refresh()
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Could not reject invitation"
      )
      setPending(null)
    }
  }

  if (loadError || !invitation) {
    return (
      <AuthPage>
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
                render={<Link href="/select-org" />}
                nativeButton={false}
              >
                Go to organizations
              </Button>
              <Button
                variant="outline"
                className="h-10 w-full"
                render={<Link href="/sign-in" />}
                nativeButton={false}
              >
                Sign in with another account
              </Button>
            </div>
          </AuthBody>
        </AuthCard>
      </AuthPage>
    )
  }

  return (
    <AuthPage>
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
              {pending === "accept" ? (
                <Spinner data-icon="inline-start" />
              ) : null}
              {pending === "accept" ? "Joining…" : "Accept invitation"}
            </Button>
            <Button
              variant="outline"
              className="h-10 w-full"
              disabled={pending !== null}
              onClick={() => void reject()}
            >
              {pending === "reject" ? (
                <Spinner data-icon="inline-start" />
              ) : null}
              {pending === "reject" ? "Rejecting…" : "Decline"}
            </Button>
          </div>
        </AuthBody>
        <AuthFooter>
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-muted-foreground"
            render={<Link href="/select-org" />}
            nativeButton={false}
          >
            Choose another organization
          </Button>
        </AuthFooter>
      </AuthCard>
    </AuthPage>
  )
}
