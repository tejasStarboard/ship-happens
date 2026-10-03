import type { MockRfp } from "@/lib/mock/rfps"

export type AgentTodo = {
  id: string
  label: string
  done: boolean
}

export type AgentChatMessage =
  | {
      id: string
      role: "user"
      text: string
    }
  | {
      id: string
      role: "agent"
      text: string
      todos?: AgentTodo[]
      durationLabel?: string
      stats?: { label: string; tone?: "positive" | "warning" | "muted" }[]
    }

export function buildInitialAgentMessages(rfp: MockRfp): AgentChatMessage[] {
  return [
    {
      id: "msg_user_1",
      role: "user",
      text: `Fill the ${rfp.customer} bid sheet using our Starboard contract rates. Flag anything you can't match confidently.`,
    },
    {
      id: "msg_agent_1",
      role: "agent",
      durationLabel: "Worked for 1m 12s",
      todos: [
        { id: "t1", label: "Read bid sheet structure", done: true },
        { id: "t2", label: "Match lanes to Starboard rates", done: true },
        { id: "t3", label: "Fill rate & transit cells", done: true },
        { id: "t4", label: "Flag missing / ambiguous ports", done: true },
        { id: "t5", label: "Draft fill report", done: true },
      ],
      text: `Filled **${rfp.name}** against Starboard contracts.\n\n1. Mapped origin/destination columns on \`${rfp.templateName}\`\n2. Matched **42** lanes to contract rates\n3. Left **3** cells for human review (ambiguous port codes)\n4. Skipped **7** rows with incomplete lane data\n\nOpen the Fill report tab when you want the cell-level breakdown.`,
      stats: [
        { label: "42 cells filled", tone: "positive" },
        { label: "3 need review", tone: "warning" },
        { label: "7 skipped", tone: "muted" },
      ],
    },
  ]
}

export function buildMockAgentReply(prompt: string): AgentChatMessage {
  return {
    id: `msg_agent_${Date.now()}`,
    role: "agent",
    durationLabel: "Worked for 18s",
    todos: [
      { id: "r1", label: "Understand your request", done: true },
      { id: "r2", label: "Check rates & sheet context", done: true },
      { id: "r3", label: "Propose next fill action", done: true },
    ],
    text: `Got it — I'll treat that as guidance for this RFP fill.\n\n> ${prompt.trim()}\n\n(Mock reply) When the agent is wired up, this will run against the bid sheet + Starboard rates and update the fill report.`,
    stats: [
      { label: "Rates consulted", tone: "muted" },
      { label: "Awaiting confirm", tone: "warning" },
    ],
  }
}

export type AgentContextItem = {
  id: string
  label: string
  detail: string
  kind: "sheet" | "rates" | "ports" | "requirements"
}
