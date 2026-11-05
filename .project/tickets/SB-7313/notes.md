# Golden QA notes (M3 T6)

## Nordstrom

- Workbook: `tmp/fwdfwbidexamples/Bid Examples/2024_Ocean_RFP_-_Bid_Worksheet.xlsx`
- Bindings: K base, L all_in, M LSS fee, P transit_days, U free_time.origin_days, A carrier_name
- Checklist: see `.project/docs/qa.md` § M3 golden gate

## Big Lots (second)

- Workbook: `tmp/fwdfwbidexamples/Bid Examples/2024-25 Big Lots Bid Sheet. NVO.xlsx`
- Focus: fee-heavy layout + unexpected-fee soft-warn
- Checklist: see `.project/docs/qa.md` § Second golden

## Unit eval

```
pnpm --filter @ship-happens/sb-client test
pnpm --filter @ship-happens/fill test
pnpm --filter web exec vitest run lib/domain/rates/starboard-rates-adapter.test.ts
```
