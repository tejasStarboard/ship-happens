"use client"

import type { MappedLane } from "@/lib/domain/rfp/rfp.types"

function laneRoute(lane: MappedLane) {
  return `${lane.originLocode} → ${lane.destLocode}`
}

export function FillMapPanel({ lanes }: { lanes: MappedLane[] }) {
  if (lanes.length === 0) {
    return (
      <div className="flex flex-col gap-2 py-8">
        <h2 className="text-base font-medium tracking-tight">Map</h2>
        <p className="max-w-lg text-sm text-muted-foreground">
          No confirmed lanes yet. Persist mapping with{" "}
          <code className="text-xs">sh-client mapping put</code> or import
          workspace <code className="text-xs">mapping.json</code>, then resolve
          rates. Schema confirm UI comes later.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-base font-medium tracking-tight">Map</h2>
        <p className="text-sm text-muted-foreground">
          {lanes.length} confirmed lane{lanes.length === 1 ? "" : "s"}{" "}
          (Postgres). Rates resolve reads this store.
        </p>
      </div>
      <div className="overflow-x-auto rounded-[6px] border border-border">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Lane</th>
              <th className="px-3 py-2 font-medium">Route</th>
              <th className="px-3 py-2 font-medium">Equipment</th>
              <th className="px-3 py-2 font-medium">Service</th>
              <th className="px-3 py-2 font-medium">Sheet / cell</th>
            </tr>
          </thead>
          <tbody>
            {lanes.map((lane) => (
              <tr
                key={lane.laneId}
                className="border-b border-border last:border-0"
              >
                <td className="px-3 py-2 font-mono text-xs">{lane.laneId}</td>
                <td className="px-3 py-2">{laneRoute(lane)}</td>
                <td className="px-3 py-2">{lane.equipmentType}</td>
                <td className="px-3 py-2 text-muted-foreground">
                  {lane.serviceType ?? "—"}
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {[lane.sheetName, lane.cellRef ?? lane.columnKey]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
