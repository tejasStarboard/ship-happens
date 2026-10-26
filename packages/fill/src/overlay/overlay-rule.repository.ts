import { randomUUID } from "node:crypto"
import { and, desc, eq } from "drizzle-orm"
import { overlayRules } from "@workspace/db"
import type { AppDb } from "../rfp/rfp.repository"
import { DomainError } from "../errors"
import type {
  CreateOverlayRuleInput,
  OverlayRuleMode,
  OverlayRuleView,
  UpdateOverlayRuleInput,
} from "./overlay.types"

function ruleId() {
  return `ovl_${randomUUID().replaceAll("-", "").slice(0, 16)}`
}

function emptyToNull(value: string | null | undefined): string | null {
  if (value == null) return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function asMode(value: string): OverlayRuleMode {
  if (value === "projected" || value === "markup") return value
  throw new DomainError(`Invalid overlay mode: ${value}`, "VALIDATION")
}

function toView(row: typeof overlayRules.$inferSelect): OverlayRuleView {
  return {
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    customer: row.customer,
    originLocode: row.originLocode,
    destLocode: row.destLocode,
    equipmentType: row.equipmentType,
    mode: asMode(row.mode),
    projectedAmount: row.projectedAmount,
    markupPct: row.markupPct,
    markupAmount: row.markupAmount,
    currency: row.currency,
    enabled: row.enabled,
    priority: row.priority,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

function validateAmounts(
  mode: OverlayRuleMode,
  projectedAmount: string | null,
  markupPct: string | null,
  markupAmount: string | null
) {
  if (mode === "projected") {
    if (projectedAmount == null) {
      throw new DomainError(
        "Projected overlay rules require a projected amount",
        "VALIDATION"
      )
    }
    const n = Number(projectedAmount)
    if (!Number.isFinite(n) || n < 0) {
      throw new DomainError(
        "Projected amount must be a non-negative number",
        "VALIDATION"
      )
    }
    return
  }

  if (markupPct == null && markupAmount == null) {
    throw new DomainError(
      "Markup overlay rules require a percent and/or amount",
      "VALIDATION"
    )
  }
  if (markupPct != null) {
    const n = Number(markupPct)
    if (!Number.isFinite(n)) {
      throw new DomainError("Markup percent must be a number", "VALIDATION")
    }
  }
  if (markupAmount != null) {
    const n = Number(markupAmount)
    if (!Number.isFinite(n)) {
      throw new DomainError("Markup amount must be a number", "VALIDATION")
    }
  }
}

export class OverlayRuleRepository {
  constructor(private readonly db: AppDb) {}

  async listByOrganization(
    organizationId: string,
    options?: { enabledOnly?: boolean }
  ): Promise<OverlayRuleView[]> {
    const rows = options?.enabledOnly
      ? await this.db
          .select()
          .from(overlayRules)
          .where(
            and(
              eq(overlayRules.organizationId, organizationId),
              eq(overlayRules.enabled, true)
            )
          )
          .orderBy(desc(overlayRules.priority), desc(overlayRules.updatedAt))
      : await this.db
          .select()
          .from(overlayRules)
          .where(eq(overlayRules.organizationId, organizationId))
          .orderBy(desc(overlayRules.priority), desc(overlayRules.updatedAt))

    return rows.map(toView)
  }

  async findByIdForOrganization(
    organizationId: string,
    id: string
  ): Promise<OverlayRuleView | null> {
    const row = await this.db
      .select()
      .from(overlayRules)
      .where(
        and(
          eq(overlayRules.id, id),
          eq(overlayRules.organizationId, organizationId)
        )
      )
      .limit(1)
      .then((rows) => rows[0] ?? null)
    return row ? toView(row) : null
  }

  async create(
    organizationId: string,
    createdByUserId: string,
    input: CreateOverlayRuleInput
  ): Promise<OverlayRuleView> {
    const name = input.name.trim()
    if (!name) {
      throw new DomainError("Overlay rule name is required", "VALIDATION")
    }
    const mode = asMode(input.mode)
    const projectedAmount = emptyToNull(input.projectedAmount)
    const markupPct = emptyToNull(input.markupPct)
    const markupAmount = emptyToNull(input.markupAmount)
    validateAmounts(mode, projectedAmount, markupPct, markupAmount)

    const id = ruleId()
    const [row] = await this.db
      .insert(overlayRules)
      .values({
        id,
        organizationId,
        createdByUserId,
        name,
        customer: emptyToNull(input.customer),
        originLocode: emptyToNull(input.originLocode)?.toUpperCase() ?? null,
        destLocode: emptyToNull(input.destLocode)?.toUpperCase() ?? null,
        equipmentType: emptyToNull(input.equipmentType)?.toUpperCase() ?? null,
        mode,
        projectedAmount: mode === "projected" ? projectedAmount : null,
        markupPct: mode === "markup" ? markupPct : null,
        markupAmount: mode === "markup" ? markupAmount : null,
        currency: emptyToNull(input.currency) ?? "USD",
        enabled: input.enabled ?? true,
        priority: input.priority ?? 0,
      })
      .returning()

    if (!row) {
      throw new DomainError("Failed to create overlay rule", "VALIDATION")
    }
    return toView(row)
  }

  async update(
    organizationId: string,
    id: string,
    input: UpdateOverlayRuleInput
  ): Promise<OverlayRuleView> {
    const existing = await this.findByIdForOrganization(organizationId, id)
    if (!existing) {
      throw new DomainError(`Overlay rule not found: ${id}`, "NOT_FOUND")
    }

    const mode = input.mode != null ? asMode(input.mode) : existing.mode
    const name = input.name != null ? input.name.trim() : existing.name
    if (!name) {
      throw new DomainError("Overlay rule name is required", "VALIDATION")
    }

    const projectedAmount =
      input.projectedAmount !== undefined
        ? emptyToNull(input.projectedAmount)
        : existing.projectedAmount
    const markupPct =
      input.markupPct !== undefined
        ? emptyToNull(input.markupPct)
        : existing.markupPct
    const markupAmount =
      input.markupAmount !== undefined
        ? emptyToNull(input.markupAmount)
        : existing.markupAmount

    validateAmounts(mode, projectedAmount, markupPct, markupAmount)

    const [row] = await this.db
      .update(overlayRules)
      .set({
        name,
        customer:
          input.customer !== undefined
            ? emptyToNull(input.customer)
            : existing.customer,
        originLocode:
          input.originLocode !== undefined
            ? (emptyToNull(input.originLocode)?.toUpperCase() ?? null)
            : existing.originLocode,
        destLocode:
          input.destLocode !== undefined
            ? (emptyToNull(input.destLocode)?.toUpperCase() ?? null)
            : existing.destLocode,
        equipmentType:
          input.equipmentType !== undefined
            ? (emptyToNull(input.equipmentType)?.toUpperCase() ?? null)
            : existing.equipmentType,
        mode,
        projectedAmount: mode === "projected" ? projectedAmount : null,
        markupPct: mode === "markup" ? markupPct : null,
        markupAmount: mode === "markup" ? markupAmount : null,
        currency:
          input.currency !== undefined
            ? (emptyToNull(input.currency) ?? "USD")
            : existing.currency,
        enabled: input.enabled ?? existing.enabled,
        priority: input.priority ?? existing.priority,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(overlayRules.id, id),
          eq(overlayRules.organizationId, organizationId)
        )
      )
      .returning()

    if (!row) {
      throw new DomainError(`Overlay rule not found: ${id}`, "NOT_FOUND")
    }
    return toView(row)
  }

  async delete(organizationId: string, id: string): Promise<void> {
    const deleted = await this.db
      .delete(overlayRules)
      .where(
        and(
          eq(overlayRules.id, id),
          eq(overlayRules.organizationId, organizationId)
        )
      )
      .returning({ id: overlayRules.id })

    if (deleted.length === 0) {
      throw new DomainError(`Overlay rule not found: ${id}`, "NOT_FOUND")
    }
  }
}
