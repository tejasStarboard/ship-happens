import { describe, expect, it } from "vitest"
import {
  pickPreferredScac,
  scacFromCarrierVocab,
  scacFromCarrierVocabDetailed,
} from "./index.js"

describe("scacFromCarrierVocab", () => {
  const vocab = [
    { name: "MSC", scac_codes: ["MSCU"] },
    { name: "Maersk", scac_codes: ["MAEU", "MAEU2"] },
    { name: "CMA CGM", scac_codes: ["AMCU", "CMDU", "CMCU"] },
    { name: "COSCO", scac_codes: ["CCBC", "COSU", "CSCL"] },
  ]

  it("prefers *U matching initials over first code (CMA / COSCO)", () => {
    expect(scacFromCarrierVocab(vocab, "CMA CGM")).toBe("CMDU")
    expect(scacFromCarrierVocab(vocab, "COSCO")).toBe("COSU")
    expect(scacFromCarrierVocab(vocab, "MSC")).toBe("MSCU")
    expect(scacFromCarrierVocab(vocab, "maersk")).toBe("MAEU")
  })

  it("returns null when no match — never invents", () => {
    expect(scacFromCarrierVocab(vocab, "ONE")).toBeNull()
    expect(scacFromCarrierVocab(vocab, "Wan Hai")).toBeNull()
    expect(scacFromCarrierVocab(vocab, null)).toBeNull()
    expect(scacFromCarrierVocab([], "MSC")).toBeNull()
  })

  it("exposes candidates for HITL", () => {
    const d = scacFromCarrierVocabDetailed(vocab, "CMA CGM")
    expect(d.scac).toBe("CMDU")
    expect(d.candidates).toEqual(["AMCU", "CMDU", "CMCU"])
  })
})

describe("pickPreferredScac", () => {
  it("falls back to first *U then first code", () => {
    expect(pickPreferredScac(["ZZZU", "AAAA"], "Unknown Line")).toBe("ZZZU")
    expect(pickPreferredScac(["ABCD"], "Foo")).toBe("ABCD")
    expect(pickPreferredScac([], "Foo")).toBeNull()
  })
})
