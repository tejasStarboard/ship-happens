"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  IconBrandGoogle,
  IconBrandWindows,
  IconLink,
  IconLinkOff,
} from "@tabler/icons-react"
import { toast } from "sonner"
import { Button } from "@workspace/ui/components/button"
import { PageChrome } from "@/components/shared/page-chrome"
import { disconnectEmailIntegration } from "@/lib/server/actions/email-integrations"
import type { IntegrationPublicView } from "@/lib/domain/email-intake/email-intake.types"

const PROVIDERS = [
  {
    id: "gmail" as const,
    title: "Gmail",
    description:
      "Connect a Google mailbox. Pub/Sub watch delivers new mail for Jev classification and Fill desk intake.",
    icon: IconBrandGoogle,
    connectHref: "/api/integrations/gmail/connect",
    /** UI gate only — backend Outlook routes remain. */
    uiEnabled: true,
  },
  {
    id: "outlook" as const,
    title: "Outlook",
    description:
      "Connect a Microsoft mailbox. New inbox messages are classified with Jev; relevant BCO/RFP sheets become fills.",
    icon: IconBrandWindows,
    connectHref: "/api/integrations/outlook/connect",
    uiEnabled: false,
    unavailableReason:
      "Outlook connect is temporarily unavailable — Microsoft client credentials are not configured yet.",
  },
] as const

function statusLabel(status: string) {
  switch (status) {
    case "active":
      return "Connected"
    case "error":
      return "Needs attention"
    case "disconnected":
      return "Disconnected"
    default:
      return status
  }
}

export function IntegrationsPage({
  integrations,
  gmailRedirectUri,
  flash,
}: {
  integrations: IntegrationPublicView[]
  /** Exact redirect URI Google Cloud OAuth client must allow. */
  gmailRedirectUri: string
  flash?: { connected?: string | null; error?: string | null }
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [busyProvider, setBusyProvider] = useState<string | null>(null)

  const byProvider = useMemo(() => {
    const map = new Map<string, IntegrationPublicView>()
    for (const row of integrations) map.set(row.provider, row)
    return map
  }, [integrations])

  useEffect(() => {
    if (flash?.connected) {
      toast.success(`${flash.connected} connected`)
    }
    if (flash?.error) {
      toast.error(flash.error)
    }
  }, [flash?.connected, flash?.error])

  const onDisconnect = (provider: "gmail" | "outlook") => {
    setBusyProvider(provider)
    startTransition(async () => {
      try {
        await disconnectEmailIntegration(provider)
        toast.success(`${provider} disconnected`)
        router.refresh()
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Disconnect failed"
        )
      } finally {
        setBusyProvider(null)
      }
    })
  }

  return (
    <PageChrome
      title="Integrations"
      description="Mailbox intake for BCO bid sheets. Upload on the Fill desk remains the default path."
    >
      <div className="grid gap-4 md:grid-cols-2">
        {PROVIDERS.map((provider) => {
          const row = byProvider.get(provider.id)
          const connected = row?.status === "active"
          const Icon = provider.icon
          const uiEnabled = provider.uiEnabled
          return (
            <section
              key={provider.id}
              id={provider.id}
              aria-disabled={!uiEnabled}
              className={
                uiEnabled
                  ? "scroll-mt-24 rounded-[6px] border border-border bg-card p-5"
                  : "scroll-mt-24 rounded-[6px] border border-border bg-muted/20 p-5 opacity-70"
              }
            >
              <div className="flex items-start gap-3">
                <div className="flex size-10 items-center justify-center rounded-md border border-border bg-muted/40">
                  <Icon className="size-5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-semibold tracking-tight">
                      {provider.title}
                    </h2>
                    {!uiEnabled ? (
                      <span className="rounded border border-border px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                        Unavailable
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {provider.description}
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-2 border-t border-border/70 pt-4 text-xs">
                {!uiEnabled ? (
                  <p className="text-muted-foreground">
                    {"unavailableReason" in provider
                      ? provider.unavailableReason
                      : "Temporarily unavailable."}
                  </p>
                ) : row ? (
                  <>
                    <p>
                      <span className="text-muted-foreground">Status: </span>
                      {statusLabel(row.status)}
                    </p>
                    <p className="truncate" title={row.accountEmail}>
                      <span className="text-muted-foreground">Account: </span>
                      {row.accountEmail || "—"}
                    </p>
                    {row.watchExpiresAt ? (
                      <p>
                        <span className="text-muted-foreground">
                          Watch until:{" "}
                        </span>
                        {new Date(row.watchExpiresAt).toLocaleString()}
                      </p>
                    ) : null}
                    {row.lastError ? (
                      <p className="text-destructive">{row.lastError}</p>
                    ) : null}
                  </>
                ) : (
                  <p className="text-muted-foreground">Not connected</p>
                )}
                {uiEnabled && provider.id === "gmail" ? (
                  <div className="space-y-1 pt-1">
                    <p className="text-muted-foreground">
                      Google Cloud → Credentials → your OAuth client →{" "}
                      <span className="text-foreground">
                        Authorized redirect URIs
                      </span>{" "}
                      must include (exact match; this is not the Better Auth
                      sign-in callback):
                    </p>
                    <code className="block rounded border border-border bg-muted/40 px-2 py-1.5 font-mono text-[11px] break-all text-foreground">
                      {gmailRedirectUri}
                    </code>
                  </div>
                ) : null}
              </div>

              {uiEnabled ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {connected ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={pending && busyProvider === provider.id}
                      onClick={() => onDisconnect(provider.id)}
                    >
                      <IconLinkOff className="size-3.5" />
                      Disconnect
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      nativeButton={false}
                      render={<a href={provider.connectHref} />}
                    >
                      <IconLink className="size-3.5" />
                      Connect {provider.title}
                    </Button>
                  )}
                  {row &&
                  row.status !== "active" &&
                  row.status !== "disconnected" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      nativeButton={false}
                      render={<a href={provider.connectHref} />}
                    >
                      Reconnect
                    </Button>
                  ) : null}
                </div>
              ) : (
                <div className="mt-4">
                  <Button type="button" size="sm" disabled>
                    <IconLink className="size-3.5" />
                    Connect {provider.title}
                  </Button>
                </div>
              )}
            </section>
          )
        })}
      </div>
    </PageChrome>
  )
}
