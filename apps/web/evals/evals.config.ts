import { defineEvalConfig } from "eve/evals"

/**
 * Shared defaults for Ship Happens RFP agent evals.
 * Deterministic assertions only — no Braintrust / judge required for the smoke suite.
 */
export default defineEvalConfig({
  // Live model turns can be slow (skills + optional sandbox tools).
  timeoutMs: 120_000,
  maxConcurrency: 2,
})
