import { defineEval } from "eve/evals"

/** Submit-for-review path should load sh-client (HITL create). */
export default defineEval({
  description: "Load sh-client when asked to submit something for review",
  tags: ["skills", "sh-client"],
  async test(t) {
    await t.send(
      "Submit a sample review item for human approval: title 'Map column X', stepKey map. Use the fill CLI skill — do not invent review state in chat."
    )
    t.succeeded()
    t.loadedSkill("sh-client")
  },
})
