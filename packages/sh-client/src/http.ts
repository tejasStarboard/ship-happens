import { ShClientError } from "./errors.js"

export class ShHttp {
  constructor(
    private readonly appUrl: string,
    private readonly apiKey: string,
    private readonly fetchImpl: typeof fetch = fetch
  ) {}

  async request<T>(
    method: string,
    path: string,
    options?: { query?: Record<string, string | undefined>; body?: unknown }
  ): Promise<T> {
    const url = new URL(path, `${this.appUrl}/`)
    if (options?.query) {
      for (const [key, value] of Object.entries(options.query)) {
        if (value != null && value !== "") url.searchParams.set(key, value)
      }
    }

    const res = await this.fetchImpl(url, {
      method,
      headers: {
        Accept: "application/json",
        "x-api-key": this.apiKey,
        ...(options?.body != null
          ? { "Content-Type": "application/json" }
          : {}),
      },
      body: options?.body != null ? JSON.stringify(options.body) : undefined,
    })

    const text = await res.text()
    let data: unknown = null
    if (text) {
      try {
        data = JSON.parse(text) as unknown
      } catch {
        data = { error: text }
      }
    }

    if (!res.ok) {
      const errObj =
        data && typeof data === "object"
          ? (data as Record<string, unknown>)
          : {}
      const message =
        typeof errObj.error === "string"
          ? errObj.error
          : `Request failed (${res.status})`
      const code = typeof errObj.code === "string" ? errObj.code : undefined
      throw new ShClientError(message, res.status, code)
    }

    return data as T
  }
}
