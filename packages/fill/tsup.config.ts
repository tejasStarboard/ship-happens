import { defineConfig } from "tsup"

export default defineConfig({
  entry: {
    index: "src/index.ts",
  },
  format: ["esm"],
  dts: true,
  // Sourcemaps help local debugging; skip in CI for faster package builds.
  sourcemap: process.env.CI ? false : true,
  clean: true,
  outDir: "dist",
  target: "node20",
  splitting: false,
  external: ["@workspace/db", "drizzle-orm", "xlsx", "zod"],
})
