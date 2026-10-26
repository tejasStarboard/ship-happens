import { describe, expect, it, vi } from "vitest"
import type { StarboardHttp } from "../../http/starboardHttp.js"
import {
  getRateDocSignedUrl,
  isRateDocId,
  provenanceFromSearchHit,
} from "./rateDocSignedUrl.js"

describe("isRateDocId", () => {
  it("accepts UUIDs and rejects synthetic adhoc ids", () => {
    expect(isRateDocId("a1b2c3d4-0000-4000-8000-000000000000")).toBe(true)
    expect(isRateDocId("adhoc_a1b2c3d4-0000-4000-8000-000000000000")).toBe(
      false
    )
    expect(isRateDocId("")).toBe(false)
  })
})

describe("provenanceFromSearchHit", () => {
  it("reads vendor_rate_doc_id and vendor_email_url", () => {
    expect(
      provenanceFromSearchHit({
        vendor_rate_doc_id: "a1b2c3d4-0000-4000-8000-000000000000",
        vendor_email_url: "https://signed.example/mail.eml",
      })
    ).toEqual({
      vendorRateDocId: "a1b2c3d4-0000-4000-8000-000000000000",
      vendorEmailUrl: "https://signed.example/mail.eml",
    })
  })

  it("returns nulls when absent", () => {
    expect(provenanceFromSearchHit({})).toEqual({
      vendorRateDocId: null,
      vendorEmailUrl: null,
    })
  })
})

describe("getRateDocSignedUrl", () => {
  it("skips HTTP for non-UUID ids", async () => {
    const request = vi.fn()
    const http = { request } as unknown as StarboardHttp
    const result = await getRateDocSignedUrl(http, "adhoc_x")
    expect(request).not.toHaveBeenCalled()
    expect(result).toMatchObject({
      signedUrl: null,
      error: "file_not_found",
    })
  })

  it("maps a successful BFF response", async () => {
    const request = vi.fn().mockResolvedValue({
      signedUrl: "https://signed.example/sheet.pdf",
      name: "MSC CNSHA.pdf",
      emailDisplayData: { subject: "Rates" },
    })
    const http = { request } as unknown as StarboardHttp
    const id = "a1b2c3d4-0000-4000-8000-000000000000"
    const result = await getRateDocSignedUrl(http, id)
    expect(request).toHaveBeenCalledWith(
      "GET",
      `/vendor_rates/rate_docs/get_signed_url?rate_doc_id=${id}`
    )
    expect(result).toEqual({
      signedUrl: "https://signed.example/sheet.pdf",
      name: "MSC CNSHA.pdf",
      hasEmailSource: true,
      error: null,
      message: null,
    })
  })
})
