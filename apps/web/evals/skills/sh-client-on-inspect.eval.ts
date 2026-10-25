import { defineEval } from "eve/evals"

/**
 * SB-6657: inspect fill status/progress/logs should load the sh-client skill.
 * Does not require CLI success (sandbox keys may be absent in eval).
 */
export default defineEval({
  description: "Load sh-client when asked to inspect fill status/progress",
  tags: ["skills", "sh-client"],
  async test(t) {
    await t.send(
      "Please inspect this fill's status and progress using the fill CLI skill."
    )
    t.succeeded()
    t.loadedSkill("sh-client")
  },
})
