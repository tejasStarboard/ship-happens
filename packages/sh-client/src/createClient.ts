import { loadConfig, type Config } from "./config.js"
import { ShHttp } from "./http.js"

export type CreateClientOptions = {
  appUrl?: string
  apiKey?: string
  fillId?: string | null
  fetchImpl?: typeof fetch
  config?: Config
}

export class ShipHappensClient {
  constructor(
    private readonly http: ShHttp,
    readonly defaultFillId: string | null
  ) {}

  resolveFillId(fillId?: string): string {
    const id = fillId?.trim() || this.defaultFillId
    if (!id) {
      throw new Error("Provide --fill or set SH_FILL_ID")
    }
    return id
  }

  authTest() {
    return this.http.request<{
      ok: true
      organizationId: string
      fillId: string | null
    }>("GET", "/api/sh/v1/auth/test")
  }

  status(fillId?: string) {
    const id = this.resolveFillId(fillId)
    return this.http.request<unknown>("GET", `/api/sh/v1/fills/${id}/status`)
  }

  progress(fillId?: string) {
    const id = this.resolveFillId(fillId)
    return this.http.request<unknown>("GET", `/api/sh/v1/fills/${id}/progress`)
  }

  logs(fillId?: string, options?: { limit?: number; level?: string }) {
    const id = this.resolveFillId(fillId)
    return this.http.request<unknown>("GET", `/api/sh/v1/fills/${id}/logs`, {
      query: {
        limit: options?.limit != null ? String(options.limit) : undefined,
        level: options?.level,
      },
    })
  }

  /** Per-row fill report with Starboard source + overlay + markup audit. */
  cells(fillId?: string, options?: { laneId?: string }) {
    const id = this.resolveFillId(fillId)
    return this.http.request<unknown>("GET", `/api/sh/v1/fills/${id}/cells`, {
      query: { laneId: options?.laneId },
    })
  }

  reviewsList(fillId?: string, options?: { status?: string }) {
    const id = this.resolveFillId(fillId)
    return this.http.request<unknown>("GET", `/api/sh/v1/fills/${id}/reviews`, {
      query: { status: options?.status },
    })
  }

  reviewsGet(reviewId: string, fillId?: string) {
    const id = this.resolveFillId(fillId)
    return this.http.request<unknown>(
      "GET",
      `/api/sh/v1/fills/${id}/reviews/${reviewId}`
    )
  }

  reviewsCreate(body: Record<string, unknown>, fillId?: string) {
    const id = this.resolveFillId(fillId)
    return this.http.request<unknown>(
      "POST",
      `/api/sh/v1/fills/${id}/reviews`,
      { body }
    )
  }

  reviewsUpdate(
    reviewId: string,
    body: Record<string, unknown>,
    fillId?: string
  ) {
    const id = this.resolveFillId(fillId)
    return this.http.request<unknown>(
      "PATCH",
      `/api/sh/v1/fills/${id}/reviews/${reviewId}`,
      { body }
    )
  }

  reviewsResolve(
    reviewId: string,
    body?: Record<string, unknown>,
    fillId?: string
  ) {
    const id = this.resolveFillId(fillId)
    return this.http.request<unknown>(
      "POST",
      `/api/sh/v1/fills/${id}/reviews/${reviewId}/resolve`,
      { body: body ?? {} }
    )
  }

  /** Resolve mapped lanes via Starboard (`mapping.json`) and advance Progress `rates`. */
  ratesResolve(fillId?: string) {
    const id = this.resolveFillId(fillId)
    return this.http.request<unknown>(
      "POST",
      `/api/sh/v1/fills/${id}/rates/resolve`,
      { body: {} }
    )
  }
}

export function createClient(
  opts: CreateClientOptions = {}
): ShipHappensClient {
  const base = opts.config ?? loadConfig()
  const appUrl = (opts.appUrl ?? base.appUrl).replace(/\/$/, "")
  const apiKey = opts.apiKey ?? base.apiKey
  const fillId = opts.fillId !== undefined ? opts.fillId : base.fillId

  if (!appUrl) throw new Error("SH_APP_URL is required")
  if (!apiKey) throw new Error("SH_API_KEY is required")

  return new ShipHappensClient(
    new ShHttp(appUrl, apiKey, opts.fetchImpl ?? fetch),
    fillId
  )
}
