import { defineSandbox } from "eve/sandbox";
import { MicrosandboxSandbox } from "eve/sandbox/microsandbox";

// Local VM with Python. autoInstall is off because just-bash/microsandbox
// are already in package.json — mid-request `pnpm add` was breaking Next.js
// module resolution (`eve/react` not found) and leaving bash tools stuck.
export const environment = MicrosandboxSandbox.image("python:3.12-slim", {
  setup: { autoInstall: false },
});

export default defineSandbox(() =>
  environment.open({
    networkPolicy: "allow-all",
  }),
);
