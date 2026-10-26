import { describe, expect, it, vi } from "vitest"
import { DomainError } from "../errors"
import type { FillPipelineManager } from "../pipeline/fill-pipeline.manager"
import type {
  BlobStore,
  SourceBytesFetcher,
  WorkbookWritePort,
  WorkspaceHost,
} from "../ports"
import type { FillReportRepository } from "../rates/fill-report.repository"
import type { ReviewItemRepository } from "../review/review-item.repository"
import type { RfpRepository } from "../rfp/rfp.repository"
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
  pendingCount?: number
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

  const reviews = {
    countPending: vi.fn().mockResolvedValue(opts?.pendingCount ?? 0),
  } as unknown as ReviewItemRepository

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
  it("writes cells with refs, skips missing refs, uploads filled artifact", async () => {
    const { service, pipeline, blob, workbookWriter, rfps, workspace } =
      createService()

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
    expect(pipeline.completeStep).toHaveBeenCalledWith(
      "fill_1",
      "export",
      expect.stringContaining("Wrote 1 cell")
    )
    expect(result.writtenCount).toBe(1)
    expect(result.skippedMissingRef).toBe(1)
    expect(result.filledFileUrl).toBe("https://blob.example/filled.xlsx")
  })

  it("restores needs_review when pending reviews remain", async () => {
    const { service, pipeline } = createService({ pendingCount: 2 })
    await service.exportForFill({
      organizationId: "org_1",
      fillId: "fill_1",
    })
    expect(pipeline.setRfpStatus).toHaveBeenCalledWith("fill_1", "needs_review")
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
