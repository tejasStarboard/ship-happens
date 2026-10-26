import { describe, expect, it, vi } from "vitest"
import type { FillMappingService } from "../rates/fill-mapping.service"
import type { ReviewItemService } from "../review/review-item.service"
import type { RfpRepository } from "../rfp/rfp.repository"
import type {
  CrmMatchPort,
  GeoResolvePort,
  PlaceResolveResult,
} from "./geo-ports"
import { PlaceMappingService } from "./place-mapping.service"

function place(
  partial: Partial<PlaceResolveResult> & Pick<PlaceResolveResult, "label">
): PlaceResolveResult {
  return {
    locode: null,
    confidence: 0,
    certain: false,
    candidates: [],
    ...partial,
  }
}

function fillRow(customer: string | null = null) {
  return {
    id: "fill_1",
    organizationId: "org_1",
    name: "Test",
    customer,
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

describe("PlaceMappingService", () => {
  it("upserts when both ends are certain ≥ 0.9", async () => {
    const geo: GeoResolvePort = {
      resolvePlace: vi.fn(async (label: string) => {
        if (label.includes("Shanghai")) {
          return place({
            label,
            locode: "CNSHA",
            confidence: 0.96,
            certain: true,
            candidates: [
              { locode: "CNSHA", label: "Shanghai", probability: 0.96 },
            ],
          })
        }
        return place({
          label,
          locode: "USLAX",
          confidence: 0.94,
          certain: true,
          candidates: [
            { locode: "USLAX", label: "Los Angeles", probability: 0.94 },
          ],
        })
      }),
    }
    const upsertLanes = vi
      .fn()
      .mockResolvedValue({ fillId: "fill_1", laneCount: 1 })
    const createReview = vi.fn()
    const mapping = { upsertLanes } as unknown as FillMappingService
    const reviews = {
      create: createReview,
      get: vi.fn(),
    } as unknown as ReviewItemService
    const rfps = {
      findByIdForOrganization: vi.fn().mockResolvedValue(fillRow()),
      updateCustomer: vi.fn(),
    } as unknown as RfpRepository

    const service = new PlaceMappingService(rfps, mapping, reviews, geo)
    const result = await service.proposeLanes("org_1", "fill_1", {
      lanes: [
        {
          laneId: "lane_1",
          originLabel: "Shanghai",
          destLabel: "Los Angeles",
          equipmentType: "40HC",
        },
      ],
    })

    expect(result.upsertedCount).toBe(1)
    expect(result.reviewCount).toBe(0)
    expect(upsertLanes).toHaveBeenCalledOnce()
    expect(createReview).not.toHaveBeenCalled()
    expect(result.lanes[0]?.action).toBe("upserted")
  })

  it("creates map review when confidence is low", async () => {
    const geo: GeoResolvePort = {
      resolvePlace: vi.fn(async (label: string) =>
        place({
          label,
          locode: "USPDX",
          confidence: 0.7,
          certain: false,
          blocked: "low_p",
          candidates: [
            { locode: "USPDX", label: "Portland OR", probability: 0.7 },
            { locode: "GBPRT", label: "Portland UK", probability: 0.25 },
          ],
        })
      ),
    }
    const upsertLanes = vi.fn()
    const createReview = vi.fn().mockResolvedValue({
      id: "rev_1",
      rfpId: "fill_1",
      organizationId: "org_1",
      stepKey: "map",
      title: "Map lane",
      status: "pending",
      proposal: {},
      confidence: "0.7",
      source: "jev-geo",
      sourceMetadata: {},
      decidedByUserId: null,
      decidedAt: null,
      decisionNote: null,
      resolution: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    const mapping = { upsertLanes } as unknown as FillMappingService
    const reviews = {
      create: createReview,
    } as unknown as ReviewItemService
    const rfps = {
      findByIdForOrganization: vi.fn().mockResolvedValue(fillRow()),
      updateCustomer: vi.fn(),
    } as unknown as RfpRepository

    const service = new PlaceMappingService(rfps, mapping, reviews, geo)
    const result = await service.proposeLanes("org_1", "fill_1", {
      lanes: [
        {
          laneId: "lane_pdx",
          originLabel: "Portland",
          destLabel: "Portland",
          equipmentType: "40HC",
        },
      ],
    })

    expect(result.upsertedCount).toBe(0)
    expect(result.reviewCount).toBe(1)
    expect(upsertLanes).not.toHaveBeenCalled()
    expect(createReview).toHaveBeenCalledWith(
      "org_1",
      "fill_1",
      expect.objectContaining({
        stepKey: "map",
        source: "jev-geo",
        confidence: 0.7,
      })
    )
  })

  it("CRM match fails open and still maps lanes", async () => {
    const geo: GeoResolvePort = {
      resolvePlace: vi.fn(async (label: string) =>
        place({
          label,
          locode: label.startsWith("A") ? "CNSHA" : "USLAX",
          confidence: 0.99,
          certain: true,
          candidates: [],
        })
      ),
    }
    const crm: CrmMatchPort = {
      matchCustomer: vi.fn().mockRejectedValue(new Error("Jev down")),
    }
    const mapping = {
      upsertLanes: vi
        .fn()
        .mockResolvedValue({ fillId: "fill_1", laneCount: 1 }),
    } as unknown as FillMappingService
    const reviews = {
      create: vi.fn(),
      get: vi.fn(),
    } as unknown as ReviewItemService
    const rfps = {
      findByIdForOrganization: vi.fn().mockResolvedValue(fillRow()),
      updateCustomer: vi.fn(),
    } as unknown as RfpRepository

    const service = new PlaceMappingService(rfps, mapping, reviews, geo, crm)
    const result = await service.proposeLanes("org_1", "fill_1", {
      customerLabel: "Acme Logistics",
      lanes: [
        {
          laneId: "lane_1",
          originLabel: "A Shanghai",
          destLabel: "B LA",
          equipmentType: "40HC",
        },
      ],
    })

    expect(result.customerMatch).toBeNull()
    expect(result.upsertedCount).toBe(1)
  })
})
