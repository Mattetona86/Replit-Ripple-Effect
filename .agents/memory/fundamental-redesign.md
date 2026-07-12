---
name: Fundamental analysis architecture (post-redesign)
description: Key architectural facts about the redesigned Analisi Fondamentale page — schema, data flow, and unavailability rules.
---

## FundamentalExplanation schema (new — do not use old fields)
Old fields (`summary`, `growthAnalysis`, `profitabilityAnalysis`, `cashFlowAnalysis`, `balanceSheetAnalysis`, `valuationAnalysis`, `peerAnalysis`, `strengths`, `risks`, `conclusion`) are **gone**. New fields:
- `headline` (≤12 words), `ourTake` (≤80 words)
- `businessLine`, `valuationLine`, `momentumLine`, `mainRisk` (one-liners)
- `catalysts[]` (AICatalyst: title, explanation, timeHorizon, supportingData)
- `aiRisks[]` (AIRisk: title, explanation, severity, metricToMonitor)
- `metricsToWatch[]` (3 strings)
- `disclaimer`

## New optional sections on FundamentalAnalysis
- `priceVsBusiness?: PriceVsBusinessSection` — annual FY points + TTM; each has price, epsTtm, revenuePerShare, fcfPerShare, date, label; plus priceChange1y/3y/5y
- `newsMomentum?: NewsMomentumSection` — items: NewsItem[]
- `dataConfidenceMatrix?: DataConfidenceMatrix` — 5 categories: financialStatements, historicalPrices, historicalValuation, peerData, newsData; each is "high"|"medium"|"low"|"unavailable"

## Unavailability rules
- `priceVsBusiness.available === false` when fewer than 12 monthly price records from Yahoo chart API
- `peerData` confidence is always `"unavailable"` (Yahoo Finance has no peer data)
- `newsMomentum.available === false` when Yahoo search returns no news items

## Historical P/E source
Historical P/E is now computed from monthly price history (Yahoo chart API, 1mo interval since 2014) + annual EPS. The old approach of using `kma.map(k => k.peRatio)` always returned null — fixed by looking up year-end price from monthly history.

## Yahoo Finance calls (fundamental-yahoo-client.ts)
8 parallel calls in Promise.allSettled:
1. quoteSummary (required — returns null if fails)
2-3. fundamentalsTimeSeries annual financials + balance sheet
4. fundamentalsTimeSeries annual cash flow
5-7. fundamentalsTimeSeries quarterly fin/bs/cf
7. chart(symbol, { period1: '2014-01-01', interval: '1mo' }) → monthly prices
8. search(symbol, { newsCount: 10 }) → news items

**Why:** All data is needed in one pass; chart and search are non-fatal (guarded with .status === 'fulfilled').

## Type flow
openapi.yaml → pnpm codegen (lib/api-spec) → lib/api-zod + lib/api-client-react (auto-generated, never hand-edit). After any openapi.yaml change, run `pnpm --filter @workspace/api-spec run codegen`.

## Page layout (new)
1. Header + data confidence matrix dots
2. Our Take AI block (headline → ourTake → 4 one-liners → metrics to watch)
3. 4 snapshot cards (Business Trend / Price vs Business / Valuation / News Momentum)
4. Price vs Business chart (real price + EPS/RevPerShare/FCFPerShare indexed to 100, period 1Y/3Y/5Y/Max)
5. Valuation vs History chart (current vs 5Y median P/E)
6. News Momentum section (clickable article list or "unavailable")
7. Catalysts & Risks two columns (AI output)
8. Financial detail tabs: Growth / Profitability / CF / Balance / Valuation / Risks (no Competitors tab)
9. Sources & Methodology + disclaimer
