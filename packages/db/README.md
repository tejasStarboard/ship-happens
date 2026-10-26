# `@workspace/db`

Shared Drizzle schema + `createDb()` factory for Ship Happens.

Built with **tsup** → `dist/` (`pnpm --filter @workspace/db build`).

```ts
import { createDb, rfps } from "@workspace/db"

const { db, pool } = createDb(process.env.POSTGRES_URL!)
const rows = await db.select().from(rfps).limit(10)
await pool.end()
```

Migrations stay at the monorepo root (`drizzle.config.ts` reads `src/schema`, outputs `./migrations`).
