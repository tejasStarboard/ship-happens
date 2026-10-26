import { describe, expect, it, vi } from "vitest"
import { DomainError } from "../errors"
import type { FillPipelineManager } from "../pipeline/fill-pipeline.manager"
import type { RfpRepository } from "../rfp/rfp.repository"
import type { FillReportRepository } from "./fill-report.repository"
import type { MappedLane } from "./mapped-lane"
import type { MappingStore, StarboardRatesPort } from "./rate-ports"
import { RateResolutionService } from "./rate-resolution.service"

const lane: MappedLane = {
  laneId: "lane_1",
  originLocode: "CNSHA",
  destLocode: "USLAX",
  equipmentType: "40HC",
  sheetName: "Rates",
  rowIndex: 2,
  columnKey: "ocean_freight",
}

function fillRow() {
  return {
    id: "fill_1",
    organizationId: "org_1",
    name: "Test",
    customer: null,
    status: "queued" as const,
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

function createService(opts: {
  lanes?: MappedLane[]
  resolve?: StarboardRatesPort["resolve"]
  mappingError?: Error
  pendingMapReviews?: number
}) {
  const rfps = {
    findByIdForOrganization: vi.fn().mockResolvedValue(fillRow()),
  } as unknown as RfpRepository

  const pipeline = {
    startStep: vi.fn().mockResolvedValue(undefined),
    completeStep: vi.fn().mockResolvedValue(undefined),
    failStep: vi.fn().mockResolvedValue(undefined),
    appendLog: vi.fn().mockResolvedValue(undefined),
  } as unknown as FillPipelineManager

  const reports = {
    replaceLaneCells: vi.fn().mockResolvedValue({
      reportId: "frpt_1",
      filledCount: 0,
      skippedCount: 0,
      needsHumanCount: 0,
      errorCount: 0,
    }),
  } as unknown as FillReportRepository

  const mapping: MappingStore = {
    readMappedLanes: opts.mappingError
      ? vi.fn().mockRejectedValue(opts.mappingError)
      : vi.fn().mockResolvedValue(opts.lanes ?? [lane]),
  }

  const starboard: StarboardRatesPort = {
    resolve:
      opts.resolve ??
      vi.fn().mockResolvedValue([
        {
          id: "hit_1",
          carrier_name: "MSC",
          resolved_buy_total: 1500,
          resolved_currency: "USD",
          resolved_surcharges: [],
        },
      ]),
  }

  const reviewItems =
    opts.pendingMapReviews !== undefined
      ? ({
          countPending: vi.fn().mockResolvedValue(opts.pendingMapReviews),
        } as never)
      : undefined

  const service = new RateResolutionService(
    rfps,
    pipeline,
    reports,
    mapping,
    starboard,
    reviewItems,
    2
  )

  return { service, pipeline, reports, starboard, mapping, rfps }
}

describe("RateResolutionService", () => {
  it("resolves hits, persists cells, and completes rates step", async () => {
    const { service, pipeline, reports, starboard } = createService({})
    const result = await service.resolveMappedLanes({
      organizationId: "org_1",
      fillId: "fill_1",
    })

    expect(result.hitCount).toBe(1)
    expect(result.noHitCount).toBe(0)
    expect(pipeline.startStep).toHaveBeenCalledWith(
      "fill_1",
      "rates",
      expect.stringContaining("1")
    )
    expect(pipeline.completeStep).toHaveBeenCalledWith(
      "fill_1",
      "rates",
      "Resolved 1 hit / 0 no-hit / 0 error"
    )
    expect(reports.replaceLaneCells).toHaveBeenCalled()
    expect(starboard.resolve).toHaveBeenCalled()
    expect(result.cells[0]?.outcome).toBe("filled")
    expect(result.cells[0]?.value).toBe("1500")
    expect(result.cells[0]?.metadata).toMatchObject({
      channel: "contract",
      starboardHitId: "hit_1",
      carrier: "MSC",
      resolvedBuyTotal: 1500,
      laneId: "lane_1",
    })
  })

  it("treats empty Starboard results as no-hit and still completes", async () => {
    const { service, pipeline } = createService({
      resolve: vi.fn().mockResolvedValue([]),
    })
    const result = await service.resolveMappedLanes({
      organizationId: "org_1",
      fillId: "fill_1",
    })
    expect(result.hitCount).toBe(0)
    expect(result.noHitCount).toBe(1)
    expect(result.cells[0]?.outcome).toBe("skipped")
    expect(pipeline.completeStep).toHaveBeenCalled()
    expect(pipeline.failStep).not.toHaveBeenCalled()
  })

  it("fails the rates step when mapping has no lanes", async () => {
    const { service, pipeline } = createService({ lanes: [] })
    await expect(
      service.resolveMappedLanes({ organizationId: "org_1", fillId: "fill_1" })
    ).rejects.toBeInstanceOf(DomainError)
    expect(pipeline.failStep).toHaveBeenCalledWith(
      "fill_1",
      "rates",
      "No mapped lanes"
    )
    expect(pipeline.startStep).not.toHaveBeenCalled()
  })

  it("blocks resolve while map reviews are pending", async () => {
    const { service, pipeline } = createService({ pendingMapReviews: 2 })
    await expect(
      service.resolveMappedLanes({ organizationId: "org_1", fillId: "fill_1" })
    ).rejects.toMatchObject({
      message: "Cannot resolve rates: 2 pending map reviews",
    })
    expect(pipeline.failStep).toHaveBeenCalledWith(
      "fill_1",
      "rates",
      "Cannot resolve rates: 2 pending map reviews"
    )
    expect(pipeline.startStep).not.toHaveBeenCalled()
  })

  it("records lane errors without failing the whole step", async () => {
    const { service, pipeline } = createService({
      resolve: vi.fn().mockRejectedValue(new Error("Starboard down")),
    })
    const result = await service.resolveMappedLanes({
      organizationId: "org_1",
      fillId: "fill_1",
    })
    expect(result.errorCount).toBe(1)
    expect(result.cells[0]?.outcome).toBe("error")
    expect(pipeline.completeStep).toHaveBeenCalledWith(
      "fill_1",
      "rates",
      "Resolved 0 hit / 0 no-hit / 1 error"
    )
  })
})
