import {
  DomainError,
  type CreateMarginFloorRuleInput,
  type CreateOverlayRuleInput,
  type UpdateMarginFloorRuleInput,
  type UpdateOverlayRuleInput,
} from "@ship-happens/fill"
import type { ShApiKeyContext } from "@/lib/auth/sh-api-key"
import { createAppContext } from "@/lib/di/create-app-context"
import { createStarboardClient } from "@/lib/starboard/client"

export type LocationSearchHit = {
  locode: string
  label: string
  city: string | null
  country: string | null
}

function asRecord(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new DomainError("JSON object body required", "VALIDATION")
  }
  return body as Record<string, unknown>
}

function optionalString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  if (typeof value !== "string") {
    throw new DomainError("Expected string or null", "VALIDATION")
  }
  return value
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new DomainError(`${field} is required`, "VALIDATION")
  }
  return value.trim()
}

function optionalBoolean(value: unknown): boolean | undefined {
  if (value === undefined) return undefined
  if (typeof value !== "boolean") {
    throw new DomainError("Expected boolean", "VALIDATION")
  }
  return value
}

function optionalInt(value: unknown): number | undefined {
  if (value === undefined) return undefined
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new DomainError("Expected integer", "VALIDATION")
  }
  return value
}

function parseCreateOverlay(body: unknown): CreateOverlayRuleInput {
  const raw = asRecord(body)
  const mode = raw.mode
  if (mode !== "markup" && mode !== "projected") {
    throw new DomainError('mode must be "markup" or "projected"', "VALIDATION")
  }
  return {
    name: requiredString(raw.name, "name"),
    customer: optionalString(raw.customer),
    originLocode: optionalString(raw.originLocode),
    destLocode: optionalString(raw.destLocode),
    equipmentType: optionalString(raw.equipmentType),
    mode,
    projectedAmount: optionalString(raw.projectedAmount),
    markupPct: optionalString(raw.markupPct),
    markupAmount: optionalString(raw.markupAmount),
    currency:
      typeof raw.currency === "string" ? raw.currency : undefined,
    enabled: optionalBoolean(raw.enabled),
    priority: optionalInt(raw.priority),
  }
}

function parseUpdateOverlay(body: unknown): UpdateOverlayRuleInput {
  const raw = asRecord(body)
  const out: UpdateOverlayRuleInput = {}
  if ("name" in raw) out.name = requiredString(raw.name, "name")
  if ("customer" in raw) out.customer = optionalString(raw.customer)
  if ("originLocode" in raw) out.originLocode = optionalString(raw.originLocode)
  if ("destLocode" in raw) out.destLocode = optionalString(raw.destLocode)
  if ("equipmentType" in raw) {
    out.equipmentType = optionalString(raw.equipmentType)
  }
  if ("mode" in raw) {
    if (raw.mode !== "markup" && raw.mode !== "projected") {
      throw new DomainError(
        'mode must be "markup" or "projected"',
        "VALIDATION"
      )
    }
    out.mode = raw.mode
  }
  if ("projectedAmount" in raw) {
    out.projectedAmount = optionalString(raw.projectedAmount)
  }
  if ("markupPct" in raw) out.markupPct = optionalString(raw.markupPct)
  if ("markupAmount" in raw) out.markupAmount = optionalString(raw.markupAmount)
  if ("currency" in raw && typeof raw.currency === "string") {
    out.currency = raw.currency
  }
  if ("enabled" in raw) out.enabled = optionalBoolean(raw.enabled)
  if ("priority" in raw) out.priority = optionalInt(raw.priority)
  return out
}

function parseCreateFloor(body: unknown): CreateMarginFloorRuleInput {
  const raw = asRecord(body)
  return {
    name: requiredString(raw.name, "name"),
    customer: optionalString(raw.customer),
    minAmount: optionalString(raw.minAmount),
    minPct: optionalString(raw.minPct),
    currency:
      typeof raw.currency === "string" ? raw.currency : undefined,
    enabled: optionalBoolean(raw.enabled),
    priority: optionalInt(raw.priority),
  }
}

function parseUpdateFloor(body: unknown): UpdateMarginFloorRuleInput {
  const raw = asRecord(body)
  const out: UpdateMarginFloorRuleInput = {}
  if ("name" in raw) out.name = requiredString(raw.name, "name")
  if ("customer" in raw) out.customer = optionalString(raw.customer)
  if ("minAmount" in raw) out.minAmount = optionalString(raw.minAmount)
  if ("minPct" in raw) out.minPct = optionalString(raw.minPct)
  if ("currency" in raw && typeof raw.currency === "string") {
    out.currency = raw.currency
  }
  if ("enabled" in raw) out.enabled = optionalBoolean(raw.enabled)
  if ("priority" in raw) out.priority = optionalInt(raw.priority)
  return out
}

export async function listOverlayRulesApi(ctx: ShApiKeyContext) {
  const rules = await createAppContext().overlayRules.list(ctx.organizationId)
  return { rules }
}

export async function createOverlayRuleApi(
  ctx: ShApiKeyContext,
  body: unknown
) {
  const input = parseCreateOverlay(body)
  const rule = await createAppContext().overlayRules.create(
    ctx.organizationId,
    ctx.userId,
    input
  )
  return { rule }
}

export async function updateOverlayRuleApi(
  ctx: ShApiKeyContext,
  id: string,
  body: unknown
) {
  if (!id.trim()) {
    throw new DomainError("Overlay rule id is required", "VALIDATION")
  }
  const rule = await createAppContext().overlayRules.update(
    ctx.organizationId,
    id,
    parseUpdateOverlay(body)
  )
  return { rule }
}

export async function deleteOverlayRuleApi(ctx: ShApiKeyContext, id: string) {
  if (!id.trim()) {
    throw new DomainError("Overlay rule id is required", "VALIDATION")
  }
  await createAppContext().overlayRules.delete(ctx.organizationId, id)
  return { ok: true as const }
}

export async function listFloorRulesApi(ctx: ShApiKeyContext) {
  const rules = await createAppContext().marginFloors.list(ctx.organizationId)
  return { rules }
}

export async function createFloorRuleApi(ctx: ShApiKeyContext, body: unknown) {
  const input = parseCreateFloor(body)
  const rule = await createAppContext().marginFloors.create(
    ctx.organizationId,
    ctx.userId,
    input
  )
  return { rule }
}

export async function updateFloorRuleApi(
  ctx: ShApiKeyContext,
  id: string,
  body: unknown
) {
  if (!id.trim()) {
    throw new DomainError("Floor rule id is required", "VALIDATION")
  }
  const rule = await createAppContext().marginFloors.update(
    ctx.organizationId,
    id,
    parseUpdateFloor(body)
  )
  return { rule }
}

export async function deleteFloorRuleApi(ctx: ShApiKeyContext, id: string) {
  if (!id.trim()) {
    throw new DomainError("Floor rule id is required", "VALIDATION")
  }
  await createAppContext().marginFloors.delete(ctx.organizationId, id)
  return { ok: true as const }
}

export async function searchLocationsApi(query: string) {
  const q = query.trim()
  if (q.length < 2) {
    return { query: q, options: [] as LocationSearchHit[] }
  }

  const client = await createStarboardClient()
  const result = await client.locations.resolve(q)

  const options: LocationSearchHit[] = []
  for (const opt of result.options) {
    const locodes = opt.locodes ?? []
    const city =
      typeof opt.city === "string"
        ? opt.city
        : opt.city != null
          ? String(opt.city)
          : null
    const country =
      typeof opt.country === "string"
        ? opt.country
        : opt.country != null
          ? String(opt.country)
          : null
    for (const locode of locodes.slice(0, 3)) {
      if (!locode) continue
      const parts = [city, country].filter(Boolean)
      options.push({
        locode,
        label: parts.length > 0 ? `${locode} · ${parts.join(", ")}` : locode,
        city,
        country,
      })
    }
  }

  return { query: q, options: options.slice(0, 12) }
}
