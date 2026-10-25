import { defineEval } from "eve/evals"

/** Instructions: greetings must not load skills or run tools. */
export default defineEval({
  description: "Greeting gets a short reply with no tools or skill loads",
  tags: ["behavior", "fast"],
  async test(t) {
    await t.send("hi")
    t.succeeded()
    t.usedNoTools()
  },
})
