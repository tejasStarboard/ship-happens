import { DefaultSandbox, defineSandbox } from "eve/sandbox";

// DefaultSandbox picks Vercel Sandbox on Vercel and Docker/microsandbox/just-bash locally.
export const environment = DefaultSandbox.environment();

export default defineSandbox(() => environment.open());
