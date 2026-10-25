import { defineConfig } from "tsup"

export default defineConfig([
  {
    entry: { index: "src/index.ts" },
    format: ["esm"],
    dts: true,
    sourcemap: process.env.CI ? false : true,
    clean: true,
    outDir: "dist",
    target: "node20",
    splitting: false,
  },
  {
    entry: { cli: "src/cli.ts" },
    format: ["esm"],
    dts: false,
    sourcemap: process.env.CI ? false : true,
    clean: false,
    outDir: "dist",
    target: "node20",
    splitting: false,
    banner: {
      js: "#!/usr/bin/env node",
    },
  },
])
