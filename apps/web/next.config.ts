import path from "node:path"
import { fileURLToPath } from "node:url"
import { withEve } from "eve/next"

const appDir = path.dirname(fileURLToPath(import.meta.url))

// Avoid importing `NextConfig` from `next` here — the monorepo can resolve two
// next peer graphs, and that makes `withEve(nextConfig)` fail typecheck.
export default withEve({
  // Playwright hits 127.0.0.1; without this, Next blocks /_next assets and
  // client hydration never runs (e2e waitForAppReady hangs until timeout).
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  // Keep Node DB drivers out of the bundler; client UI must import
  // `@ship-happens/fill/browser` for labels/types (not the server barrel).
  serverExternalPackages: ["pg", "ioredis", "@workspace/db"],
  // @workspace/db + @ship-happens/fill ship prebuilt dist/ (tsup); ui stays source.
  transpilePackages: ["@workspace/ui"],
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
