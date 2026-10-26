import { MappedLaneSchema, type MappedLane } from "./mapped-lane"

function asTrimmedString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function asInt(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isInteger(value)) return value
  if (typeof value === "string" && value.trim()) {
    const n = Number(value)
    if (Number.isInteger(n)) return n
  }
  return undefined
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  const slots = value
    .map((item) => asTrimmedString(item))
    .filter((item): item is string => item != null)
  return slots.length > 0 ? slots : undefined
}

function pickString(
  source: Record<string, unknown>,
  keys: string[]
): string | undefined {
  for (const key of keys) {
    const value = asTrimmedString(source[key])
    if (value) return value
  }
  return undefined
}

/**
 * Build a `MappedLane` from a HITL review proposal (+ optional Edit resolution).
 * Returns null when required O-D-equipment fields are missing (Confirm still
 * clears the wait; Map UI can fill the gap).
 */
export function mappedLaneFromProposal(
  proposal: Record<string, unknown>,
  resolution?: Record<string, unknown> | null
): MappedLane | null {
  const source: Record<string, unknown> = {
    ...proposal,
    ...(resolution && typeof resolution === "object" ? resolution : {}),
  }

  const originLocode = pickString(source, [
    "originLocode",
    "origin",
    "originPort",
  ])
  const destLocode = pickString(source, [
    "destLocode",
    "destinationLocode",
    "dest",
    "destination",
  ])
  const equipmentType = pickString(source, [
    "equipmentType",
    "equipment",
    "eqType",
  ])
  if (!originLocode || !destLocode || !equipmentType) return null

  const laneId =
    pickString(source, ["laneId", "id"]) ??
    `lane_${originLocode}_${destLocode}_${equipmentType}`.toLowerCase()

  const candidate: Record<string, unknown> = {
    laneId,
    originLocode,
    destLocode,
    equipmentType,
  }

  const validFrom = pickString(source, ["validFrom"])
  const validTo = pickString(source, ["validTo"])
  const serviceType = pickString(source, ["serviceType", "service"])
  const sheetName = pickString(source, ["sheetName", "sheet"])
  const columnKey = pickString(source, ["columnKey", "column", "col"])
  const cellRef = pickString(source, ["cellRef", "cell"])
  const rowIndex = asInt(source.rowIndex)
  const surchargeSlots = asStringArray(source.surchargeSlots)

  if (validFrom) candidate.validFrom = validFrom
  if (validTo) candidate.validTo = validTo
  if (serviceType) candidate.serviceType = serviceType
  if (sheetName) candidate.sheetName = sheetName
  if (columnKey) candidate.columnKey = columnKey
  if (cellRef) candidate.cellRef = cellRef
  if (rowIndex !== undefined) candidate.rowIndex = rowIndex
  if (surchargeSlots) candidate.surchargeSlots = surchargeSlots

  const parsed = MappedLaneSchema.safeParse(candidate)
  return parsed.success ? parsed.data : null
}

/** PRD Week 2: flag matches under 90% confidence for human review. */
export const MAP_LOW_CONFIDENCE_THRESHOLD = 0.9

export function isLowConfidenceMapping(
  confidence: string | number | null | undefined
): boolean {
  if (confidence == null || confidence === "") return false
  const n = typeof confidence === "number" ? confidence : Number(confidence)
  if (!Number.isFinite(n)) return false
  return n < MAP_LOW_CONFIDENCE_THRESHOLD
}
