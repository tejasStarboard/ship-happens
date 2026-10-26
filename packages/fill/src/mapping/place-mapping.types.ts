import type { MappedLane } from "../rates/mapped-lane"
import type { PlaceCandidateChip, PlaceResolveResult } from "./geo-ports"
import type { ReviewItemView } from "../review/review-item.types"

/** Agent-supplied lane with free-text O-D labels (equipment already known). */
export type LanePlaceInput = {
  laneId: string
  originLabel: string
  destLabel: string
  equipmentType: string
  validFrom?: string
  validTo?: string
  serviceType?: MappedLane["serviceType"]
  sheetName?: string
  rowIndex?: number
  columnKey?: string
  cellRef?: string
  surchargeSlots?: string[]
}

export type ProposeLanesInput = {
  lanes: LanePlaceInput[]
  /** Optional CRM customer label — match fails open. */
  customerLabel?: string | null
}

export type LanePlaceProposal = {
  laneId: string
  action: "upserted" | "review"
  confidence: number
  origin: PlaceResolveResult
  destination: PlaceResolveResult
  lane: MappedLane | null
  reviewId: string | null
}

export type ProposeLanesResult = {
  fillId: string
  upsertedCount: number
  reviewCount: number
  customerMatch: {
    displayName: string
    confidence: number
    applied: boolean
  } | null
  lanes: LanePlaceProposal[]
  reviews: ReviewItemView[]
}

export type MapReviewProposal = {
  laneId: string
  originLocode: string
  destLocode: string
  equipmentType: string
  originLabel: string
  destLabel: string
  originCandidates: PlaceCandidateChip[]
  destCandidates: PlaceCandidateChip[]
  validFrom?: string
  validTo?: string
  serviceType?: string
  sheetName?: string
  rowIndex?: number
  columnKey?: string
  cellRef?: string
  surchargeSlots?: string[]
}
