import { test as base, expect } from "@playwright/test"
import { AUTH_FILE } from "./helpers"

/**
 * Authenticated tests load storageState via the Playwright project config.
 * Re-export a shared `test`/`expect` for consistent imports across specs.
 */
export const test = base
export { expect, AUTH_FILE }
