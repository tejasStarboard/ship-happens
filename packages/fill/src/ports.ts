/**
 * Runtime ports — inject from Next, worker, or CLI so fill stays framework-free.
 */

export type {
  MappingStore,
  RateResolveSearchInput,
  ResolvedRateCandidate,
  ResolvedSurchargeCandidate,
  StarboardRatesPort,
} from "./rates/rate-ports"

export type BlobUploadResult = {
  url: string
  pathname: string
}

export type BlobStore = {
  upload(input: {
    pathname: string
    body: Buffer
    contentType: string
    addRandomSuffix?: boolean
  }): Promise<BlobUploadResult>
  delete(urlOrUrls: string | string[]): Promise<void>
}

export type EnsureRfpWorkspaceInput = {
  organizationId: string
  ownerUserId: string
  rfp: {
    id: string
    name: string
    customer?: string | null
    status?:
      "queued" | "running" | "needs_review" | "done" | "failed" | "cancelled"
  }
}

export type WorkspaceHost = {
  ensureRfpWorkspace(input: EnsureRfpWorkspaceInput): Promise<unknown>
  /** Write bytes under the host workspace mirror (e.g. `source/file.xlsx`). */
  writeWorkspaceFile(
    workspaceId: string,
    relativePath: string,
    content: Buffer | string
  ): Promise<void>
}
