import { defineConfig } from "vite"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { nitro } from "nitro/vite"

const isCI = !!process.env.CI

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  // Pre-bundle auth deps so first navigation does not trigger a mid-test reload
  optimizeDeps: {
    include: [
      "better-auth",
      "better-auth/react",
      "better-auth/client/plugins",
      "@better-auth/core",
      "@better-auth/core/env",
      "@better-auth/core/error",
      "@better-auth/core/utils/error-codes",
      "@better-auth/core/utils/string",
      "@better-auth/core/utils/url",
    ],
  },
  server: {
    // HMR/file watches abort in-flight auth handlers during Playwright runs
    ...(isCI
      ? {
          hmr: false,
          watch: null,
        }
      : {}),
  },
  plugins: [devtools(), tailwindcss(), tanstackStart(), nitro(), viteReact()],
})

export default config
