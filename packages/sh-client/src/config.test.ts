import { describe, expect, it } from "vitest"
import { loadConfig } from "./config.js"

describe("loadConfig", () => {
  it("requires app url and api key", () => {
    expect(() => loadConfig({})).toThrow(/SH_APP_URL/)
    expect(() => loadConfig({ SH_APP_URL: "http://localhost:3000" })).toThrow(
      /SH_API_KEY/
    )
  })

  it("loads fill id when present", () => {
    const cfg = loadConfig({
      SH_APP_URL: "http://localhost:3000/",
      SH_API_KEY: "sh_test",
      SH_FILL_ID: "fill_abc",
    })
    expect(cfg.appUrl).toBe("http://localhost:3000")
    expect(cfg.apiKey).toBe("sh_test")
    expect(cfg.fillId).toBe("fill_abc")
  })
})
