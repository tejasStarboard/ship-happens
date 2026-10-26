import { randomUUID } from "node:crypto"
import { and, desc, eq } from "drizzle-orm"
import { marginFloorRules } from "@ship-happens/db"
import type { AppDb } from "../rfp/rfp.repository"
import { DomainError } from "../errors"
import type {
  CreateMarginFloorRuleInput,
  MarginFloorRuleView,
  UpdateMarginFloorRuleInput,
} from "./margin-floor.types"

function ruleId() {
  return `mfl_${randomUUID().replaceAll("-", "").slice(0, 16)}`
}

function emptyToNull(value: string | null | undefined): string | null {
  if (value == null) return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function toView(
  row: typeof marginFloorRules.$inferSelect
): MarginFloorRuleView {
  return {
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    customer: row.customer,
    minAmount: row.minAmount,
    minPct: row.minPct,
    currency: row.currency,
    enabled: row.enabled,
    priority: row.priority,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

function validateThresholds(minAmount: string | null, minPct: string | null) {
  if (minAmount == null && minPct == null) {
    throw new DomainError(
      "Floor rules require a minimum amount and/or percent",
      "VALIDATION"
    )
  }
  if (minAmount != null) {
    const n = Number(minAmount)
    if (!Number.isFinite(n) || n < 0) {
      throw new DomainError(
        "Minimum amount must be a non-negative number",
        "VALIDATION"
      )
    }
  }
  if (minPct != null) {
    const n = Number(minPct)
    if (!Number.isFinite(n) || n < 0) {
      throw new DomainError(
        "Minimum percent must be a non-negative number",
        "VALIDATION"
      )
    }
  }
}

export class MarginFloorRuleRepository {
  constructor(private readonly db: AppDb) {}

  async listByOrganization(
    organizationId: string,
    options?: { enabledOnly?: boolean }
  ): Promise<MarginFloorRuleView[]> {
    const rows = options?.enabledOnly
      ? await this.db
          .select()
          .from(marginFloorRules)
          .where(
            and(
              eq(marginFloorRules.organizationId, organizationId),
              eq(marginFloorRules.enabled, true)
            )
          )
          .orderBy(
            desc(marginFloorRules.priority),
            desc(marginFloorRules.updatedAt)
          )
      : await this.db
          .select()
          .from(marginFloorRules)
          .where(eq(marginFloorRules.organizationId, organizationId))
          .orderBy(
            desc(marginFloorRules.priority),
            desc(marginFloorRules.updatedAt)
          )

    return rows.map(toView)
  }

  async findByIdForOrganization(
    organizationId: string,
    id: string
  ): Promise<MarginFloorRuleView | null> {
    const row = await this.db
      .select()
      .from(marginFloorRules)
      .where(
        and(
          eq(marginFloorRules.id, id),
          eq(marginFloorRules.organizationId, organizationId)
        )
      )
      .limit(1)
      .then((rows) => rows[0] ?? null)
    return row ? toView(row) : null
  }

  async create(
    organizationId: string,
    createdByUserId: string,
    input: CreateMarginFloorRuleInput
  ): Promise<MarginFloorRuleView> {
    const name = input.name.trim()
    if (!name) {
      throw new DomainError("Floor rule name is required", "VALIDATION")
    }
    const minAmount = emptyToNull(input.minAmount)
    const minPct = emptyToNull(input.minPct)
    validateThresholds(minAmount, minPct)

    const id = ruleId()
    const [row] = await this.db
      .insert(marginFloorRules)
      .values({
        id,
        organizationId,
        createdByUserId,
        name,
        customer: emptyToNull(input.customer),
        minAmount,
        minPct,
        currency: emptyToNull(input.currency) ?? "USD",
        enabled: input.enabled ?? true,
        priority: input.priority ?? 0,
      })
      .returning()

    if (!row) {
      throw new DomainError("Failed to create floor rule", "VALIDATION")
    }
    return toView(row)
  }

  async update(
    organizationId: string,
    id: string,
    input: UpdateMarginFloorRuleInput
  ): Promise<MarginFloorRuleView> {
    const existing = await this.findByIdForOrganization(organizationId, id)
    if (!existing) {
      throw new DomainError(`Floor rule not found: ${id}`, "NOT_FOUND")
    }

    const name = input.name != null ? input.name.trim() : existing.name
    if (!name) {
      throw new DomainError("Floor rule name is required", "VALIDATION")
    }

    const minAmount =
      input.minAmount !== undefined
        ? emptyToNull(input.minAmount)
        : existing.minAmount
    const minPct =
      input.minPct !== undefined ? emptyToNull(input.minPct) : existing.minPct
    validateThresholds(minAmount, minPct)

    const [row] = await this.db
      .update(marginFloorRules)
      .set({
        name,
        customer:
          input.customer !== undefined
            ? emptyToNull(input.customer)
            : existing.customer,
        minAmount,
        minPct,
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
          eq(marginFloorRules.id, id),
          eq(marginFloorRules.organizationId, organizationId)
        )
      )
      .returning()

    if (!row) {
      throw new DomainError(`Floor rule not found: ${id}`, "NOT_FOUND")
    }
    return toView(row)
  }

  async delete(organizationId: string, id: string): Promise<void> {
    const deleted = await this.db
      .delete(marginFloorRules)
      .where(
        and(
          eq(marginFloorRules.id, id),
          eq(marginFloorRules.organizationId, organizationId)
        )
      )
      .returning({ id: marginFloorRules.id })

    if (deleted.length === 0) {
      throw new DomainError(`Floor rule not found: ${id}`, "NOT_FOUND")
    }
  }
}
