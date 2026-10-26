import type { MappedLane } from "../rates/mapped-lane"

/** Review `source` and pipeline log source for multi-round mapping reuse. */
export const MAPPING_REUSE_SOURCE = "mapping-reuse"

/** Auto-accept when the anchor row moves by at most this many rows. */
export const MAPPING_REUSE_ROW_TOLERANCE = 2

/**
 * A coordinate discovered in the new workbook (or supplied by the caller).
 * Fee headings are best-effort: a mismatch does not block lane reuse.
 */
export type MappingReuseAnchor = {
  sheetName?: string
  columnKey?: string
  cellRef?: string
  rowIndex?: number
  /** Display header when `columnKey` is absent. Compared to the parent column key. */
  header?: string
  laneId?: string
  originLocode?: string
  destLocode?: string
  equipmentType?: string
  feeHeadings?: string[]
}

export type MappingReuseContext = {
  /**
   * Sheet names from the new workbook. An empty list means discovery failed
   * and does not mark lanes removed. A non-empty list that omits the parent
   * sheet marks that lane removed unless another anchor still matches it.
   */
  sheetNames?: string[]
  /**
   * Omit to reuse lanes whose sheet still exists, at the same coordinates.
   * Pass an array (even empty) when the new workbook was fingerprinted.
   */
  anchors?: MappingReuseAnchor[]
}

export type MappingReuseCoordinate = {
  sheetName?: string
  columnKey?: string
  cellRef?: string
  rowIndex?: number
}

export type ClassifiedMappingLane = {
  classification: "reused" | "drifted" | "removed"
  parent: MappedLane
  /** Present only for reused lanes. Same `laneId`, coordinates may shift. */
  lane?: MappedLane
  reason: string
  suggested?: MappingReuseCoordinate
  /** Parent fee headings differ from the matched anchor. Lane is still reused. */
  feeDrift?: boolean
}

export type MappingReuseClassification = {
  reused: ClassifiedMappingLane[]
  drifted: ClassifiedMappingLane[]
  removed: ClassifiedMappingLane[]
}

export type MappingReuseSummary = {
  parentRfpId: string
  reused: number
  drifted: number
  removed: number
  feeDrift: number
}

type AssessedAnchor = {
  anchor: MappingReuseAnchor
  column: boolean
  delta: number | null
  /** false when both sides name a sheet and they differ. */
  sheetMismatch: boolean
}

function norm(value: string | undefined): string | null {
  const trimmed = value?.trim().toLowerCase()
  return trimmed ? trimmed : null
}

export function columnLetterFromCellRef(cellRef?: string): string | null {
  if (!cellRef) return null
  const match = cellRef
    .trim()
    .replace(/\$/g, "")
    .match(/^([A-Za-z]+)(\d+)$/)
  return match ? match[1]!.toUpperCase() : null
}

function rowFromCellRef(cellRef?: string): number | undefined {
  if (!cellRef) return undefined
  const match = cellRef
    .trim()
    .replace(/\$/g, "")
    .match(/^[A-Za-z]+(\d+)$/)
  if (!match) return undefined
  const row = Number(match[1])
  return Number.isInteger(row) ? row : undefined
}

function rowOf(input: {
  rowIndex?: number
  cellRef?: string
}): number | undefined {
  if (typeof input.rowIndex === "number" && Number.isInteger(input.rowIndex)) {
    return input.rowIndex
  }
  return rowFromCellRef(input.cellRef)
}

function knownSheets(sheetNames: string[] | undefined): string[] | null {
  if (!sheetNames || sheetNames.length === 0) return null
  const names = sheetNames
    .map((name) => name.trim().toLowerCase())
    .filter(Boolean)
  return names.length > 0 ? names : null
}

function sheetMissing(
  lane: MappedLane,
  sheetNames: string[] | undefined
): boolean {
  const sheets = knownSheets(sheetNames)
  const sheet = norm(lane.sheetName)
  if (!sheets || !sheet) return false
  return !sheets.includes(sheet)
}

function sheetsMismatch(left?: string, right?: string): boolean {
  const a = norm(left)
  const b = norm(right)
  if (!a || !b) return false
  return a !== b
}

function sameColumn(lane: MappedLane, anchor: MappingReuseAnchor): boolean {
  const parentKey = norm(lane.columnKey)
  const anchorKey = norm(anchor.columnKey) ?? norm(anchor.header)
  if (parentKey && anchorKey) return parentKey === anchorKey
  const parentCol = columnLetterFromCellRef(lane.cellRef)
  const anchorCol = columnLetterFromCellRef(anchor.cellRef)
  if (!parentKey && !anchorKey && parentCol && anchorCol) {
    return parentCol === anchorCol
  }
  return false
}

function sameIdentity(lane: MappedLane, anchor: MappingReuseAnchor): boolean {
  const parentId = norm(lane.laneId)
  const anchorId = norm(anchor.laneId)
  if (parentId && anchorId && parentId === anchorId) return true
  const origin = norm(lane.originLocode)
  const dest = norm(lane.destLocode)
  const equipment = norm(lane.equipmentType)
  const anchorOrigin = norm(anchor.originLocode)
  const anchorDest = norm(anchor.destLocode)
  const anchorEquipment = norm(anchor.equipmentType)
  if (!origin || !dest || !equipment) return false
  if (!anchorOrigin || !anchorDest || !anchorEquipment) return false
  return (
    origin === anchorOrigin &&
    dest === anchorDest &&
    equipment === anchorEquipment
  )
}

function feeHeadingSet(values: string[] | undefined): string[] {
  return (values ?? [])
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
    .sort()
}

function parentFeeHeadings(lane: MappedLane): string[] {
  if (lane.feeBindings && lane.feeBindings.length > 0) {
    return feeHeadingSet(lane.feeBindings.map((binding) => binding.heading))
  }
  return feeHeadingSet(lane.surchargeSlots)
}

function hasFeeDrift(lane: MappedLane, anchor: MappingReuseAnchor): boolean {
  if (!anchor.feeHeadings) return false
  const parent = parentFeeHeadings(lane)
  const next = feeHeadingSet(anchor.feeHeadings)
  if (parent.length !== next.length) return true
  return parent.some((heading, index) => heading !== next[index])
}

function shiftCellRef(cellRef: string, fromRow: number, toRow: number): string {
  const match = cellRef.match(/^(.*?)(\d+)$/)
  if (!match) return cellRef
  const next = toRow
  if (!Number.isInteger(next) || next < 1) return cellRef
  if (fromRow === toRow) return cellRef
  const current = Number(match[2])
  const shifted = current + (toRow - fromRow)
  if (!Number.isInteger(shifted) || shifted < 1) return cellRef
  return `${match[1]}${shifted}`
}

function nextRowIndex(
  parent: MappedLane,
  anchor: MappingReuseAnchor
): number | undefined {
  if (
    typeof anchor.rowIndex === "number" &&
    Number.isInteger(anchor.rowIndex)
  ) {
    return anchor.rowIndex
  }
  const anchorCellRow = rowFromCellRef(anchor.cellRef)
  if (anchorCellRow == null) return parent.rowIndex
  if (typeof parent.rowIndex !== "number") return anchorCellRow
  const parentCell = rowFromCellRef(parent.cellRef)
  if (parentCell != null && parent.rowIndex === parentCell) return anchorCellRow
  return parent.rowIndex
}

function nextCellRef(
  parent: MappedLane,
  anchor: MappingReuseAnchor,
  nextRow: number | undefined
): string | undefined {
  if (anchor.cellRef?.trim()) return anchor.cellRef.trim()
  if (!parent.cellRef || nextRow == null) return parent.cellRef
  const cellRow = rowFromCellRef(parent.cellRef)
  if (cellRow == null) return parent.cellRef
  const parentRow =
    typeof parent.rowIndex === "number" ? parent.rowIndex : cellRow
  if (typeof parent.rowIndex === "number" && parent.rowIndex !== cellRow) {
    return parent.cellRef
  }
  return shiftCellRef(parent.cellRef, parentRow, nextRow)
}

function cloneLane(lane: MappedLane): MappedLane {
  return {
    ...lane,
    ...(lane.surchargeSlots
      ? { surchargeSlots: [...lane.surchargeSlots] }
      : {}),
    ...(lane.feeBindings
      ? { feeBindings: lane.feeBindings.map((binding) => ({ ...binding })) }
      : {}),
  }
}

function laneWithAnchor(
  parent: MappedLane,
  anchor: MappingReuseAnchor
): MappedLane {
  const lane = cloneLane(parent)
  if (anchor.sheetName?.trim()) lane.sheetName = anchor.sheetName.trim()
  if (anchor.columnKey?.trim()) lane.columnKey = anchor.columnKey.trim()
  const rowIndex = nextRowIndex(parent, anchor)
  if (rowIndex != null) lane.rowIndex = rowIndex
  const cellRef = nextCellRef(parent, anchor, rowIndex)
  if (cellRef) lane.cellRef = cellRef
  return lane
}

function suggestedFrom(anchor: MappingReuseAnchor): MappingReuseCoordinate {
  const suggested: MappingReuseCoordinate = {}
  if (anchor.sheetName?.trim()) suggested.sheetName = anchor.sheetName.trim()
  const columnKey = anchor.columnKey?.trim() || anchor.header?.trim()
  if (columnKey) suggested.columnKey = columnKey
  if (anchor.cellRef?.trim()) suggested.cellRef = anchor.cellRef.trim()
  const row =
    typeof anchor.rowIndex === "number"
      ? anchor.rowIndex
      : rowFromCellRef(anchor.cellRef)
  if (row != null) suggested.rowIndex = row
  return suggested
}

function assess(
  lane: MappedLane,
  anchor: MappingReuseAnchor
): AssessedAnchor | null {
  const column = sameColumn(lane, anchor)
  if (!column && !sameIdentity(lane, anchor)) return null
  const parentRow = rowOf(lane)
  const anchorRow = rowOf(anchor)
  const delta =
    parentRow != null && anchorRow != null
      ? Math.abs(parentRow - anchorRow)
      : null
  return {
    anchor,
    column,
    delta,
    sheetMismatch: sheetsMismatch(lane.sheetName, anchor.sheetName),
  }
}

function isReusable(match: AssessedAnchor): boolean {
  if (!match.column || match.sheetMismatch) return false
  if (match.delta == null) return true
  return match.delta <= MAPPING_REUSE_ROW_TOLERANCE
}

function driftReason(match: AssessedAnchor): string {
  const parts: string[] = []
  if (match.sheetMismatch) parts.push("sheet changed")
  if (!match.column) parts.push("header or column changed")
  if (match.delta != null && match.delta > MAPPING_REUSE_ROW_TOLERANCE) {
    parts.push(`row moved by ${match.delta}`)
  }
  if (parts.length === 0) parts.push("coordinates changed")
  return parts.join("; ")
}

function reuseReason(match: AssessedAnchor): string {
  if (match.delta == null || match.delta === 0) {
    return "Same column and nearby row"
  }
  return `Same column; row shifted by ${match.delta}`
}

function driftRank(match: AssessedAnchor): number {
  let score = match.delta ?? 50
  if (!match.column) score += 100
  if (match.sheetMismatch) score += 10
  return score
}

function classifyLane(
  lane: MappedLane,
  context: MappingReuseContext
): ClassifiedMappingLane {
  const missingSheet = sheetMissing(lane, context.sheetNames)

  if (context.anchors == null) {
    if (missingSheet) {
      return {
        classification: "removed",
        parent: lane,
        reason: "Sheet not in new workbook",
      }
    }
    return {
      classification: "reused",
      parent: lane,
      lane: cloneLane(lane),
      reason: "Sheet present; coordinates reused",
      feeDrift: false,
    }
  }

  const matches = context.anchors
    .map((anchor) => assess(lane, anchor))
    .filter((match): match is AssessedAnchor => match != null)

  const reusable = matches.filter(isReusable)
  if (reusable.length > 0) {
    reusable.sort((a, b) => (a.delta ?? 0) - (b.delta ?? 0))
    const best = reusable[0]!
    return {
      classification: "reused",
      parent: lane,
      lane: laneWithAnchor(lane, best.anchor),
      reason: reuseReason(best),
      suggested: suggestedFrom(best.anchor),
      feeDrift: hasFeeDrift(lane, best.anchor),
    }
  }

  if (matches.length > 0) {
    const ranked = [...matches].sort((a, b) => driftRank(a) - driftRank(b))
    const best = ranked[0]!
    return {
      classification: "drifted",
      parent: lane,
      reason: driftReason(best),
      suggested: suggestedFrom(best.anchor),
    }
  }

  if (missingSheet) {
    return {
      classification: "removed",
      parent: lane,
      reason: "Sheet not in new workbook",
    }
  }

  return {
    classification: "removed",
    parent: lane,
    reason: "No matching lane anchor in new workbook",
  }
}

/** Pure parent-lane diff. No database. */
export function classifyMappingReuse(
  parentLanes: MappedLane[],
  context: MappingReuseContext = {}
): MappingReuseClassification {
  const reused: ClassifiedMappingLane[] = []
  const drifted: ClassifiedMappingLane[] = []
  const removed: ClassifiedMappingLane[] = []
  for (const lane of parentLanes) {
    const classified = classifyLane(lane, context)
    if (classified.classification === "reused") reused.push(classified)
    else if (classified.classification === "drifted") drifted.push(classified)
    else removed.push(classified)
  }
  return { reused, drifted, removed }
}

function asTrimmed(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function parseAnchor(value: unknown): MappingReuseAnchor | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const row = value as Record<string, unknown>
  const anchor: MappingReuseAnchor = {}
  const sheetName = asTrimmed(row.sheetName)
  const columnKey = asTrimmed(row.columnKey)
  const cellRef = asTrimmed(row.cellRef)
  const header = asTrimmed(row.header)
  const laneId = asTrimmed(row.laneId)
  const originLocode = asTrimmed(row.originLocode)
  const destLocode = asTrimmed(row.destLocode)
  const equipmentType = asTrimmed(row.equipmentType)
  if (sheetName) anchor.sheetName = sheetName
  if (columnKey) anchor.columnKey = columnKey
  if (cellRef) anchor.cellRef = cellRef
  if (header) anchor.header = header
  if (laneId) anchor.laneId = laneId
  if (originLocode) anchor.originLocode = originLocode
  if (destLocode) anchor.destLocode = destLocode
  if (equipmentType) anchor.equipmentType = equipmentType
  if (typeof row.rowIndex === "number" && Number.isInteger(row.rowIndex)) {
    anchor.rowIndex = row.rowIndex
  }
  const fees = row.feeHeadings ?? row.surchargeSlots
  if (Array.isArray(fees)) {
    const headings = fees.filter(
      (item): item is string => typeof item === "string"
    )
    if (headings.length > 0) anchor.feeHeadings = headings
  }
  return Object.keys(anchor).length > 0 ? anchor : null
}

/**
 * Build a fingerprint from a stored source file. `anchors` / `rowHints` /
 * `mappingAnchors` on parseMetadata are optional; without them, classification
 * reuses lanes on sheets that still exist.
 */
export function fingerprintFromSource(source: {
  sheetNames?: string[] | null
  parseMetadata?: Record<string, unknown> | null
}): MappingReuseContext {
  const sheetNames = source.sheetNames ?? []
  const meta = source.parseMetadata ?? {}
  const raw = [meta.anchors, meta.rowHints, meta.mappingAnchors].find((value) =>
    Array.isArray(value)
  ) as unknown[] | undefined
  if (!raw) return { sheetNames }
  return {
    sheetNames,
    anchors: raw
      .map((item) => parseAnchor(item))
      .filter((anchor): anchor is MappingReuseAnchor => anchor != null),
  }
}

export function mappingReuseSummaryFromMetadata(
  metadata: unknown
): MappingReuseSummary | null {
  if (!metadata || typeof metadata !== "object") return null
  const raw = (metadata as Record<string, unknown>).mappingReuseSummary
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null
  const row = raw as Record<string, unknown>
  if (typeof row.parentRfpId !== "string" || row.parentRfpId.length === 0) {
    return null
  }
  const count = (key: string) =>
    typeof row[key] === "number" && Number.isFinite(row[key])
      ? (row[key] as number)
      : 0
  return {
    parentRfpId: row.parentRfpId,
    reused: count("reused"),
    drifted: count("drifted"),
    removed: count("removed"),
    feeDrift: count("feeDrift"),
  }
}

export function summarizeMappingReuse(
  parentRfpId: string,
  classified: MappingReuseClassification
): MappingReuseSummary {
  return {
    parentRfpId,
    reused: classified.reused.length,
    drifted: classified.drifted.length,
    removed: classified.removed.length,
    feeDrift: classified.reused.filter((item) => item.feeDrift).length,
  }
}
