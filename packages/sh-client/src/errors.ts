export class ShClientError extends Error {
  readonly status: number
  readonly code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = "ShClientError"
    this.status = status
    this.code = code
  }
}
