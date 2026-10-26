import { defineEval } from "eve/evals"

/** Starboard rate lookup should load sb-client. */
export default defineEval({
  description: "Load sb-client when asked for Starboard rates",
  tags: ["skills", "sb-client"],
  async test(t) {
    await t.send(
      "Look up Starboard contract rates for lane CNSHA to USLAX using the Starboard client skill."
    )
    t.succeeded()
    t.loadedSkill("sb-client")
  },
})
