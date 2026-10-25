import type { RfpListItem } from "@/lib/domain/rfp/rfp.types"

/** Dev-only worst-case fixture for break-ui stress on the Fills table. */
export const FILLS_WORST_CASE: RfpListItem[] = [
  {
    id: "worst-long-name",
    name: "Walmart Trans-Pacific FY27 Round 3 — Asia Origin All Ports Bid Sheet (Rev C, columns reshuffled)",
    customer:
      "Northwind Industries Holdings International Logistics Procurement LLC",
    templateName:
      "BCO_Jaggaer_Export_Template_v12_with_surcharge_slots_and_equipment_matrix.xlsx",
    status: "needs_review",
    updatedAt: new Date().toISOString(),
    owner: "Aleksandra Wiśniewska-Kowalczyk",
  },
  {
    id: "worst-short",
    name: "J",
    customer: "",
    templateName: "",
    status: "queued",
    updatedAt: new Date().toISOString(),
    owner: "Jo",
  },
  {
    id: "worst-cjk",
    name: "華潤物流 2026 年度招標（上海／寧波／鹽田）",
    customer: "深圳市前海集運有限公司",
    templateName: "招標文件_最終版.xlsx",
    status: "running",
    updatedAt: new Date().toISOString(),
    owner: "陳偉明",
  },
  {
    id: "worst-failed",
    name: "Nike Ocean FCL — urgent 48h turnaround",
    customer: "Nike Inc.",
    templateName: "nike_ocean_rfp.xlsx",
    status: "failed",
    updatedAt: new Date("2020-01-01T00:00:00.000Z").toISOString(),
    owner: "bartholomew.fitzgerald@northwind-industries-holdings.example.com",
  },
  {
    id: "worst-done",
    name: "Target Import Contract Rates Response",
    customer: "Target Corporation",
    templateName: "target_bid.xlsx",
    status: "done",
    updatedAt: new Date().toISOString(),
    owner: "Julie Adams",
  },
]
