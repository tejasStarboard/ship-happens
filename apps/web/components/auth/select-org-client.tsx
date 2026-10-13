"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { IconBuilding, IconPlus } from "@tabler/icons-react"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import { Button } from "@workspace/ui/components/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
} from "@workspace/ui/components/empty"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@workspace/ui/components/item"
import { Separator } from "@workspace/ui/components/separator"
import { Spinner } from "@workspace/ui/components/spinner"
import {
  AuthBody,
  AuthCard,
  AuthFooter,
  AuthHeader,
  AuthPage,
} from "@/components/auth/auth-shell"
import { CreateOrgForm } from "@/components/auth/create-org-form"
import { authClient } from "@/lib/auth/client"

type OrgItem = {
  id: string
  name: string
  slug: string
  logo: string | null
}

export function SelectOrgClient({
  organizations,
}: {
  organizations: OrgItem[]
}) {
  const router = useRouter()
  const [mode, setMode] = React.useState<"choose" | "create">(
    organizations.length === 0 ? "create" : "choose"
  )
  const [pendingId, setPendingId] = React.useState<string | null>(null)

  if (mode === "create") {
    return (
      <AuthPage>
        <CreateOrgForm
          onCancel={
            organizations.length > 0 ? () => setMode("choose") : undefined
          }
        />
      </AuthPage>
    )
  }

  return (
    <AuthPage>
      <AuthCard>
        <AuthBody className="gap-6">
          <AuthHeader
            title="Choose an organization"
            description="Select the organization with which you wish to continue."
          />

          <ItemGroup className="gap-0 overflow-hidden rounded-xl border">
            {organizations.map((org, index) => (
              <React.Fragment key={org.id}>
                {index > 0 ? <Separator /> : null}
                <Item
                  size="sm"
                  className="rounded-none"
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={pendingId !== null}
                      className="h-auto w-full justify-start rounded-none px-3.5 py-3 font-normal hover:bg-muted/60"
                      onClick={async () => {
                        setPendingId(org.id)
                        try {
                          const { error } =
                            await authClient.organization.setActive({
                              organizationId: org.id,
                            })
                          if (error) {
                            console.error(
                              "Failed to set active organization",
                              error
                            )
                            return
                          }
                          router.push("/rfp")
                          router.refresh()
                        } finally {
                          setPendingId(null)
                        }
                      }}
                    />
                  }
                >
                  <ItemMedia>
                    <Avatar className="size-9 rounded-lg after:rounded-lg">
                      {org.logo ? <AvatarImage src={org.logo} alt="" /> : null}
                      <AvatarFallback className="rounded-lg bg-foreground text-background">
                        <IconBuilding className="size-4" />
                      </AvatarFallback>
                    </Avatar>
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle>{org.name}</ItemTitle>
                    <ItemDescription>{org.slug}</ItemDescription>
                  </ItemContent>
                  {pendingId === org.id ? <Spinner /> : null}
                </Item>
              </React.Fragment>
            ))}

            {organizations.length > 0 ? <Separator /> : null}

            <Item
              size="sm"
              className="rounded-none"
              render={
                <Button
                  type="button"
                  variant="ghost"
                  className="h-auto w-full justify-start rounded-none px-3.5 py-3 font-normal text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  onClick={() => setMode("create")}
                />
              }
            >
              <ItemMedia>
                <Avatar className="size-9 rounded-lg border border-dashed border-border after:hidden">
                  <AvatarFallback className="rounded-lg bg-transparent text-muted-foreground">
                    <IconPlus className="size-4" />
                  </AvatarFallback>
                </Avatar>
              </ItemMedia>
              <ItemContent>
                <ItemTitle>Create organization</ItemTitle>
              </ItemContent>
            </Item>
          </ItemGroup>

          {organizations.length === 0 ? (
            <Empty className="border-0 p-0">
              <EmptyHeader>
                <EmptyDescription>
                  You are not a member of any organization yet.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : null}
        </AuthBody>

        <AuthFooter>
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-muted-foreground"
            onClick={async () => {
              await authClient.signOut()
              router.push("/sign-in")
              router.refresh()
            }}
          >
            Log out
          </Button>
        </AuthFooter>
      </AuthCard>
    </AuthPage>
  )
}
