import { DomainError } from "../errors"
import {
  PROGRESS_WAIT_DETAIL,
  type FillPipelineManager,
} from "../pipeline/fill-pipeline.manager"
import type {
  BlobStore,
  SourceBytesFetcher,
  WorkbookWritePort,
  WorkspaceHost,
} from "../ports"
import type { FillReportRepository } from "../rates/fill-report.repository"
import type { ReviewItemService } from "../review/review-item.service"
import type { RfpRepository } from "../rfp/rfp.repository"
import { extensionForMime, sanitizeFileName } from "../spreadsheet-constants"
import {
  EXPORT_SIGNOFF_REVIEW_SOURCE,
  EXPORT_SIGNOFF_TITLE,
} from "./export-signoff"
import { selectExportCells } from "./select-export-cells"

export type ExportWorkbookResult = {
  fillId: string
  filledFileUrl: string
  filledBlobPathname: string
  writtenCount: number
  skippedMissingRef: number
  skippedOther: number
  pendingReviewCount: number
  detail: string
}

export class WorkbookExportService {
  constructor(
    private readonly rfps: RfpRepository,
    private readonly pipeline: FillPipelineManager,
    private readonly reports: FillReportRepository,
    private readonly reviews: ReviewItemService,
    private readonly blob: BlobStore,
    private readonly workbookWriter: WorkbookWritePort,
    private readonly sourceFetcher: SourceBytesFetcher,
    private readonly workspace: WorkspaceHost
  ) {}

  async exportForFill(input: {
    organizationId: string
    fillId: string
  }): Promise<ExportWorkbookResult> {
    const fill = await this.rfps.findByIdForOrganization(
      input.organizationId,
      input.fillId
    )
    if (!fill) {
      throw new DomainError(`Fill not found: ${input.fillId}`, "NOT_FOUND")
    }

    const sources = await this.rfps.listSourceFiles(input.fillId)
    const source = sources[0]
    if (!source) {
      throw new DomainError("No source workbook for this fill", "VALIDATION")
    }

    const cells = await this.reports.listLaneCells(input.fillId)
    const plan = selectExportCells(cells)

    await this.pipeline.startStep(
      input.fillId,
      "export",
      plan.writes.length === 0
        ? "No writable cells (check filled outcomes + cell refs)"
        : `Writing ${plan.writes.length} cell(s) into original template`
    )

    try {
      const sourceBytes = await this.sourceFetcher.fetch(source.fileUrl)
      if (sourceBytes.byteLength === 0) {
        throw new DomainError("Source workbook is empty", "VALIDATION")
      }

      const filledBytes =
        plan.writes.length === 0
          ? sourceBytes
          : await this.workbookWriter.writeCells({
              source: sourceBytes,
              fileName: source.fileName,
              cells: plan.writes,
            })

      const safeName =
        sanitizeFileName(source.fileName) ||
        `workbook${extensionForMime(source.mimeType, source.fileName)}`
      const filledName = safeName.toLowerCase().startsWith("filled-")
        ? safeName
        : `filled-${safeName}`

      const uploaded = await this.blob.upload({
        pathname: `fills/${input.organizationId}/${input.fillId}/${filledName}`,
        body: filledBytes,
        contentType: source.mimeType,
        addRandomSuffix: true,
      })

      await this.rfps.updateFilledArtifact(input.fillId, {
        filledFileUrl: uploaded.url,
        filledBlobPathname: uploaded.pathname,
      })

      try {
        await this.workspace.writeWorkspaceFile(
          input.fillId,
          `filled/${filledName}`,
          filledBytes
        )
      } catch (error) {
        await this.pipeline.appendLog({
          rfpId: input.fillId,
          stepKey: "export",
          source: "export",
          level: "warn",
          message:
            error instanceof Error
              ? `Filled Blob saved but workspace mirror failed: ${error.message}`
              : "Filled Blob saved but workspace mirror failed",
        })
      }

      const writeDetail = [
        `Wrote ${plan.writes.length} cell(s)`,
        plan.skippedMissingRef > 0
          ? `${plan.skippedMissingRef} skipped (missing sheet/cell ref)`
          : null,
        plan.skippedOther > 0
          ? `${plan.skippedOther} non-filled outcome(s)`
          : null,
      ]
        .filter(Boolean)
        .join("; ")

      await this.pipeline.appendLog({
        rfpId: input.fillId,
        stepKey: "export",
        source: "export",
        message: writeDetail,
        metadata: {
          writtenCount: plan.writes.length,
          skippedMissingRef: plan.skippedMissingRef,
          skippedOther: plan.skippedOther,
          filledBlobPathname: uploaded.pathname,
        },
      })

      await this.openOrRefreshSignoff({
        organizationId: input.organizationId,
        fillId: input.fillId,
        writtenCount: plan.writes.length,
        skippedMissingRef: plan.skippedMissingRef,
        skippedOther: plan.skippedOther,
        filledBlobPathname: uploaded.pathname,
      })

      // Hold Progress export + review until Confirm; do not completeStep yet.
      await this.pipeline.updateStep(
        input.fillId,
        "review",
        "running",
        PROGRESS_WAIT_DETAIL
      )

      const pendingReviewCount = await this.reviews
        .list(input.organizationId, input.fillId, { status: "pending" })
        .then((rows) => rows.length)

      const detail = `${writeDetail}; awaiting final export sign-off`

      return {
        fillId: input.fillId,
        filledFileUrl: uploaded.url,
        filledBlobPathname: uploaded.pathname,
        writtenCount: plan.writes.length,
        skippedMissingRef: plan.skippedMissingRef,
        skippedOther: plan.skippedOther,
        pendingReviewCount,
        detail,
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Workbook export failed"
      await this.pipeline.failStep(input.fillId, "export", message)
      throw error instanceof DomainError
        ? error
        : new DomainError(message, "VALIDATION")
    }
  }

  private async openOrRefreshSignoff(input: {
    organizationId: string
    fillId: string
    writtenCount: number
    skippedMissingRef: number
    skippedOther: number
    filledBlobPathname: string
  }) {
    const summary = [
      `${input.writtenCount} lane(s) filled`,
      input.skippedMissingRef > 0
        ? `${input.skippedMissingRef} missing sheet/cell ref`
        : null,
      input.skippedOther > 0
        ? `${input.skippedOther} skipped / needs human / error`
        : null,
    ]
      .filter(Boolean)
      .join("; ")

    const proposal = {
      kind: EXPORT_SIGNOFF_REVIEW_SOURCE,
      summary: `Export readiness: ${summary}. Confirm to unlock download.`,
      writtenCount: input.writtenCount,
      skippedMissingRef: input.skippedMissingRef,
      skippedOther: input.skippedOther,
      filledBlobPathname: input.filledBlobPathname,
    }
    const sourceMetadata = {
      kind: EXPORT_SIGNOFF_REVIEW_SOURCE,
      filledBlobPathname: input.filledBlobPathname,
    }

    const pending = (
      await this.reviews.list(input.organizationId, input.fillId, {
        status: "pending",
      })
    ).find((row) => row.source === EXPORT_SIGNOFF_REVIEW_SOURCE)

    if (pending) {
      await this.reviews.update(
        input.organizationId,
        input.fillId,
        pending.id,
        {
          title: EXPORT_SIGNOFF_TITLE,
          stepKey: "export",
          proposal,
          sourceMetadata,
        }
      )
      return
    }

    await this.reviews.create(input.organizationId, input.fillId, {
      title: EXPORT_SIGNOFF_TITLE,
      stepKey: "export",
      source: EXPORT_SIGNOFF_REVIEW_SOURCE,
      proposal,
      sourceMetadata,
    })
  }
}
