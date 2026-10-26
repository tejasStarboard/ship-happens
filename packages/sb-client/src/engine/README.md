# Surcharge engine twins

These files are copies of `apps/webapp/utils/shared/quotes/{teuFactor,usageUnit,deriveRawUsage,computeSurchargeRow}.ts`
so `@ship-happens/sb-client` stays a shippable package without Next.js path aliases.

**Do not edit logic here in isolation.** Change the webapp copy first, then re-copy
(or keep byte-identical). TEU billing factor `2.5332` is guarded by
`scripts/check-sb3192-teu-factor-sync.sh` — if you change `teuFactor.ts`, update that guard’s
file list to include this path.
