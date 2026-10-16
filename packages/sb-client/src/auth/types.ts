export interface AuthSession {
  /** Tenant the client may act for. Always from verified credentials — never a caller override. */
  companyId: string
  /** Present when authenticated via public_api_clients. */
  clientId: string | null
}

export class AuthError extends Error {
  readonly statusCode: number

  constructor(message: string, statusCode = 401) {
    super(message)
    this.name = "AuthError"
    this.statusCode = statusCode
  }
}
