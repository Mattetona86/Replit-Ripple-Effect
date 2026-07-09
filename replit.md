# The Ripple Effect

A bilingual (Italian/English) educational platform for learning market mechanics. First product: "Analisi Tecnica Automatica" — search a US stock/ETF ticker and get a real, server-computed technical-analysis chart plus a plain-language, balanced (never directive) explanation of what the indicators are showing.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm --filter @workspace/ripple-effect run dev` — run the frontend
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- Required env: `DATABASE_URL`, `FMP_API_KEY` (Financial Modeling Prep market data), `OPENAI_API_KEY` (analysis explanations), `CLERK_SECRET_KEY`/`CLERK_PUBLISHABLE_KEY`/`VITE_CLERK_PUBLISHABLE_KEY` (Replit-managed Clerk auth)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- Auth: Replit-managed Clerk
- Frontend: React + Vite, wouter routing, TanStack Query, `lightweight-charts` (TradingView) for candlestick/indicator charts
- Market data: Financial Modeling Prep (FMP) `stable` API — ticker search, quotes, daily EOD history, intraday history
- Indicators: `technicalindicators` npm package (SMA/EMA/RSI/MACD), computed server-side only — never LLM-estimated
- Explanation generation: OpenAI (`gpt-5.4`, structured JSON output) — given only pre-computed indicator numbers, writes the plain-language bullish/bearish explanation
- API codegen: Orval (from OpenAPI spec)

## Where things live

- `lib/api-spec/openapi.yaml` — API contract (ticker search, stock analysis)
- `artifacts/api-server/src/lib/market/` — `fmp-client.ts` (provider calls), `indicators.ts` (pure TA math), `llm.ts` (OpenAI explanation prompt/schema), `service.ts` (orchestrates the two + caching)
- `artifacts/api-server/src/routes/market.ts` — `/api/market/tickers/search`, `/api/market/stocks/analysis`
- `artifacts/ripple-effect/src/pages/technical-analysis.tsx` — main product UI (chart, overlays, explanation panel, glossary)
- `artifacts/ripple-effect/src/lib/i18n.tsx` — custom EN/IT dictionary + language context

## Architecture decisions

- FMP moved their free/legacy `v3` endpoints behind a paywall (return 403 "Legacy Endpoint") as of Aug 2025 — this project uses the `stable` API paths (`/stable/search-symbol`, `/stable/quote`, `/stable/historical-price-eod/full`, `/stable/historical-chart/{interval}`) instead.
- Indicator periods (SMA200/50, EMA20/50, RSI14, MACD 12-26-9) are computed over whatever bar granularity matches the selected timeframe (5min bars for 1D, 30min for 1W, daily for 1M/3M/1Y/5Y) rather than always over daily bars — this matches how real charting platforms compute indicators relative to the visible timeframe. Extra warm-up bars are fetched before the display window so indicators have enough history (e.g. 200 periods) even on short display windows, then trimmed to the requested window in the response.
- `getStockAnalysis` avoided a path param (`/stocks/{symbol}/analysis`) in favor of an all-query-param shape (`/stocks/analysis?symbol=`) — Orval's generated client `Params` type name collides (TS2308) with the Zod path-param schema of the same name whenever an operation mixes a path param with query params; keeping everything as query params avoids the collision.
- The LLM (OpenAI, structured JSON schema output) never invents numbers — it only receives already-computed indicator values/levels and writes the explanation around them, enforced via a strict JSON schema response format.
- Signed-out users see the landing page at `/`; signed-in users land on `/products`, currently listing one product card.

## Product

- Public landing page explaining the platform (bilingual, EN/IT toggle in the header, persisted to localStorage).
- Sign in/up via Clerk, branded to match the site.
- `/products` hub (currently one product: Analisi Tecnica Automatica).
- `/products/technical-analysis`: ticker autocomplete search, timeframe selector (1D/1W/1M/3M/1Y/5Y), candlestick + volume chart with toggleable SMA/EMA overlays, RSI and MACD sub-panels, marked swing highs/lows, auto-detected support/resistance lines, market-structure badge, unusual-volume flag, a "What it's saying" panel (per-indicator bullish/bearish reads, balanced bull/bear case, labeled levels with reasoning, illustrative-only entry/stop/target), a Glossary drawer, first-time "how to read this" callout, and a persistent educational disclaimer — strictly educational, never a buy/sell directive.

## User preferences

- None recorded yet beyond the original build spec.

## Gotchas

- FMP: always use `/stable/*` endpoints, never `/api/v3/*` (legacy, returns 403 for most keys now).
- Any new Orval operation that needs both a path param and a query param will hit the `<Op>Params` TS2308 collision — model it as all-query-params instead (see `getStockAnalysis`).
- `OPENAI_API_KEY` is required for the analysis endpoint to return an explanation; without it `/api/market/stocks/analysis` will throw. Ticker search and health check work without it.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
