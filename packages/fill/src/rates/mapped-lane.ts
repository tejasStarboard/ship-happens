import { z } from "zod"
import { DomainError } from "../errors"

/**
 * Mapped O-D-equipment lanes for rate resolve / Map.
 * Durable store is Postgres (`rfp_mapped_lanes`); `mapping.json` is import/export.
 * Keep this shape stable for resolve, CLI, and tests.
 */
export const MappedLaneSchema = z.object({
  laneId: z.string().min(1),
  originLocode: z.string().min(1),
  destLocode: z.string().min(1),
  equipmentType: z.string().min(1),
  validFrom: z.string().optional(),
  validTo: z.string().optional(),
  serviceType: z
    .enum([
      "ocean_fcl",
      "ocean_lcl",
      "air",
      "origin_drayage",
      "destination_drayage",
      "origin_cartage",
      "destination_cartage",
    ])
    .optional(),
  sheetName: z.string().optional(),
  rowIndex: z.number().int().optional(),
  columnKey: z.string().optional(),
  cellRef: z.string().optional(),
  surchargeSlots: z.array(z.string().min(1)).optional(),
})

export type MappedLane = z.infer<typeof MappedLaneSchema>

export const MappingDocumentSchema = z.object({
  version: z.number().int().optional(),
  lanes: z.array(MappedLaneSchema).min(0),
})

export type MappingDocument = z.infer<typeof MappingDocumentSchema>

/** Smoke / QA fixture — CNSHA → USLAX 40HC (matches Rates smoke lane). */
export const SMOKE_MAPPING_FIXTURE: MappingDocument = {
  version: 1,
  lanes: [
    {
      laneId: "lane_cnsha_uslax_40hc",
      originLocode: "CNSHA",
      destLocode: "USLAX",
      equipmentType: "40HC",
      serviceType: "ocean_fcl",
      sheetName: "Rates",
      rowIndex: 0,
      columnKey: "ocean_freight",
    },
  ],
}

export function parseMappingDocument(raw: unknown): MappedLane[] {
  const parsed = MappingDocumentSchema.safeParse(raw)
  if (!parsed.success) {
    throw new DomainError(
      `Invalid mapping.json: ${parsed.error.issues[0]?.message ?? "parse failed"}`,
      "VALIDATION"
    )
  }
  return parsed.data.lanes
}

export function parseMappingJson(text: string): MappedLane[] {
  let raw: unknown
  try {
    raw = JSON.parse(text) as unknown
  } catch {
    throw new DomainError("mapping.json is not valid JSON", "VALIDATION")
  }
  return parseMappingDocument(raw)
}
