import { inngest } from "./client"

/**
 * Smoke function — proves the serve endpoint + Dev Server wiring.
 * Replace with rfp.fill / sandbox jobs next.
 */
export const helloWorld = inngest.createFunction(
  {
    id: "hello-world",
    triggers: [{ event: "test/hello.world" }],
  },
  async ({ event, step }) => {
    await step.sleep("wait-a-moment", "1s")
    return {
      message: `Hello ${String(event.data?.email ?? "world")}!`,
    }
  }
)

export const functions = [helloWorld]
