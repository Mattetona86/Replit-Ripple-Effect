---
name: FMP API subscription limits
description: FMP free-plan limits that affect financial statement and fundamental analysis fetches
---

## Rule
FMP free plan caps the `limit` parameter at **5** on all financial statement endpoints:
- `/income-statement`
- `/balance-sheet-statement`
- `/cash-flow-statement`
- `/key-metrics`
- `/ratios`

Requesting limit > 5 returns HTTP 402 with message:
`"The values for 'limit' must be between 0 and 5 based on your current subscription."`

**Why:** Discovered when TSLA fundamental analysis failed — all statement fetches returned 402.

## Fix applied
All `getIncomeStatements`, `getBalanceSheets`, `getCashFlows`, `getKeyMetrics`, and `getFinancialRatios` calls in `fundamental-service.ts` use `limit: 5` max.

## Analyst Estimates
`/analyst-estimates` requires an explicit `period` parameter (`"annual"` or `"quarter"`).
Without it, returns HTTP 400: `"Invalid or missing query parameter - period"`.

## Peers
`/peers` returns 404 if no peer group exists for the ticker — handled gracefully with `.catch(() => [])`.
