"use server"

import { requireOrgSession } from "@/lib/auth/session"
import { createAppContext } from "@/lib/di/create-app-context"
import type {
  SpreadsheetUploadInput,
  TemplateUploadInput,
} from "@/lib/domain/rfp/intake.service"

/**
 * Thin server-action adapters. Business logic lives in IntakeService.
 */
export async function createFill(data: SpreadsheetUploadInput) {
  const { organizationId, session } = await requireOrgSession()
  const ctx = createAppContext()
  return ctx.intake.createFill(organizationId, session.user.id, data)
}

export async function createFillFromTemplate(input: {
  templateId: string
  name?: string
  customer?: string
}) {
  const { organizationId, session } = await requireOrgSession()
  const ctx = createAppContext()
  return ctx.intake.createFillFromTemplate(
    organizationId,
    session.user.id,
    input
  )
}

export async function uploadTemplate(data: TemplateUploadInput) {
  const { organizationId, session } = await requireOrgSession()
  const ctx = createAppContext()
  return ctx.intake.uploadTemplate(organizationId, session.user.id, data)
}
