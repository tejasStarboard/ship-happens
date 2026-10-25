import { defineEval } from "eve/evals"

/** Spreadsheet inspect/fill should load agent-xlsx. */
export default defineEval({
  description: "Load agent-xlsx when asked to inspect an Excel workbook",
  tags: ["skills", "agent-xlsx"],
  async test(t) {
    await t.send(
      "Inspect the Excel workbook in the workspace with the spreadsheet skill (agent-xlsx). Probe briefly — do not dump the whole sheet."
    )
    t.succeeded()
    t.loadedSkill("agent-xlsx")
  },
})
