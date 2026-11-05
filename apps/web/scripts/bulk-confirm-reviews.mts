/**
 * One-shot: Confirm all pending reviews for a fill (map HITL bulk ack).
 * Usage (from apps/web):
 *   pnpm exec tsx --tsconfig ./tsconfig.json ./scripts/bulk-confirm-reviews.mts <fillId>
 */
import { createAppContext } from "../lib/di/create-app-context"

const fillId = process.argv[2]
if (!fillId?.startsWith("fill_")) {
  console.error("Usage: bulk-confirm-reviews.mts <fillId>")
  process.exit(1)
}

const ctx = createAppContext()
const fill = await ctx.repos.rfps.findById(fillId)
if (!fill) {
  console.error("Fill not found:", fillId)
  process.exit(1)
}

const organizationId = fill.organizationId
const userId = fill.ownerUserId ?? "bulk-confirm-script"
const pending = await ctx.reviews.list(organizationId, fillId, {
  status: "pending",
})
console.log(`Confirming ${pending.length} pending review(s) on ${fillId}`)

let ok = 0
let fail = 0
for (const rev of pending) {
  try {
    await ctx.reviews.decide(
      organizationId,
      fillId,
      rev.id,
      { decision: "approved" },
      userId
    )
    ok++
    if (ok % 10 === 0) console.log(`  confirmed ${ok}/${pending.length}`)
  } catch (e) {
    fail++
    console.error(`  fail ${rev.id}:`, e instanceof Error ? e.message : e)
  }
}

const left = await ctx.reviews.list(organizationId, fillId, {
  status: "pending",
})
const lanes = await ctx.repos.fillMappings.listByRfpId(fillId)
console.log(
  JSON.stringify(
    { ok, fail, pendingLeft: left.length, mappedLanes: lanes.length },
    null,
    2
  )
)
process.exit(fail > 0 || left.length > 0 ? 1 : 0)
