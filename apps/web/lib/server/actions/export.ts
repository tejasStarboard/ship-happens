"use server"

import {
  domainErrorMessage,
  parseUnexpectedFeeSoftWarn,
  type UnexpectedFeeWarningPayload,
} from "@ship-happens/fill/browser"
import { requireOrgSession } from "@/lib/auth/session"
import { createAppContext } from "@/lib/di/create-app-context"

export type ExportFillWorkbookResult =
  | {
      ok: true
      detail: string
      writtenCount: number
      pendingReviewCount: number
      unexpectedFeeWarning: UnexpectedFeeWarningPayload | null
    }
  | {
      ok: false
      softWarn: UnexpectedFeeWarningPayload
    }
  | {
      ok: false
      error: string
    }

/**
 * Thin server-action adapter for Overview export.
 * Write-back logic lives in WorkbookExportService (agent-xlsx port).
 */
export async function exportFillWorkbookAction(
  fillId: string,
  options?: { acknowledgeUnexpectedFees?: boolean }
): Promise<ExportFillWorkbookResult> {
  const { organizationId } = await requireOrgSession()
  const ctx = createAppContext()
  try {
    const result = await ctx.exportWorkbook.exportForFill({
      organizationId,
      fillId,
      acknowledgeUnexpectedFees: options?.acknowledgeUnexpectedFees === true,
    })
    return {
      ok: true,
      detail: result.detail,
      writtenCount: result.writtenCount,
      pendingReviewCount: result.pendingReviewCount,
      unexpectedFeeWarning: result.unexpectedFeeWarning,
    }
  } catch (error) {
    const message = domainErrorMessage(error, "Export failed")
    const softWarn = parseUnexpectedFeeSoftWarn(message)
    if (softWarn) {
      return { ok: false, softWarn }
    }
    return { ok: false, error: message }
  }
}
