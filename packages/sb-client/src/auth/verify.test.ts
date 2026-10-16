import { describe, expect, it } from "vitest"
import { parseBasicAuthHeader } from "./verify.js"
import { AuthError } from "./types.js"
import { loadConfig } from "../config.js"

describe("parseBasicAuthHeader", () => {
  it("parses client_id:client_secret", () => {
    const token = Buffer.from("cid:csecret", "utf8").toString("base64")
    expect(parseBasicAuthHeader(`Basic ${token}`)).toEqual({
      clientId: "cid",
      clientSecret: "csecret",
    })
  })

  it("rejects missing header", () => {
    expect(() => parseBasicAuthHeader(undefined)).toThrow(AuthError)
  })
})

describe("loadConfig", () => {
  const base = {
    STARBOARD_APP_DOMAIN: "http://localhost:3000",
    STARBOARD_HANDSHAKE_KEY: "hk",
  }

  it("accepts public API client credentials", () => {
    const cfg = loadConfig({
      ...base,
      SB_CLIENT_CLIENT_ID: "c1",
      SB_CLIENT_CLIENT_SECRET: "s1",
    })
    expect(cfg.clientId).toBe("c1")
    expect(cfg.companyId).toBeNull()
  })

  it("accepts company-id mode", () => {
    const cfg = loadConfig({
      ...base,
      SB_CLIENT_COMPANY_ID: "00000000-0000-0000-0000-000000000001",
    })
    expect(cfg.companyId).toBe("00000000-0000-0000-0000-000000000001")
  })

  it("rejects missing auth", () => {
    expect(() => loadConfig({ ...base })).toThrow(/Auth required/)
  })
})
