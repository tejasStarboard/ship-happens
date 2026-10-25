"use client"

import { FillDeskBoard } from "@/components/desk/fill-desk-board"
import type { RfpListItem } from "@/lib/domain/rfp/rfp.types"

/** @deprecated Prefer FillDeskBoard — kept as stable import for the fills page. */
export function RfpsTable({ rfps }: { rfps: RfpListItem[] }) {
  return <FillDeskBoard rfps={rfps} />
}
