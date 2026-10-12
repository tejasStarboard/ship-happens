import { withEve } from "eve/next"

// Avoid importing `NextConfig` from `next` here — the monorepo can resolve two
// next peer graphs, and that makes `withEve(nextConfig)` fail typecheck.
export default withEve({
  // Playwright hits 127.0.0.1; without this, Next blocks /_next assets and
  // client hydration never runs (e2e waitForAppReady hangs until timeout).
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  serverExternalPackages: ["pg", "ioredis"],
  transpilePackages: ["@workspace/ui"],
})
