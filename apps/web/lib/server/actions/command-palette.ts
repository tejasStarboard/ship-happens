"use server"

import { requireOrgSession } from "@/lib/auth/session"
import { createAppContext } from "@/lib/di/create-app-context"

export type CommandPaletteIndex = {
  fills: Array<{ id: string; name: string; customer: string }>
  templates: Array<{ id: string; name: string; customer: string | null }>
  overlays: Array<{ id: string; name: string; customer: string | null }>
}

export async function getCommandPaletteIndex(): Promise<
  { ok: true; data: CommandPaletteIndex } | { ok: false; error: string }
> {
  try {
    const { organizationId, session } = await requireOrgSession()
    const ctx = createAppContext()
    const ownerLabel = session.user.name ?? "Member"

    const [fills, templates, overlays] = await Promise.all([
      ctx.rfps.list(organizationId, ownerLabel),
      ctx.templates.list(organizationId, ownerLabel),
      ctx.overlayRules.list(organizationId),
    ])

    return {
      ok: true,
      data: {
        fills: fills.map((f) => ({
          id: f.id,
          name: f.name,
          customer: f.customer,
        })),
        templates: templates.map((t) => ({
          id: t.id,
          name: t.name,
          customer: t.customer,
        })),
        overlays: overlays.map((r) => ({
          id: r.id,
          name: r.name,
          customer: r.customer,
        })),
      },
    }
  } catch {
    return { ok: false, error: "Failed to load search index" }
  }
}
