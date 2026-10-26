import { randomUUID } from "node:crypto"
import type { IntakeService } from "@ship-happens/fill"
import { DomainError } from "@/lib/domain/errors"
import { classifyEmailAsBcoSheet } from "@/lib/jev/classify-email"
import { isJevConfigured } from "@/lib/jev/client"
import {
  EmailIntegrationRepository,
  type AppDb,
} from "./email-integration.repository"
import { decryptSecret, encryptSecret } from "./token-crypto"
import {
  downloadGmailAttachment,
  fetchGmailMessage,
  GMAIL_SCOPES,
  listGmailHistoryMessageIds,
  refreshGmailAccessToken,
  startGmailWatch,
} from "./gmail-client"
import {
  createOutlookSubscription,
  fetchOutlookMessage,
  OUTLOOK_SCOPES,
  refreshOutlookAccessToken,
  renewOutlookSubscription,
} from "./outlook-client"
import { spreadsheetMimeFromName } from "./mime"
import type { IntegrationPublicView } from "./email-intake.types"

export type { IntegrationPublicView } from "./email-intake.types"

function integrationId() {
  return `emlint_${randomUUID().replaceAll("-", "").slice(0, 20)}`
}

function intakeMessageId() {
  return `emlmsg_${randomUUID().replaceAll("-", "").slice(0, 20)}`
}

export class EmailIntakeService {
  constructor(
    private readonly db: AppDb,
    private readonly repo: EmailIntegrationRepository,
    private readonly intake: IntakeService
  ) {}

  async listIntegrations(
    organizationId: string
  ): Promise<IntegrationPublicView[]> {
    const rows = await this.repo.listByOrganization(organizationId)
    return rows.map((row) => ({
      id: row.id,
      provider: row.provider,
      accountEmail: row.accountEmail,
      status: row.status,
      watchExpiresAt: row.watchExpiresAt?.toISOString() ?? null,
      lastError: row.lastError,
      updatedAt: row.updatedAt.toISOString(),
    }))
  }

  async completeGmailConnect(input: {
    organizationId: string
    userId: string
    accessToken: string
    refreshToken: string | null
    expiresIn: number
    email: string
  }) {
    let historyId: string | null = null
    let watchExpiresAt: Date | null = null
    try {
      const watch = await startGmailWatch(input.accessToken)
      historyId = watch.historyId
      watchExpiresAt = watch.expiration
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Gmail watch failed"
      // Still save tokens so reconnect/watch can be retried
      const id = await this.repo.upsert({
        id: integrationId(),
        organizationId: input.organizationId,
        provider: "gmail",
        accountEmail: input.email,
        accessTokenEnc: encryptSecret(input.accessToken),
        refreshTokenEnc: input.refreshToken
          ? encryptSecret(input.refreshToken)
          : null,
        tokenExpiresAt: new Date(Date.now() + input.expiresIn * 1000),
        scopes: GMAIL_SCOPES,
        status: "error",
        connectedByUserId: input.userId,
        lastError: message,
        historyId: null,
        watchExpiresAt: null,
        externalSubscriptionId: null,
      })
      void id
      throw new DomainError(message, "VALIDATION")
    }

    await this.repo.upsert({
      id: integrationId(),
      organizationId: input.organizationId,
      provider: "gmail",
      accountEmail: input.email,
      accessTokenEnc: encryptSecret(input.accessToken),
      refreshTokenEnc: input.refreshToken
        ? encryptSecret(input.refreshToken)
        : null,
      tokenExpiresAt: new Date(Date.now() + input.expiresIn * 1000),
      scopes: GMAIL_SCOPES,
      status: "active",
      connectedByUserId: input.userId,
      lastError: null,
      historyId,
      watchExpiresAt,
      externalSubscriptionId: historyId,
    })
  }

  async completeOutlookConnect(input: {
    organizationId: string
    userId: string
    accessToken: string
    refreshToken: string | null
    expiresIn: number
    email: string
  }) {
    let subscriptionId: string | null = null
    let watchExpiresAt: Date | null = null
    try {
      const sub = await createOutlookSubscription(input.accessToken)
      subscriptionId = sub.id
      watchExpiresAt = new Date(sub.expirationDateTime)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Outlook subscription failed"
      await this.repo.upsert({
        id: integrationId(),
        organizationId: input.organizationId,
        provider: "outlook",
        accountEmail: input.email,
        accessTokenEnc: encryptSecret(input.accessToken),
        refreshTokenEnc: input.refreshToken
          ? encryptSecret(input.refreshToken)
          : null,
        tokenExpiresAt: new Date(Date.now() + input.expiresIn * 1000),
        scopes: OUTLOOK_SCOPES,
        status: "error",
        connectedByUserId: input.userId,
        lastError: message,
        historyId: null,
        watchExpiresAt: null,
        externalSubscriptionId: null,
      })
      throw new DomainError(message, "VALIDATION")
    }

    await this.repo.upsert({
      id: integrationId(),
      organizationId: input.organizationId,
      provider: "outlook",
      accountEmail: input.email,
      accessTokenEnc: encryptSecret(input.accessToken),
      refreshTokenEnc: input.refreshToken
        ? encryptSecret(input.refreshToken)
        : null,
      tokenExpiresAt: new Date(Date.now() + input.expiresIn * 1000),
      scopes: OUTLOOK_SCOPES,
      status: "active",
      connectedByUserId: input.userId,
      lastError: null,
      historyId: null,
      watchExpiresAt,
      externalSubscriptionId: subscriptionId,
    })
  }

  async disconnect(organizationId: string, provider: "gmail" | "outlook") {
    const row = await this.repo.findByOrgAndProvider(organizationId, provider)
    if (!row) {
      throw new DomainError("Integration not found", "NOT_FOUND")
    }
    await this.repo.disconnect(row.id)
  }

  private async ensureAccessToken(integrationId: string): Promise<{
    accessToken: string
    row: NonNullable<
      Awaited<ReturnType<EmailIntegrationRepository["findById"]>>
    >
  }> {
    const row = await this.repo.findById(integrationId)
    if (!row || row.status === "disconnected") {
      throw new DomainError("Integration not found", "NOT_FOUND")
    }
    const expiresSoon =
      row.tokenExpiresAt && row.tokenExpiresAt.getTime() < Date.now() + 60_000
    if (!expiresSoon && row.accessTokenEnc) {
      return { accessToken: decryptSecret(row.accessTokenEnc), row }
    }
    if (!row.refreshTokenEnc) {
      await this.repo.markError(
        row.id,
        "Access token expired; reconnect required"
      )
      throw new DomainError(
        "Mailbox token expired — reconnect the integration",
        "UNAUTHORIZED"
      )
    }
    const refresh = decryptSecret(row.refreshTokenEnc)
    if (row.provider === "gmail") {
      const next = await refreshGmailAccessToken(refresh)
      const accessTokenEnc = encryptSecret(next.accessToken)
      await this.repo.updateTokens(row.id, {
        accessTokenEnc,
        tokenExpiresAt: new Date(Date.now() + next.expiresIn * 1000),
        status: "active",
        lastError: null,
      })
      return {
        accessToken: next.accessToken,
        row: { ...row, accessTokenEnc },
      }
    }
    const next = await refreshOutlookAccessToken(refresh)
    const accessTokenEnc = encryptSecret(next.accessToken)
    await this.repo.updateTokens(row.id, {
      accessTokenEnc,
      refreshTokenEnc: next.refreshToken
        ? encryptSecret(next.refreshToken)
        : undefined,
      tokenExpiresAt: new Date(Date.now() + next.expiresIn * 1000),
      status: "active",
      lastError: null,
    })
    return {
      accessToken: next.accessToken,
      row: { ...row, accessTokenEnc },
    }
  }

  /** Lazy renew Graph subscription if within 12h of expiry. */
  async maybeRenewOutlookWatch(integrationId: string) {
    const { accessToken, row } = await this.ensureAccessToken(integrationId)
    if (row.provider !== "outlook" || !row.externalSubscriptionId) return
    const expires = row.watchExpiresAt?.getTime() ?? 0
    if (expires > Date.now() + 12 * 60 * 60 * 1000) return
    const renewed = await renewOutlookSubscription(
      accessToken,
      row.externalSubscriptionId
    )
    await this.repo.updateTokens(row.id, {
      watchExpiresAt: new Date(renewed.expirationDateTime),
    })
  }

  async processGmailPubSub(emailAddress: string, historyId: string) {
    const integration = await this.repo.findByAccountEmail(
      emailAddress,
      "gmail"
    )
    if (!integration) {
      throw new DomainError(
        `No active Gmail integration for ${emailAddress}`,
        "NOT_FOUND"
      )
    }
    const { accessToken, row } = await this.ensureAccessToken(integration.id)
    const startId = row.historyId || historyId
    const { messageIds, latestHistoryId } = await listGmailHistoryMessageIds(
      accessToken,
      startId
    )
    await this.repo.updateTokens(row.id, { historyId: latestHistoryId })

    // Renew watch when near expiry
    if (
      !row.watchExpiresAt ||
      row.watchExpiresAt.getTime() < Date.now() + 24 * 60 * 60 * 1000
    ) {
      try {
        const watch = await startGmailWatch(accessToken)
        await this.repo.updateTokens(row.id, {
          historyId: watch.historyId,
          watchExpiresAt: watch.expiration,
          externalSubscriptionId: watch.historyId,
        })
      } catch {
        // non-fatal; message processing continues
      }
    }

    for (const messageId of messageIds) {
      await this.processGmailMessage(row.id, messageId)
    }
  }

  async processGmailMessage(integrationId: string, messageId: string) {
    const existing = await this.repo.findIntakeByProviderMessage(
      integrationId,
      messageId
    )
    if (existing) return { skipped: true as const, reason: "duplicate" }

    const { accessToken, row } = await this.ensureAccessToken(integrationId)
    const message = await fetchGmailMessage(accessToken, messageId)
    const intakeRowId = intakeMessageId()
    await this.repo.insertIntake({
      id: intakeRowId,
      organizationId: row.organizationId,
      integrationId: row.id,
      providerMessageId: message.id,
      threadId: message.threadId,
      subject: message.subject,
      fromAddress: message.from,
      receivedAt: message.receivedAt,
      status: "pending",
      attachmentSummary: message.attachments.map((a) => ({
        fileName: a.fileName,
        mimeType: a.mimeType,
        sizeBytes: a.sizeBytes,
      })),
    })

    return this.finishMessage({
      intakeRowId,
      organizationId: row.organizationId,
      ownerUserId: row.connectedByUserId,
      provider: "gmail",
      messageId: message.id,
      threadId: message.threadId,
      subject: message.subject,
      from: message.from,
      bodyText: message.bodyText,
      receivedAt: message.receivedAt,
      attachments: await Promise.all(
        message.attachments.map(async (a) => {
          const mime = spreadsheetMimeFromName(a.fileName, a.mimeType)
          if (!mime) return null
          const buffer = await downloadGmailAttachment(
            accessToken,
            message.id,
            a.attachmentId
          )
          return {
            fileName: a.fileName,
            contentType: mime,
            base64: buffer.toString("base64"),
          }
        })
      ),
    })
  }

  async processOutlookNotification(input: {
    subscriptionId: string
    messageId: string
  }) {
    const integration = await this.repo.findByExternalSubscriptionId(
      input.subscriptionId
    )
    if (!integration || integration.provider !== "outlook") {
      throw new DomainError(
        "No active Outlook integration for subscription",
        "NOT_FOUND"
      )
    }
    await this.maybeRenewOutlookWatch(integration.id)

    const existing = await this.repo.findIntakeByProviderMessage(
      integration.id,
      input.messageId
    )
    if (existing) return { skipped: true as const, reason: "duplicate" }

    const { accessToken, row } = await this.ensureAccessToken(integration.id)
    const message = await fetchOutlookMessage(accessToken, input.messageId)
    const intakeRowId = intakeMessageId()
    await this.repo.insertIntake({
      id: intakeRowId,
      organizationId: row.organizationId,
      integrationId: row.id,
      providerMessageId: message.id,
      threadId: message.conversationId,
      subject: message.subject,
      fromAddress: message.from,
      receivedAt: message.receivedAt,
      status: "pending",
      attachmentSummary: message.attachments.map((a) => ({
        fileName: a.fileName,
        mimeType: a.mimeType,
        sizeBytes: a.sizeBytes,
      })),
    })

    return this.finishMessage({
      intakeRowId,
      organizationId: row.organizationId,
      ownerUserId: row.connectedByUserId,
      provider: "outlook",
      messageId: message.id,
      threadId: message.conversationId,
      subject: message.subject,
      from: message.from,
      bodyText: message.bodyText,
      receivedAt: message.receivedAt,
      attachments: message.attachments
        .map((a) => {
          const mime = spreadsheetMimeFromName(a.fileName, a.mimeType)
          if (!mime || !a.contentBytes) return null
          return {
            fileName: a.fileName,
            contentType: mime,
            base64: a.contentBytes,
          }
        })
        .filter((a): a is NonNullable<typeof a> => a != null),
    })
  }

  private async finishMessage(input: {
    intakeRowId: string
    organizationId: string
    ownerUserId: string
    provider: "gmail" | "outlook"
    messageId: string
    threadId: string
    subject: string
    from: string
    bodyText: string
    receivedAt: Date | null
    attachments: Array<{
      fileName: string
      contentType:
        | "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        | "application/vnd.ms-excel"
        | "text/csv"
        | "application/csv"
      base64: string
    } | null>
  }) {
    const sheets = input.attachments.filter(
      (a): a is NonNullable<typeof a> => a != null
    )

    if (!isJevConfigured()) {
      await this.repo.updateIntake(input.intakeRowId, {
        status: "failed",
        errorMessage: "JEV_API_KEY is not configured",
      })
      throw new DomainError("JEV_API_KEY is not configured", "VALIDATION")
    }

    let classification
    try {
      classification = await classifyEmailAsBcoSheet({
        subject: input.subject,
        from: input.from,
        bodyText: input.bodyText,
        attachmentNames: sheets.map((s) => s.fileName),
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Jev classification failed"
      await this.repo.updateIntake(input.intakeRowId, {
        status: "failed",
        errorMessage: message,
      })
      throw new DomainError(message, "VALIDATION")
    }

    await this.repo.updateIntake(input.intakeRowId, {
      classification: classification.classification,
      classificationConfidence: String(classification.confidence),
      jevRaw: classification.raw,
    })

    if (!classification.shouldIngest) {
      await this.repo.updateIntake(input.intakeRowId, {
        status: "skipped",
        errorMessage: "Classified as not relevant for BCO/RFP intake",
      })
      return { skipped: true as const, reason: "not_relevant" as const }
    }

    if (sheets.length === 0) {
      await this.repo.updateIntake(input.intakeRowId, {
        status: "unsupported",
        errorMessage: "Relevant email but no spreadsheet attachment",
      })
      return { skipped: true as const, reason: "no_spreadsheet" as const }
    }

    const sheet = sheets[0]!
    const fillName =
      input.subject.trim().slice(0, 180) || sheet.fileName.slice(0, 180)

    try {
      const { id: fillId } = await this.intake.createFill(
        input.organizationId,
        input.ownerUserId,
        {
          fileName: sheet.fileName,
          contentType: sheet.contentType,
          base64: sheet.base64,
          name: fillName,
          customer: input.from.slice(0, 200) || undefined,
          email: {
            provider: input.provider,
            messageId: input.messageId,
            threadId: input.threadId,
            from: input.from,
            subject: input.subject,
            receivedAt: input.receivedAt?.toISOString(),
          },
        }
      )
      await this.repo.updateIntake(input.intakeRowId, {
        status: "created",
        fillId,
        errorMessage: null,
      })
      return { skipped: false as const, fillId }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "createFill failed"
      await this.repo.updateIntake(input.intakeRowId, {
        status: "failed",
        errorMessage: message,
      })
      throw error
    }
  }
}
