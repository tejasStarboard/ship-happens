# `@ship-happens/sh-client`

Sandbox CLI for fill status, progress, logs, and review items. Authenticates to Ship Happens with a Better Auth API key (`x-api-key`).

```bash
sh-client auth test
sh-client status --fill fill_…
sh-client progress
sh-client logs --limit 50
sh-client reviews list
sh-client reviews create --body '{"title":"Map column X","proposal":{}}'
sh-client reviews resolve --id rev_… --body '{"resolution":{}}'
```

Env:

- `SH_APP_URL` — Ship Happens base URL (e.g. `http://localhost:3000`)
- `SH_API_KEY` — Better Auth API key (`sh_…`)
- `SH_FILL_ID` — default fill / workspace id when `--fill` is omitted
