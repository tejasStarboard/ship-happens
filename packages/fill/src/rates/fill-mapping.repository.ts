import { randomUUID } from "node:crypto"
import { eq } from "drizzle-orm"
import { rfpMappedLanes, rfps } from "@ship-happens/db"
import type { AppDb } from "../rfp/rfp.repository"
import {
  feeBindingsForPersist,
  normalizeFeeBindings,
  type FeeBinding,
} from "./fee-bindings"
import type { MappedLane } from "./mapped-lane"

function mappingRowId() {
  return `mlane_${randomUUID().replaceAll("-", "").slice(0, 16)}`
}

function parseStoredSlots(
  raw: Array<string | Record<string, unknown>> | null | undefined
): { surchargeSlots: string[]; feeBindings: FeeBinding[] } {
  const laneStub = {
    laneId: "_",
    originLocode: "XX",
    destLocode: "YY",
    equipmentType: "40HC",
    surchargeSlots: [] as string[],
    feeBindings: [] as FeeBinding[],
  } satisfies MappedLane

  if (!raw || raw.length === 0) {
    return { surchargeSlots: [], feeBindings: [] }
  }

  const strings: string[] = []
  const objects: FeeBinding[] = []
  for (const item of raw) {
    if (typeof item === "string") {
      if (item.trim()) strings.push(item.trim())
      continue
    }
    if (item && typeof item === "object" && "heading" in item) {
      objects.push(item as FeeBinding)
    }
  }
  laneStub.surchargeSlots = strings
  laneStub.feeBindings = objects
  const bindings = normalizeFeeBindings(laneStub)
  return feeBindingsForPersist(bindings)
}

function toMappedLane(row: typeof rfpMappedLanes.$inferSelect): MappedLane {
  const lane: MappedLane = {
    laneId: row.laneId,
    originLocode: row.originLocode,
    destLocode: row.destLocode,
    equipmentType: row.equipmentType,
  }
  if (row.validFrom) lane.validFrom = row.validFrom
  if (row.validTo) lane.validTo = row.validTo
  if (row.serviceType) {
    lane.serviceType = row.serviceType as MappedLane["serviceType"]
  }
  if (row.sheetName) lane.sheetName = row.sheetName
  if (row.rowIndex != null) lane.rowIndex = row.rowIndex
  if (row.columnKey) lane.columnKey = row.columnKey
  if (row.cellRef) lane.cellRef = row.cellRef
  const parsed = parseStoredSlots(row.surchargeSlots ?? [])
  if (parsed.feeBindings.length > 0) {
    lane.feeBindings = parsed.feeBindings
    lane.surchargeSlots = parsed.surchargeSlots
  }
  return lane
}

function slotsForDb(lane: MappedLane): Array<Record<string, unknown>> {
  const bindings = normalizeFeeBindings(lane)
  return bindings.map((b) => {
    const row: Record<string, unknown> = { heading: b.heading }
    if (b.columnKey) row.columnKey = b.columnKey
    if (b.cellRef) row.cellRef = b.cellRef
    if (b.sheetName) row.sheetName = b.sheetName
    if (b.confidence != null) row.confidence = b.confidence
    return row
  })
}

export class FillMappingRepository {
  constructor(private readonly db: AppDb) {}

  async getOrganizationIdForRfp(rfpId: string): Promise<string | null> {
    const row = await this.db
      .select({ organizationId: rfps.organizationId })
      .from(rfps)
      .where(eq(rfps.id, rfpId))
      .limit(1)
      .then((rows) => rows[0] ?? null)
    return row?.organizationId ?? null
  }

  async listByRfpId(rfpId: string): Promise<MappedLane[]> {
    const rows = await this.db
      .select()
      .from(rfpMappedLanes)
      .where(eq(rfpMappedLanes.rfpId, rfpId))
    return rows.map(toMappedLane)
  }

  async countByRfpId(rfpId: string): Promise<number> {
    const rows = await this.db
      .select({ id: rfpMappedLanes.id })
      .from(rfpMappedLanes)
      .where(eq(rfpMappedLanes.rfpId, rfpId))
    return rows.length
  }

  /**
   * Replace all confirmed lanes for a fill (confirm / import).
   * Empty `lanes` clears mapping.
   */
  async replaceAll(input: {
    rfpId: string
    organizationId: string
    lanes: MappedLane[]
  }): Promise<{ laneCount: number }> {
    await this.db
      .delete(rfpMappedLanes)
      .where(eq(rfpMappedLanes.rfpId, input.rfpId))

    if (input.lanes.length === 0) {
      return { laneCount: 0 }
    }

    await this.db.insert(rfpMappedLanes).values(
      input.lanes.map((lane) => ({
        id: mappingRowId(),
        rfpId: input.rfpId,
        organizationId: input.organizationId,
        laneId: lane.laneId,
        originLocode: lane.originLocode,
        destLocode: lane.destLocode,
        equipmentType: lane.equipmentType,
        validFrom: lane.validFrom ?? null,
        validTo: lane.validTo ?? null,
        serviceType: lane.serviceType ?? null,
        sheetName: lane.sheetName ?? null,
        rowIndex: lane.rowIndex ?? null,
        columnKey: lane.columnKey ?? null,
        cellRef: lane.cellRef ?? null,
        surchargeSlots: slotsForDb(lane),
      }))
    )

    return { laneCount: input.lanes.length }
  }
}
