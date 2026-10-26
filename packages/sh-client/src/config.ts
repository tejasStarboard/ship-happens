export type Config = {
  appUrl: string
  apiKey: string
  fillId: string | null
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const appUrl = (env.SH_APP_URL ?? env.APP_URL ?? "").replace(/\/$/, "")
  const apiKey = env.SH_API_KEY ?? ""
  const fillId = env.SH_FILL_ID?.trim() || null

  if (!appUrl) {
    throw new Error("SH_APP_URL (or APP_URL) is required")
  }
  if (!apiKey) {
    throw new Error("SH_API_KEY is required")
  }

  return { appUrl, apiKey, fillId }
}
