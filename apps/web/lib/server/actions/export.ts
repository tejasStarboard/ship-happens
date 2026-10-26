"use server"

import { requireOrgSession } from "@/lib/auth/session"
import { createAppContext } from "@/lib/di/create-app-context"

/**
 * Thin server-action adapter for Overview export.
 * Write-back logic lives in WorkbookExportService (agent-xlsx port).
 */
export async function exportFillWorkbookAction(fillId: string) {
  const { organizationId } = await requireOrgSession()
  const ctx = createAppContext()
  return ctx.exportWorkbook.exportForFill({
    organizationId,
    fillId,
  })
}
