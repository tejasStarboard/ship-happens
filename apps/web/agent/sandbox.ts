import { DefaultSandbox, defineSandbox } from "eve/sandbox"
import { MicrosandboxSandbox } from "eve/sandbox/microsandbox"
import {
  injectSbClientCli,
  prepareStarboardSandbox,
  starboardSandboxEnv,
} from "@/lib/starboard/sandbox-cli"

const starboardEnv = starboardSandboxEnv()
const onVercel = Boolean(process.env.VERCEL)

/**
 * Local: microsandbox VM with Starboard env + Node/uv (prepare) + sb-client on PATH.
 * Vercel: DefaultSandbox (Vercel Sandbox); CLI still injected on open from the build.
 */
export const environment = onVercel
  ? DefaultSandbox.environment({
      prepare: prepareStarboardSandbox,
    })
  : MicrosandboxSandbox.environment({
      env: starboardEnv,
      prepare: prepareStarboardSandbox,
      memoryMiB: 2048,
      cpus: 2,
    })

export default defineSandbox(async () => {
  const sandbox = await environment.open(
    onVercel
      ? undefined
      : {
          // Allow Starboard API egress for sb-client.
          networkPolicy: "allow-all",
        }
  )

  await injectSbClientCli(sandbox)
  return sandbox
})
