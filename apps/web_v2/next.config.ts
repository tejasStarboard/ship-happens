import { withEve } from "eve/next";

// Avoid importing `NextConfig` from `next` here — the monorepo can resolve two
// next peer graphs, and that makes `withEve(nextConfig)` fail typecheck.
export default withEve({
  serverExternalPackages: ["better-sqlite3"],
});
