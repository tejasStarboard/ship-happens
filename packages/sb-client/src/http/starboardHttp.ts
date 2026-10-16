import type { AuthSession } from "../auth/types.js"
import { AuthError } from "../auth/types.js"

export class StarboardApiError extends Error {
  readonly statusCode: number
  readonly body: unknown

  constructor(message: string, statusCode: number, body: unknown) {
    super(message)
    this.name = "StarboardApiError"
    this.statusCode = statusCode
    this.body = body
  }
}

/**
 * Thin HTTP client for the Next.js webapp.
 * Handshake + X-User-Company-Id — no direct Postgres.
 */
export class StarboardHttp {
  constructor(
    private readonly appDomain: string,
    private readonly handshakeKey: string,
    private readonly session: AuthSession,
    private readonly fetchImpl: typeof fetch = fetch
  ) {}

  get companyId(): string {
    return this.session.companyId
  }

  get clientId(): string | null {
    return this.session.clientId
  }

  private headers(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      "x-starboard-handshake-key": this.handshakeKey,
      "x-user-company-id": this.session.companyId,
    }
  }

  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.appDomain}/api${path}`
    const res = await this.fetchImpl(url, {
      method,
      headers: this.headers(),
      body: body === undefined ? undefined : JSON.stringify(body),
    })

    const text = await res.text()
    let parsed: unknown = null
    if (text) {
      try {
        parsed = JSON.parse(text)
      } catch {
        parsed = text
      }
    }

    if (res.status === 401) {
      throw new AuthError(
        "Unauthorized (handshake or company scope rejected)",
        401
      )
    }
    if (!res.ok) {
      const msg =
        typeof parsed === "object" &&
        parsed !== null &&
        "error" in parsed &&
        typeof (parsed as { error: unknown }).error === "string"
          ? (parsed as { error: string }).error
          : `Starboard API ${method} ${path} failed (${res.status})`
      throw new StarboardApiError(msg, res.status, parsed)
    }

    return parsed as T
  }
}
