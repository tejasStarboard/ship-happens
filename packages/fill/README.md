# `@ship-happens/fill`

Framework-free fill/intake domain: `FillPipelineManager`, `IntakeService`, RFP repository helpers.

Built with **tsup** → `dist/` (`pnpm --filter @ship-happens/fill build`). Depends on `@workspace/db` (build db first). Inject blob + workspace ports from the host runtime.

```ts
import { createDb } from "@workspace/db"
import {
  FillPipelineManager,
  IntakeService,
  RfpRepository,
  type BlobStore,
  type WorkspaceHost,
} from "@ship-happens/fill"

const { db } = createDb(process.env.POSTGRES_URL!)
const pipeline = new FillPipelineManager(db)
const intake = new IntakeService(
  db,
  new RfpRepository(db),
  pipeline,
  blob as BlobStore,
  workspace as WorkspaceHost
)

await intake.createFill(orgId, userId, upload)
await pipeline.startStep(rfpId, "map")
```

Next.js wires these in `apps/web/lib/di/create-app-context.ts`.
