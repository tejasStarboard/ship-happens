import type { StarboardHttp } from "../../http/starboardHttp.js"
import {
  classifySurchargeName,
  rollupCharges,
  type RollupInputCharge,
} from "../../lib/chargeOntology.js"
import {
  filterGlobals,
  type GlobalListFilters,
  type RateItemRow,
} from "./filter.js"

export type { RateItemRow, GlobalListFilters }

export class GlobalsModule {
  constructor(private readonly http: StarboardHttp) {}

  async list(opts?: {
    service?: string | string[]
    filters?: GlobalListFilters
  }): Promise<{ company_id: string; count: number; data: RateItemRow[] }> {
    const params = new URLSearchParams()
    const service = opts?.service
    if (Array.isArray(service)) {
      for (const s of service) params.append("service", s)
    } else if (service) {
      params.set("service", service)
    }
    const qs = params.toString()
    const { data } = await this.http.request<{ data: RateItemRow[] }>(
      "GET",
      `/settings/quote_tool/rate_items${qs ? `?${qs}` : ""}`
    )
    const items = filterGlobals(data ?? [], opts?.filters ?? {})
    return { company_id: this.http.companyId, count: items.length, data: items }
  }

  /** MVP: service + has_default_rate (+ optional name). Full geo/agent matching is later. */
  async matchToLane(opts: {
    service: string
    defaults_only?: boolean
    name_contains?: string
  }) {
    const defaultsOnly = opts.defaults_only !== false
    const result = await this.list({
      service: opts.service,
      filters: {
        has_default_rate: defaultsOnly ? true : undefined,
        name_contains: opts.name_contains,
      },
    })
    const data = result.data.map((i) => ({
      ...i,
      classification: classifySurchargeName(i.name ?? ""),
    }))
    return {
      ...result,
      data,
      service: opts.service,
      note: "MVP filter is service + defaults. Full group-code / agent / network matching not applied yet.",
    }
  }

  classify(name: string) {
    return classifySurchargeName(name)
  }

  rollup(params: {
    charges: RollupInputCharge[]
    headings?: string[]
    heading_buckets?: Parameters<typeof rollupCharges>[0]["heading_buckets"]
  }) {
    return rollupCharges(params)
  }
}
