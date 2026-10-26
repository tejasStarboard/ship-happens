import { describe, expect, it, vi } from "vitest"
import { createDbMappingStore } from "./db-mapping-store"
import type { FillMappingRepository } from "./fill-mapping.repository"
import { SMOKE_MAPPING_FIXTURE } from "./mapped-lane"
import type { MappingFileReader } from "./rate-ports"

const lane = SMOKE_MAPPING_FIXTURE.lanes[0]!

function repo(
  overrides?: Partial<FillMappingRepository>
): FillMappingRepository {
  return {
    getOrganizationIdForRfp: vi.fn().mockResolvedValue("org_1"),
    listByRfpId: vi.fn().mockResolvedValue([]),
    countByRfpId: vi.fn().mockResolvedValue(0),
    replaceAll: vi.fn().mockResolvedValue({ laneCount: 1 }),
    ...overrides,
  } as FillMappingRepository
}

describe("createDbMappingStore", () => {
  it("returns DB lanes when present", async () => {
    const mappings = repo({
      listByRfpId: vi.fn().mockResolvedValue([lane]),
    })
    const fileReader: MappingFileReader = {
      readMappingJson: vi.fn().mockResolvedValue(null),
    }
    const store = createDbMappingStore(mappings, fileReader)
    await expect(store.readMappedLanes("fill_1")).resolves.toEqual([lane])
    expect(fileReader.readMappingJson).not.toHaveBeenCalled()
  })

  it("one-shot imports mapping.json when DB empty", async () => {
    const replaceAll = vi.fn().mockResolvedValue({ laneCount: 1 })
    const mappings = repo({ replaceAll })
    const fileReader: MappingFileReader = {
      readMappingJson: vi
        .fn()
        .mockResolvedValue(JSON.stringify(SMOKE_MAPPING_FIXTURE)),
    }
    const store = createDbMappingStore(mappings, fileReader)
    const lanes = await store.readMappedLanes("fill_1")
    expect(lanes).toHaveLength(1)
    expect(lanes[0]?.laneId).toBe(lane.laneId)
    expect(replaceAll).toHaveBeenCalledWith({
      rfpId: "fill_1",
      organizationId: "org_1",
      lanes: expect.arrayContaining([
        expect.objectContaining({ laneId: lane.laneId }),
      ]),
    })
  })

  it("returns empty when DB and file are empty", async () => {
    const store = createDbMappingStore(repo(), {
      readMappingJson: vi.fn().mockResolvedValue(null),
    })
    await expect(store.readMappedLanes("fill_1")).resolves.toEqual([])
  })
})
