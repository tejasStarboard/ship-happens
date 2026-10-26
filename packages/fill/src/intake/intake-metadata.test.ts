import { describe, expect, it } from "vitest"
import { z } from "zod"
import { ALLOWED_SPREADSHEET_MIME_TYPES } from "../spreadsheet-constants"

/** Mirrors SpreadsheetUploadInput email + metadata fields for unit coverage. */
const emailProvenanceSchema = z.object({
  provider: z.enum(["gmail", "outlook"]),
  messageId: z.string().min(1),
  threadId: z.string().optional(),
  from: z.string().optional(),
  subject: z.string().optional(),
  receivedAt: z.string().optional(),
})

const spreadsheetUploadSchema = z.object({
  fileName: z.string().min(1).max(255),
  contentType: z.enum(ALLOWED_SPREADSHEET_MIME_TYPES),
  base64: z.string().min(1),
  name: z.string().min(1).max(200),
  customer: z.string().max(200).optional(),
  templateId: z.string().min(1).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  email: emailProvenanceSchema.optional(),
})

describe("SpreadsheetUploadInput email provenance", () => {
  it("accepts email metadata for intake", () => {
    const parsed = spreadsheetUploadSchema.parse({
      fileName: "bco.xlsx",
      contentType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      base64: "YQ==",
      name: "Walmart RFP",
      email: {
        provider: "gmail",
        messageId: "msg_1",
        from: "buyer@example.com",
        subject: "Please fill",
      },
    })
    expect(parsed.email?.provider).toBe("gmail")
    expect(parsed.email?.messageId).toBe("msg_1")
  })

  it("allows upload without email", () => {
    const parsed = spreadsheetUploadSchema.parse({
      fileName: "bco.xlsx",
      contentType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      base64: "YQ==",
      name: "Manual upload",
    })
    expect(parsed.email).toBeUndefined()
  })
})
