/** SYNC: twin of apps/webapp/utils/shared/quotes/teuFactor.ts — keep identical; see src/engine/README.md */
/**
 * SB-3192 — canonical equipment-type → TEU factor for per-TEU BILLING.
 *
 * 20-class = 1, 40-class = 2, 45-class = 2.5332.
 *
 * The 45-class number is not geometry. It is a customer-verified charging
 * ratio (sourced by Abhimanyu from a live customer, confirmed by James on
 * PR #5030): `1.2666 × {40HC amount} = {45HC amount}`, and 2.5332 / 2 is
 * exactly 1.2666. Round 1 of this ticket shipped 45-class = 2 and was blocked
 * in review for precisely this reason.
 *
 * Distinct from TEU *slot capacity*, which is still an integer 2 for a 45'
 * box — that lives in `apps/backend/app/utils/unit_conversions.py:teu_per_container`
 * (SB-4087) and feeds sourcing thresholds and analytics, never money. Don't
 * conflate them: a wrong factor here halves or doubles an invoice line, a
 * wrong factor there silently moves an auto-sourcing gate.
 *
 * Keyed by equipment-type strings (`20GP`, `40HC`, `45G1`, …) — the leading
 * size prefix decides the class, so carrier suffix variants (GP/DV/HC/NOR/
 * REEF/OT) and ISO codes all resolve without enumeration.
 *
 * Absent/unrecognized equipment degrades to 1: the row then bills exactly like
 * per_container — it can under-bill a 40ft, but never silently doubles a fee.
 *
 * Twins (kept in lockstep, pinned by parity tests + the
 * `check-sb3192-teu-factor-sync.sh` guard, which pins the literal 2.5332
 * across all three languages):
 *   add-in `apps/outlook-addin/src/taskpane/rfq-v2/store/rates/surcharges/teuFactor.ts`
 *   Python `apps/backend/app/utils/unit_conversions.py:teu_billing_factor`
 *          (reached from `app/internal/rfq_v2/usage_unit.py:teu_factor`)
 */
export function teuFactor(equipmentType: string | null | undefined): number {
  const eq = (equipmentType ?? "").trim()
  if (eq.startsWith("45")) {
    return 2.5332
  }
  if (eq.startsWith("40")) {
    return 2
  }
  return 1
}
