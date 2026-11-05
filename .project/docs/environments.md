# Environments & pointers

## App URLs

| Env | URL |
| --- | --- |
| Dev | https://ship-happens-dev.vercel.app |
| Prod | https://ship-happens-one.vercel.app |
| Local | http://localhost:3000 (`pnpm --filter web dev`) |

## Linear

| Item | Link |
| --- | --- |
| Project | https://linear.app/starboard-biz/project/auto-rfp-sheet-filler-a1f6a57574a7 |
| PRD document | https://linear.app/starboard-biz/document/prd-ship-happens-f6aa7f513259 |
| Team | Engineering (`SB`) |
| Lead | Tejas Ladhe |
| Members | Tejas, Oscar Bertuzzi, Sumeet |

## Local infra

| Service | Host port | Notes |
| --- | ---: | --- |
| Postgres | **54325** | `postgresql://postgres:postgres@127.0.0.1:54325/ship_happens` |
| Redis | **63799** | Do **not** use CI ports 5432 / 6379 locally |

```bash
docker compose up -d
pnpm db:push
# reset empty DB: drop/create ship_happens then pnpm db:push --force
```

## Starboard (dependency)

| Item | Notes |
| --- | --- |
| Source of truth repo | `/Users/…/Desktop/Starboard/starboard-2` |
| Contract search | `POST /api/qv2/rates/search` |
| Spot | `/api/vendor_rates/spot/[carrier]` → Foundry scrapers / CMA |
| SH env | `STARBOARD_APP_DOMAIN`, `STARBOARD_HANDSHAKE_KEY`, `SB_CLIENT_CLIENT_ID` / `SECRET` |

Smoke: `pnpm --filter web starboard:smoke-rates`

## Fixtures

| Path | Use |
| --- | --- |
| `tmp/fwdfwbidexamples/Bid Examples/` | Real BCO bid sheets for gap analysis / QA |
| `tmp/fwdfwbidexamples/Bid Examples/2024_Ocean_RFP_-_Bid_Worksheet.xlsx` | Nordstrom golden candidate |
| Fill-pipeline skill demo list | AutoZone / Vivint paths under `tmp/` |

## Related repo docs

| Path | Role |
| --- | --- |
| `docs/PRD.md` | Longer published PRD (may lag tickets) |
| `docs/architecture.md` | Package/layering detail |
| `.project/docs/*` | **This folder** — Linear-aligned working set |
