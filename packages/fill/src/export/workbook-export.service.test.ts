import { describe, expect, it, vi } from "vitest"
import { DomainError } from "../errors"
import type { FillPipelineManager } from "../pipeline/fill-pipeline.manager"
import { PROGRESS_WAIT_DETAIL } from "../pipeline/fill-pipeline.manager"
import type {
  BlobStore,
  SourceBytesFetcher,
  WorkbookWritePort,
  WorkspaceHost,
} from "../ports"
import type { FillReportRepository } from "../rates/fill-report.repository"
import type { ReviewItemService } from "../review/review-item.service"
import type { RfpRepository } from "../rfp/rfp.repository"
import { EXPORT_SIGNOFF_REVIEW_SOURCE } from "./export-signoff"
import { WorkbookExportService } from "./workbook-export.service"

function fillRow() {
  return {
    id: "fill_1",
    organizationId: "org_1",
    name: "Test",
    customer: null,
    status: "running" as const,
    metadata: {},
    updatedAt: new Date(),
    templateName: null,
    ownerName: "user_1",
    ownerUserId: "user_1",
    filledFileUrl: null,
    errorMessage: null,
    startedAt: null,
    completedAt: null,
    createdAt: new Date(),
  }
}

function createService(opts?: {
  cells?: Awaited<ReturnType<FillReportRepository["listLaneCells"]>>
  pendingReviews?: Array<{
    id: string
    source: string | null
    status: string
  }>
  writer?: WorkbookWritePort["writeCells"]
}) {
  const rfps = {
    findByIdForOrganization: vi.fn().mockResolvedValue(fillRow()),
    listSourceFiles: vi.fn().mockResolvedValue([
      {
        id: "src_1",
        fileName: "bid.xlsx",
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        fileUrl: "https://blob.example/source.xlsx",
      },
    ]),
    updateFilledArtifact: vi.fn().mockResolvedValue(undefined),
  } as unknown as RfpRepository

  const pipeline = {
    startStep: vi.fn().mockResolvedValue(undefined),
    completeStep: vi.fn().mockResolvedValue(undefined),
    failStep: vi.fn().mockResolvedValue(undefined),
    appendLog: vi.fn().mockResolvedValue(undefined),
    setRfpStatus: vi.fn().mockResolvedValue(undefined),
    updateStep: vi.fn().mockResolvedValue(undefined),
  } as unknown as FillPipelineManager

  const reports = {
    listLaneCells: vi.fn().mockResolvedValue(
      opts?.cells ?? [
        {
          id: "fcel_1",
          sheetName: "Rates",
          cellRef: "D3",
          rowIndex: 2,
          columnKey: "ocean_freight",
          outcome: "filled",
          value: "1500",
          reason: null,
          metadata: {},
        },
        {
          id: "fcel_2",
          sheetName: "Rates",
          cellRef: null,
          rowIndex: 3,
          columnKey: "lane_2",
          outcome: "filled",
          value: "1600",
          reason: null,
          metadata: {},
        },
      ]
    ),
  } as unknown as FillReportRepository

  const pending =
    opts?.pendingReviews ??
    ([] as Array<{ id: string; source: string | null; status: string }>)

  const reviews = {
    list: vi
      .fn()
      .mockImplementation(
        async (_org: string, _fill: string, options?: { status?: string }) => {
          if (options?.status === "pending") {
            return pending.filter((row) => row.status === "pending")
          }
          return pending
        }
      ),
    create: vi.fn().mockResolvedValue({ id: "rev_signoff" }),
    update: vi.fn().mockResolvedValue({ id: "rev_signoff" }),
  } as unknown as ReviewItemService

  const blob: BlobStore = {
    upload: vi.fn().mockResolvedValue({
      url: "https://blob.example/filled.xlsx",
      pathname: "fills/org_1/fill_1/filled-bid.xlsx",
    }),
    delete: vi.fn(),
  }

  const workbookWriter: WorkbookWritePort = {
    writeCells:
      opts?.writer ?? vi.fn().mockResolvedValue(Buffer.from("filled-bytes")),
  }

  const sourceFetcher: SourceBytesFetcher = {
    fetch: vi.fn().mockResolvedValue(Buffer.from("source-bytes")),
  }

  const workspace: WorkspaceHost = {
    ensureRfpWorkspace: vi.fn(),
    writeWorkspaceFile: vi.fn().mockResolvedValue(undefined),
  }

  const service = new WorkbookExportService(
    rfps,
    pipeline,
    reports,
    reviews,
    blob,
    workbookWriter,
    sourceFetcher,
    workspace
  )

  return { service, rfps, pipeline, blob, workbookWriter, workspace, reviews }
}

describe("WorkbookExportService", () => {
  it("writes cells, uploads artifact, opens final sign-off (no completeStep)", async () => {
    const {
      service,
      pipeline,
      blob,
      workbookWriter,
      rfps,
      workspace,
      reviews,
    } = createService()

    const result = await service.exportForFill({
      organizationId: "org_1",
      fillId: "fill_1",
    })

    expect(workbookWriter.writeCells).toHaveBeenCalledWith({
      source: Buffer.from("source-bytes"),
      fileName: "bid.xlsx",
      cells: [{ sheetName: "Rates", cellRef: "D3", value: "1500" }],
    })
    expect(blob.upload).toHaveBeenCalled()
    expect(rfps.updateFilledArtifact).toHaveBeenCalledWith("fill_1", {
      filledFileUrl: "https://blob.example/filled.xlsx",
      filledBlobPathname: "fills/org_1/fill_1/filled-bid.xlsx",
    })
    expect(workspace.writeWorkspaceFile).toHaveBeenCalledWith(
      "fill_1",
      "filled/filled-bid.xlsx",
      Buffer.from("filled-bytes")
    )
    expect(pipeline.completeStep).not.toHaveBeenCalled()
    expect(reviews.create).toHaveBeenCalledWith(
      "org_1",
      "fill_1",
      expect.objectContaining({
        title: "Final export sign-off",
        stepKey: "export",
        source: EXPORT_SIGNOFF_REVIEW_SOURCE,
      })
    )
    expect(pipeline.updateStep).toHaveBeenCalledWith(
      "fill_1",
      "review",
      "running",
      PROGRESS_WAIT_DETAIL
    )
    expect(result.writtenCount).toBe(1)
    expect(result.skippedMissingRef).toBe(1)
    expect(result.filledFileUrl).toBe("https://blob.example/filled.xlsx")
    expect(result.detail).toContain("awaiting final export sign-off")
  })

  it("refreshes an existing pending export sign-off", async () => {
    const { service, reviews } = createService({
      pendingReviews: [
        {
          id: "rev_existing",
          source: EXPORT_SIGNOFF_REVIEW_SOURCE,
          status: "pending",
        },
      ],
    })

    await service.exportForFill({
      organizationId: "org_1",
      fillId: "fill_1",
    })

    expect(reviews.update).toHaveBeenCalledWith(
      "org_1",
      "fill_1",
      "rev_existing",
      expect.objectContaining({
        title: "Final export sign-off",
        stepKey: "export",
      })
    )
    expect(reviews.create).not.toHaveBeenCalled()
  })

  it("fails the export step when the writer throws", async () => {
    const { service, pipeline } = createService({
      writer: vi.fn().mockRejectedValue(new Error("agent-xlsx failed")),
    })
    await expect(
      service.exportForFill({ organizationId: "org_1", fillId: "fill_1" })
    ).rejects.toBeInstanceOf(DomainError)
    expect(pipeline.failStep).toHaveBeenCalledWith(
      "fill_1",
      "export",
      "agent-xlsx failed"
    )
  })
})
