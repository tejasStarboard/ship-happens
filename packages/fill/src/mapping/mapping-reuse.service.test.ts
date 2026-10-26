import { describe, expect, it, vi } from "vitest"
import type { FillPipelineManager } from "../pipeline/fill-pipeline.manager"
import type { FillMappingService } from "../rates/fill-mapping.service"
import type { MappedLane } from "../rates/mapped-lane"
import type { ReviewItemService } from "../review/review-item.service"
import type { ReviewItemView } from "../review/review-item.types"
import type { RfpRepository } from "../rfp/rfp.repository"
import { MappingReuseService } from "./mapping-reuse.service"

function lane(partial: Partial<MappedLane> = {}): MappedLane {
  return {
    laneId: "lane_1",
    originLocode: "CNSHA",
    destLocode: "USLAX",
    equipmentType: "40HC",
    sheetName: "Rates",
    columnKey: "ocean_freight",
    rowIndex: 10,
    cellRef: "B10",
    ...partial,
  }
}

function fill(id: string) {
  return {
    id,
    organizationId: "org_1",
    name: "Nordstrom",
    customer: "Nordstrom",
    status: "queued" as const,
    roundNumber: 1,
    parentRfpId: null,
  }
}

function review(id: string): ReviewItemView {
  return {
    id,
    rfpId: "fill_child",
    organizationId: "org_1",
    stepKey: "map",
    title: "drift",
    status: "pending",
    proposal: {},
    confidence: null,
    source: "mapping-reuse",
    sourceMetadata: {},
    decidedByUserId: null,
    decidedAt: null,
    decisionNote: null,
    resolution: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

function setup(lanes: MappedLane[]) {
  const upsertLanes = vi
    .fn()
    .mockResolvedValue({ fillId: "fill_child", laneCount: lanes.length })
  const create = vi.fn(async () => review(`rev_${create.mock.calls.length}`))
  const appendLog = vi.fn()
  const appendPipelineEvent = vi.fn()
  const mergeMetadata = vi.fn()
  const service = new MappingReuseService(
    {
      findByIdForOrganization: vi.fn(async (_org: string, id: string) =>
        id === "missing" ? null : fill(id)
      ),
      listSourceFiles: vi.fn(async () => [
        {
          sheetNames: ["Rates"],
          parseMetadata: {
            anchors: [
              {
                sheetName: "Rates",
                columnKey: "ocean_freight",
                rowIndex: 11,
              },
            ],
          },
        },
      ]),
      mergeMetadata,
    } as unknown as RfpRepository,
    {
      list: vi.fn(async () => ({ fillId: "fill_parent", version: 1, lanes })),
      upsertLanes,
    } as unknown as FillMappingService,
    { create } as unknown as ReviewItemService,
    { appendLog, appendPipelineEvent } as unknown as FillPipelineManager
  )
  return {
    service,
    upsertLanes,
    create,
    appendLog,
    appendPipelineEvent,
    mergeMetadata,
  }
}

describe("MappingReuseService", () => {
  it("confirms the map step when every parent lane is reused", async () => {
    const { service, upsertLanes, create, appendPipelineEvent, mergeMetadata } =
      setup([lane()])
    const result = await service.applyFromParent({
      organizationId: "org_1",
      parentFillId: "fill_parent",
      fillId: "fill_child",
    })

    expect(create).not.toHaveBeenCalled()
    expect(upsertLanes).toHaveBeenCalledWith(
      "org_1",
      "fill_child",
      [
        expect.objectContaining({
          laneId: "lane_1",
          rowIndex: 11,
          cellRef: "B11",
        }),
      ],
      { confirmMap: true }
    )
    expect(result.mapConfirmed).toBe(true)
    expect(result.reused).toBe(1)
    expect(appendPipelineEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: "mapping.reused" })
    )
    expect(appendPipelineEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "mapping.drift_detected" })
    )
    expect(mergeMetadata).toHaveBeenCalledWith(
      "fill_child",
      expect.objectContaining({
        mappingReuseSummary: expect.objectContaining({ reused: 1, drifted: 0 }),
      })
    )
  })

  it("opens map reviews for drift and does not confirm the map step", async () => {
    const { service, upsertLanes, create, appendPipelineEvent } = setup([
      lane(),
      lane({
        laneId: "lane_2",
        originLocode: "NLRTM",
        destLocode: "USNYC",
        columnKey: "thc",
        rowIndex: 20,
        cellRef: "C20",
      }),
    ])

    const result = await service.applyFromParent({
      organizationId: "org_1",
      parentFillId: "fill_parent",
      fillId: "fill_child",
      fingerprint: {
        sheetNames: ["Rates"],
        anchors: [
          {
            sheetName: "Rates",
            columnKey: "ocean_freight",
            rowIndex: 10,
            originLocode: "CNSHA",
            destLocode: "USLAX",
            equipmentType: "40HC",
          },
          {
            sheetName: "Rates",
            columnKey: "base_rate",
            rowIndex: 30,
            laneId: "lane_2",
            originLocode: "NLRTM",
            destLocode: "USNYC",
            equipmentType: "40HC",
          },
        ],
      },
    })

    expect(result.mapConfirmed).toBe(false)
    expect(result.reusedLaneIds).toEqual(["lane_1"])
    expect(result.drifted).toBe(1)
    expect(create).toHaveBeenCalledTimes(1)
    expect(create).toHaveBeenCalledWith(
      "org_1",
      "fill_child",
      expect.objectContaining({
        stepKey: "map",
        source: "mapping-reuse",
        proposal: expect.objectContaining({
          laneId: "lane_2",
          columnKey: "base_rate",
          reason: expect.stringMatching(/header or column changed/),
        }),
      })
    )
    expect(upsertLanes).toHaveBeenCalledWith(
      "org_1",
      "fill_child",
      [expect.objectContaining({ laneId: "lane_1" })],
      { confirmMap: false }
    )
    expect(appendPipelineEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: "mapping.drift_detected" })
    )
  })

  it("rejects an unknown parent fill", async () => {
    const { service } = setup([])
    await expect(
      service.applyFromParent({
        organizationId: "org_1",
        parentFillId: "missing",
        fillId: "fill_child",
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" })
  })
})
