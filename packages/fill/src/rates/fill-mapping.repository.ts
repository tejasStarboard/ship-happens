import { randomUUID } from "node:crypto"
import { eq } from "drizzle-orm"
import { rfpMappedLanes, rfps } from "@workspace/db"
import type { AppDb } from "../rfp/rfp.repository"
import type { MappedLane } from "./mapped-lane"

function mappingRowId() {
  return `mlane_${randomUUID().replaceAll("-", "").slice(0, 16)}`
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
  const slots = row.surchargeSlots ?? []
  if (slots.length > 0) lane.surchargeSlots = slots
  return lane
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
        surchargeSlots: lane.surchargeSlots ?? [],
      }))
    )

    return { laneCount: input.lanes.length }
  }
}
