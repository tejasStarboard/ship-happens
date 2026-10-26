import { and, eq } from "drizzle-orm"
import {
  emailIntegrations,
  emailIntakeMessages,
  type Database,
} from "@workspace/db"

export type AppDb = Database

export class EmailIntegrationRepository {
  constructor(private readonly db: AppDb) {}

  listByOrganization(organizationId: string) {
    return this.db
      .select({
        id: emailIntegrations.id,
        provider: emailIntegrations.provider,
        accountEmail: emailIntegrations.accountEmail,
        status: emailIntegrations.status,
        watchExpiresAt: emailIntegrations.watchExpiresAt,
        lastError: emailIntegrations.lastError,
        updatedAt: emailIntegrations.updatedAt,
        connectedByUserId: emailIntegrations.connectedByUserId,
      })
      .from(emailIntegrations)
      .where(eq(emailIntegrations.organizationId, organizationId))
  }

  findByOrgAndProvider(organizationId: string, provider: "gmail" | "outlook") {
    return this.db
      .select()
      .from(emailIntegrations)
      .where(
        and(
          eq(emailIntegrations.organizationId, organizationId),
          eq(emailIntegrations.provider, provider)
        )
      )
      .limit(1)
      .then((rows) => rows[0] ?? null)
  }

  findById(id: string) {
    return this.db
      .select()
      .from(emailIntegrations)
      .where(eq(emailIntegrations.id, id))
      .limit(1)
      .then((rows) => rows[0] ?? null)
  }

  findByAccountEmail(accountEmail: string, provider: "gmail" | "outlook") {
    return this.db
      .select()
      .from(emailIntegrations)
      .where(
        and(
          eq(emailIntegrations.accountEmail, accountEmail.toLowerCase()),
          eq(emailIntegrations.provider, provider),
          eq(emailIntegrations.status, "active")
        )
      )
      .limit(1)
      .then((rows) => rows[0] ?? null)
  }

  findByExternalSubscriptionId(subscriptionId: string) {
    return this.db
      .select()
      .from(emailIntegrations)
      .where(eq(emailIntegrations.externalSubscriptionId, subscriptionId))
      .limit(1)
      .then((rows) => rows[0] ?? null)
  }

  async upsert(row: typeof emailIntegrations.$inferInsert) {
    const existing = await this.findByOrgAndProvider(
      row.organizationId,
      row.provider
    )
    if (existing) {
      await this.db
        .update(emailIntegrations)
        .set({
          ...row,
          id: existing.id,
          updatedAt: new Date(),
        })
        .where(eq(emailIntegrations.id, existing.id))
      return existing.id
    }
    await this.db.insert(emailIntegrations).values(row)
    return row.id
  }

  async markError(id: string, lastError: string) {
    await this.db
      .update(emailIntegrations)
      .set({ status: "error", lastError, updatedAt: new Date() })
      .where(eq(emailIntegrations.id, id))
  }

  async disconnect(id: string) {
    await this.db
      .update(emailIntegrations)
      .set({
        status: "disconnected",
        accessTokenEnc: "",
        refreshTokenEnc: null,
        externalSubscriptionId: null,
        historyId: null,
        lastError: null,
        updatedAt: new Date(),
      })
      .where(eq(emailIntegrations.id, id))
  }

  async updateTokens(
    id: string,
    input: {
      accessTokenEnc?: string
      refreshTokenEnc?: string | null
      tokenExpiresAt?: Date | null
      historyId?: string | null
      externalSubscriptionId?: string | null
      watchExpiresAt?: Date | null
      status?: "active" | "error" | "disconnected"
      lastError?: string | null
    }
  ) {
    await this.db
      .update(emailIntegrations)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(emailIntegrations.id, id))
  }

  findIntakeByProviderMessage(
    integrationId: string,
    providerMessageId: string
  ) {
    return this.db
      .select()
      .from(emailIntakeMessages)
      .where(
        and(
          eq(emailIntakeMessages.integrationId, integrationId),
          eq(emailIntakeMessages.providerMessageId, providerMessageId)
        )
      )
      .limit(1)
      .then((rows) => rows[0] ?? null)
  }

  async insertIntake(row: typeof emailIntakeMessages.$inferInsert) {
    await this.db.insert(emailIntakeMessages).values(row)
  }

  async updateIntake(
    id: string,
    patch: Partial<typeof emailIntakeMessages.$inferInsert>
  ) {
    await this.db
      .update(emailIntakeMessages)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(emailIntakeMessages.id, id))
  }
}
