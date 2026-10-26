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

/** One designated response cell for cell-compliant write-back. */
export type WorkbookCellWrite = {
  sheetName: string
  cellRef: string
  value: string
}

/**
 * Host-injected workbook writer — prefer `uvx agent-xlsx write` (openpyxl)
 * so locks, validation, formulas, and formats survive round-trip.
 */
export type WorkbookWritePort = {
  writeCells(input: {
    source: Buffer
    fileName: string
    cells: WorkbookCellWrite[]
  }): Promise<Buffer>
}

/** Fetch intake source bytes (typically HTTP GET of public Blob URL). */
export type SourceBytesFetcher = {
  fetch(url: string): Promise<Buffer>
}
