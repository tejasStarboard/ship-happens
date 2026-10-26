import {
  UNEXPECTED_FEE_SETTINGS_PATH,
  type UnexpectedFeeMode,
} from "./fee-bindings"

export type UnexpectedFeeWarningPayload = {
  mode: UnexpectedFeeMode
  count: number
  titles: string[]
  settingsPath: string
}

const SOFT_WARN_PREFIX = "UNEXPECTED_FEE_SOFT_WARN:"

export function encodeUnexpectedFeeSoftWarn(
  warning: UnexpectedFeeWarningPayload
): string {
  return `${SOFT_WARN_PREFIX}${JSON.stringify(warning)}`
}

export function parseUnexpectedFeeSoftWarn(
  message: string
): UnexpectedFeeWarningPayload | null {
  if (!message.startsWith(SOFT_WARN_PREFIX)) return null
  try {
    const raw = JSON.parse(message.slice(SOFT_WARN_PREFIX.length)) as unknown
    if (!raw || typeof raw !== "object") return null
    const obj = raw as Record<string, unknown>
    if (obj.mode !== "soft_warn" && obj.mode !== "hard_block") return null
    if (typeof obj.count !== "number") return null
    if (!Array.isArray(obj.titles)) return null
    return {
      mode: obj.mode,
      count: obj.count,
      titles: obj.titles.map(String),
      settingsPath:
        typeof obj.settingsPath === "string"
          ? obj.settingsPath
          : UNEXPECTED_FEE_SETTINGS_PATH,
    }
  } catch {
    return null
  }
}
