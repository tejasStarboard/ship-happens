/**
 * Sheet / common aliases → UN/LOCODE lists for contract resolve.
 * Versioned from bid-fill dogfood — never invents unknown ports.
 */

/** Exact code or short label → preferred locode list. */
export const LOCODE_ALIASES: Record<string, string[]> = {
  // Nordstrom / short port codes
  SHA: ["CNSHA"],
  SZA: ["CNSHK", "CNSZX", "CNYTN"],
  XMN: ["CNXMN"],
  DLC: ["CNDLC"],
  BOM: ["INNSA", "INBOM", "INMUN"],
  DEL: ["INICD", "INDEL", "INMUN"],
  HPH: ["VNHPH"],
  SGN: ["VNSGN"],
  CGP: ["BDCGP"],
  JKT: ["IDJKT"],
  IST: ["TRIST", "TRAMR"],
  IZM: ["TRIZM", "TRALI"],
  SSZ: ["BRSSZ"],
  HKG: ["HKHKG"],
  PUS: ["KRPUS"],
  MAA: ["INMAA"],
  TSN: ["CNTXG", "CNTSN"],
  PNH: ["KHPNH"],
  KOS: ["KHKOS"],
  // Sheet typos
  CNNBO: ["CNNGB"],
  // Destination bundles
  "TCM/SEA - CY": ["USSEA", "USTIW", "USPDX"],
  "TCM/SEA": ["USSEA", "USTIW", "USPDX"],
  "NY/NJ - CY": ["USNYC", "USEWR"],
  "NY/NJ": ["USNYC", "USEWR"],
  "LA/LB": ["USLAX", "USLGB"],
  "LA/LGB": ["USLAX", "USLGB"],
  "USEC PORTS": ["USNYC", "USSAV", "USORF", "USCHS"],
  "USWC PORTS": ["USLAX", "USLGB", "USSEA", "USTIW", "USOAK"],
}

/** Port / city display names → locodes (POL-heavy). */
export const NAME_TO_LOCODES: Record<string, string[]> = {
  YANTIAN: ["CNYTN", "CNSHK"],
  SHANGHAI: ["CNSHA"],
  NINGBO: ["CNNGB"],
  QINGDAO: ["CNTAO"],
  DALIAN: ["CNDLC"],
  XIAOMEN: ["CNXMN"],
  XIAMEN: ["CNXMN"],
  TIANJIN: ["CNTXG", "CNTSN"],
  XINGANG: ["CNTXG"],
  SHEKOU: ["CNSHK"],
  NANSHA: ["CNNSA"],
  FUZHOU: ["CNFOC"],
  "HO CHI MINH": ["VNSGN"],
  HAIPHONG: ["VNHPH"],
  "HAI PHONG": ["VNHPH"],
  "PHNOM PENH": ["KHPNH"],
  SIHANOUKVILLE: ["KHKOS"],
  JAKARTA: ["IDJKT"],
  "PORT KLANG": ["MYPKG"],
  "PASIR GUDANG": ["MYPGU"],
  "LAEM CHABANG": ["THLCH"],
  BANGKOK: ["THBKK"],
  BUSAN: ["KRPUS"],
  PUSAN: ["KRPUS"],
  "HONG KONG": ["HKHKG"],
  KAOHSIUNG: ["TWKHH"],
  TAICHUNG: ["TWTXG"],
  KEELUNG: ["TWKEL"],
  CHITTAGONG: ["BDCGP"],
  CHATTOGRAM: ["BDCGP"],
  CHENNAI: ["INMAA"],
  MADRAS: ["INMAA"],
  "NHAVA SHEVA": ["INNSA"],
  MUMBAI: ["INNSA", "INBOM"],
  BOMBAY: ["INNSA", "INBOM"],
  COLOMBO: ["LKCMB"],
  ANTWERP: ["BEANR"],
  ROTTERDAM: ["NLRTM"],
  HAMBURG: ["DEHAM"],
  BREMERHAVEN: ["DEBRV"],
  FELIXSTOWE: ["GBFXT"],
  "LE HAVRE": ["FRLEH"],
  GENOA: ["ITGOA"],
  "LA SPEZIA": ["ITSPE"],
  VALENCIA: ["ESVLC"],
  BARCELONA: ["ESBCN"],
  "BUENOS AIRES": ["ARBUE"],
  SANTOS: ["BRSSZ"],
  MANZANILLO: ["MXZLO", "PAMIT"],
  CALLAO: ["PECLL"],
  CARTAGENA: ["COCTG", "ESCAG"],
  QINZHOU: ["CNQZH"],
  WUHAN: ["CNWUH"],
  CHANGZHOU: ["CNCZX"],
  "LOS ANGELES": ["USLAX"],
  "LONG BEACH": ["USLGB"],
  "NEW YORK": ["USNYC"],
  SAVANNAH: ["USSAV"],
  MOBILE: ["USMOB"],
  HOUSTON: ["USHOU"],
  TAMPA: ["USTPA"],
  SEATTLE: ["USSEA"],
  TACOMA: ["USTIW"],
  OAKLAND: ["USOAK"],
  CHARLESTON: ["USCHS"],
  NORFOLK: ["USORF"],
}

const UNLOCODE_RE = /^[A-Z]{2}[A-Z0-9]{3}$/

function normalizeKey(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().toUpperCase()
}

export type CanonicalizeResult = {
  query: string
  locodes: string[]
  source: "alias" | "name" | "unlocode" | "empty"
  reason?: string
}

/**
 * Map a sheet code/label to locode list. Unknown → empty + reason (no guessing).
 */
export function canonicalizeLocode(codeOrLabel: string): CanonicalizeResult {
  const query = codeOrLabel.trim()
  if (!query) {
    return { query, locodes: [], source: "empty", reason: "empty_query" }
  }
  const key = normalizeKey(query)

  if (LOCODE_ALIASES[key]) {
    return { query, locodes: [...LOCODE_ALIASES[key]], source: "alias" }
  }
  if (NAME_TO_LOCODES[key]) {
    return { query, locodes: [...NAME_TO_LOCODES[key]], source: "name" }
  }
  for (const [k, v] of Object.entries(NAME_TO_LOCODES)) {
    if (key.includes(k) || k.includes(key)) {
      return { query, locodes: [...v], source: "name" }
    }
  }
  if (UNLOCODE_RE.test(key)) {
    return { query, locodes: [key], source: "unlocode" }
  }
  return {
    query,
    locodes: [],
    source: "empty",
    reason: "unknown_alias",
  }
}

export type ResolveLaneForFillResult = {
  origin: CanonicalizeResult
  destination: CanonicalizeResult
  origin_locodes: string[]
  destination_locodes: string[]
  ok: boolean
  reason?: string
}

export function resolveLaneLocodesForFill(args: {
  origin: string
  destination: string
}): ResolveLaneForFillResult {
  const origin = canonicalizeLocode(args.origin)
  const destination = canonicalizeLocode(args.destination)
  const ok = origin.locodes.length > 0 && destination.locodes.length > 0
  return {
    origin,
    destination,
    origin_locodes: origin.locodes,
    destination_locodes: destination.locodes,
    ok,
    reason: ok
      ? undefined
      : [
          !origin.locodes.length ? `origin:${origin.reason ?? "empty"}` : null,
          !destination.locodes.length
            ? `destination:${destination.reason ?? "empty"}`
            : null,
        ]
          .filter(Boolean)
          .join(";"),
  }
}
