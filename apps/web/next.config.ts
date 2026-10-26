import path from "node:path"
import { fileURLToPath } from "node:url"
import { withEve } from "eve/next"

const appDir = path.dirname(fileURLToPath(import.meta.url))

/** Hostnames for tunnels (ngrok, etc.) so Next allows /_next + HMR in dev. */
function extraDevOrigins(): string[] {
  const hosts = new Set<string>()
  for (const raw of [process.env.APP_URL, process.env.NEXT_PUBLIC_APP_URL]) {
    if (!raw) continue
    try {
      const { hostname } = new URL(raw)
      if (hostname && hostname !== "localhost" && hostname !== "127.0.0.1") {
        hosts.add(hostname)
      }
    } catch {
      // ignore invalid URL
    }
  }
  return [...hosts]
}

// Avoid importing `NextConfig` from `next` here — the monorepo can resolve two
// next peer graphs, and that makes `withEve(nextConfig)` fail typecheck.
export default withEve({
  // Playwright hits 127.0.0.1; without this, Next blocks /_next assets and
  // client hydration never runs (e2e waitForAppReady hangs until timeout).
  // Tunnel hosts (ngrok) must be listed or Google/social clicks appear to no-op.
  allowedDevOrigins: ["127.0.0.1", "localhost", ...extraDevOrigins()],
  // Keep Node DB drivers out of the bundler; client UI must import
  // `@ship-happens/fill/browser` for labels/types (not the server barrel).
  serverExternalPackages: ["pg", "ioredis", "@ship-happens/db"],
  // @ship-happens/db + @ship-happens/fill ship prebuilt dist/ (tsup); ui stays source.
  transpilePackages: ["@ship-happens/ui"],
  // Include the vendored sb-client CLI (copied in build:sb-client-cli) in every
  // serverless/workflow bundle — dynamic fs reads are not auto-traced.
  outputFileTracingRoot: path.join(appDir, "../.."),
  outputFileTracingIncludes: {
    "/*": [
      "./lib/starboard/vendor/sb-client.cli.js",
      "./lib/sh-client/vendor/sh-client.cli.js",
    ],
  },
  experimental: {
    // Marks this install as upgraded via `next upgrade --agent=security`.
    agentUpgrade: "security",
  },
})
