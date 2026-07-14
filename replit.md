# The Ripple Effect

A bilingual (Italian/English) educational platform for learning market mechanics. It currently ships three products:

1. **Analisi Tecnica Automatica** — search a US stock/ETF ticker and get a real, server-computed technical-analysis chart plus a plain-language, balanced (never directive) explanation of what the indicators are showing.
2. **Analisi Fondamentale** — fundamental data and scoring for a ticker (financial statements, ratios, etc.) plus an AI-generated plain-language verdict.
3. **Ripple Lab** — given a news headline/body, analyzes which companies/tickers are affected (direct and second-order "ripple" effects), using a static knowledge base of company relationships plus an AI-generated analysis.

There is no dedicated tracker for US politicians' trades in the codebase today — the only related concept is a generic `geopolitical_event` category used inside Ripple Lab's event classification (see `artifacts/api-server/src/lib/ripple-lab/types.ts`), not a standalone feature.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (builds then starts; requires `PORT`)
- `pnpm --filter @workspace/ripple-effect run dev` — run the frontend (Vite dev server; requires `PORT` and `BASE_PATH`)
- `pnpm --filter @workspace/mockup-sandbox run dev` — run the standalone UI mockup sandbox (not part of the shipped product)
- `pnpm run typecheck` — full typecheck across all packages (`tsc --build` for libs, then per-artifact typecheck)
- `pnpm run build` — typecheck + build all packages (each artifact's own `build` script: esbuild bundle for the API, `vite build` for the frontend)
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run generate` — generate a new versioned SQL migration in `lib/db/drizzle/` from schema changes (run this after editing `lib/db/src/schema/*.ts`, then commit the generated files)
- Migrations apply themselves on every server boot (dev and production) via `runMigrations()` in `lib/db/src/migrate.ts`, called from `artifacts/api-server/src/index.ts` before the server starts listening — no manual `db push` step is needed to deploy a schema change. `pnpm --filter @workspace/db run push` / `push-force` still exist for ad-hoc local prototyping, but don't mix them with the tracked-migrations flow above once a database has ever run a migration (Drizzle tracks applied migrations in a `__drizzle_migrations` table that `push` doesn't know about).
- There is currently no automated test suite (no `test` script in any package) — verification today is limited to typecheck/build.
- Required env: see "Environment variables" below.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 (`artifacts/api-server`)
- Auth: Clerk (`@clerk/express` on the backend, `@clerk/react` on the frontend), with a backend proxy to `frontend-api.clerk.dev` for custom-domain support
- Frontend: React 19 + Vite 7 (`artifacts/ripple-effect`), wouter routing, TanStack Query, Zustand, Tailwind CSS v4, Radix UI, `lightweight-charts` (TradingView) and `recharts` for charts
- Database: PostgreSQL via Drizzle ORM (`lib/db`)
- Market/financial data: Financial Modeling Prep (`FMP_API_KEY`) for technical-analysis quotes and price history; Yahoo Finance (via `yahoo-finance2`, no key required) for ticker search and all fundamental-analysis data (statements, ratios, historical prices, news)
- AI provider: **Anthropic** (`@anthropic-ai/sdk`, model `claude-sonnet-4-6`), used with structured/tool-forced JSON output in all three products — never for OpenAI
- Indicators: `technicalindicators` npm package (SMA/EMA/RSI/MACD), computed server-side only — never LLM-estimated
- API codegen: Orval (from `lib/api-spec/openapi.yaml`) generates the React Query hooks (`lib/api-client-react`) and Zod schemas (`lib/api-zod`)

## Where things live

- `lib/api-spec/openapi.yaml` — API contract for tickers/technical-analysis/fundamental-analysis/saved-analyses (Ripple Lab is **not** in this contract, see Gotchas)
- `artifacts/api-server/src/app.ts` — Express bootstrap: logging, Clerk proxy middleware, CORS, Clerk auth
- `artifacts/api-server/src/routes/index.ts` — mounts `health.ts` (public) and `market.ts` (auth-required) under `/api`
- `artifacts/api-server/src/routes/market.ts` — all business routes: `/api/market/tickers/search`, `/api/market/stocks/analysis`, `/api/market/stocks/fundamental-analysis`, `/api/market/saved` (GET/POST), `/api/market/saved/:id` (DELETE), `/api/market/ripple-lab/analyze` (POST)
- `artifacts/api-server/src/lib/market/` — technical analysis: `fmp-client.ts` (FMP calls), `indicators.ts` (pure TA math), `llm.ts` (Anthropic explanation prompt/schema), `service.ts` (orchestration + in-memory cache)
- `artifacts/api-server/src/lib/market/fundamental-*.ts` — fundamental analysis: `fundamental-yahoo-client.ts` (data fetch, in active use), `fundamental-calculator.ts` (scoring/metrics), `fundamental-llm.ts` (Anthropic verdict), `fundamental-service.ts` (orchestration + cache). `fundamental-fmp-client.ts` still exists but its fetch functions look unused after the migration to Yahoo Finance (only its types are still imported).
- `artifacts/api-server/src/lib/ripple-lab/` — `ripple-service.ts` (orchestration + cache), `ripple-llm.ts` (Anthropic prompt/schema), `knowledge-base.ts` (static seed data for ~15 companies and their relationships), `types.ts`
- `lib/db/src/schema/saved-analyses.ts` — the only DB table, `saved_analyses` (per-user saved analysis snapshots)
- `artifacts/ripple-effect/src/App.tsx` — routing (wouter), Clerk sign-in gating
- `artifacts/ripple-effect/src/pages/technical-analysis.tsx`, `fundamental-analysis.tsx`, `ripple-lab.tsx` — the three product pages
- `artifacts/ripple-effect/src/lib/i18n.tsx` — custom EN/IT dictionary + language context
- `lib/api-client-react/src/custom-fetch.ts` — shared fetch wrapper (auth, base URL, error handling) used by the Orval-generated client

## Architecture decisions

- FMP moved their free/legacy `v3` endpoints behind a paywall (return 403 "Legacy Endpoint") as of Aug 2025 — this project uses the `stable` API paths instead, for technical-analysis data only.
- Indicator periods (SMA200/50, EMA20/50, RSI14, MACD 12-26-9) are computed over whatever bar granularity matches the selected timeframe (5min bars for 1D, 30min for 1W, daily for 1M/3M/1Y/5Y) rather than always over daily bars. Extra warm-up bars are fetched before the display window so indicators have enough history, then trimmed to the requested window in the response.
- `getStockAnalysis` and `getFundamentalAnalysis` avoid path params in favor of all-query-param shapes (`/stocks/analysis?symbol=`) — Orval's generated `Params` type name collides (TS2308) with the Zod path-param schema of the same name whenever an operation mixes a path param with query params.
- All three LLM calls (technical, fundamental, Ripple Lab) receive only already-computed numbers/facts and are constrained to a JSON schema via tool-forcing — the model never invents figures.
- Signed-out users see the landing page at `/`; signed-in users land on `/products`, listing all three product cards.
- Fundamental analysis was migrated from FMP to Yahoo Finance as its data source (see `.agents/memory/fundamental-redesign.md`); the old FMP client for fundamentals was left in place but is largely dead code.

## Environment variables

No `.env.example` exists in the repo. Required/used variables (names only, no values):

- `DATABASE_URL` — Postgres connection string (required; the process throws on startup without it)
- `PORT` — required by the API server and by the frontend/mockup-sandbox Vite dev servers
- `BASE_PATH` — required by the frontend and mockup-sandbox Vite dev servers
- `FMP_API_KEY` — required for technical-analysis quotes/history (Financial Modeling Prep)
- `ANTHROPIC_API_KEY` — required for all AI-generated explanations/verdicts (technical, fundamental, Ripple Lab)
- `CLERK_SECRET_KEY` — required in production for the Clerk reverse-proxy middleware
- `CLERK_PUBLISHABLE_KEY` — required server-side to derive the Clerk publishable key from the request host
- `VITE_CLERK_PUBLISHABLE_KEY` — required by the frontend (throws on startup without it)
- `VITE_CLERK_PROXY_URL` — optional, frontend
- `NODE_ENV` — dev/production behavior switch (logging, Clerk proxy, Vite plugins)
- `LOG_LEVEL` — optional, defaults to `info`
- `REPL_ID` — optional; when set, enables Replit-only Vite dev plugins (cartographer, dev banner)

## Product

- Public landing page explaining the platform (bilingual, EN/IT toggle in the header, persisted to localStorage).
- Sign in/up via Clerk, branded to match the site.
- `/products` hub listing three product cards: Analisi Tecnica Automatica, Analisi Fondamentale, Ripple Lab.
- `/products/technical-analysis`: ticker autocomplete search, timeframe selector (1D/1W/1M/3M/1Y/5Y), candlestick + volume chart with toggleable SMA/EMA overlays, RSI and MACD sub-panels, marked swing highs/lows, auto-detected support/resistance lines, market-structure badge, unusual-volume flag, a "What it's saying" panel, a Glossary drawer, first-time "how to read this" callout, and a persistent educational disclaimer.
- `/products/fundamental-analysis`: fundamental data and scoring for a ticker with an AI-generated plain-language verdict.
- `/products/ripple-lab`: paste/enter a news headline (+ optional body/source/url/tickers), get an AI-generated breakdown of directly and indirectly affected companies, opportunities, catalysts/risks, and cited sources.
- Users can save analyses (`saved_analyses` table) per user/symbol/timeframe/language.
- Strictly educational throughout — never a buy/sell directive.

## Known limitations

- No automated test suite exists (no `test` script in any package); correctness relies on typecheck/build only.
- DB migrations (`lib/db/drizzle/`) are versioned and self-apply on boot (see "Run & Operate" above), but this has only been verified by generating the SQL and loading the bundled server up to the point it correctly demands a real `DATABASE_URL` — running a migration against an actual Postgres instance has not been verified in this environment (no Postgres/Docker available here).
- Ripple Lab's `/api/market/ripple-lab/analyze` endpoint is not part of the OpenAPI contract: its request body is validated manually via type assertions instead of Zod, and the frontend calls it with a raw `fetch` instead of the generated API client (see `.agents/memory/ripple-lab-architecture.md` for the rationale).
- `fundamental-fmp-client.ts` fetch functions appear to be dead code after the migration to Yahoo Finance for fundamentals (only its types are still imported).
- Some Yahoo Finance calls used by fundamental analysis (historical prices, news search) fail non-fatally (`Promise.allSettled` + `logger.warn`), so the user sees an "unavailable" section with no explicit error signal when they fail.
- No application-level rate limiting on any route; the costly `ripple-lab/analyze` endpoint (calls Anthropic) relies only on an in-memory LRU cache to reduce repeat load.
- `lib/integrations/*` is listed as a workspace package pattern in `pnpm-workspace.yaml` but the directory does not exist yet.
- `@workspace/scripts` currently contains only a placeholder script (`hello.ts`).

## Planned / not yet implemented

The following do not exist in this codebase today and are listed here only because they've come up in discussion — they should not be assumed to be part of the current product:

- A tracker for trades/positions by US politicians. A separate, standalone project for this already exists at [congress-tracker](https://github.com/Mattetona86/congress-tracker) (Node/Express/SQLite, its own scraping pipeline and static dashboard), but it is **not integrated** into this monorepo — different stack (SQLite vs. this project's Postgres, Express 4 vs. 5, no Clerk, no React frontend), no shared code or workspace link. Integrating it as a fourth product here would be a separate, substantial piece of work.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
- `.agents/memory/*.md` holds additional internal architecture notes (FMP stable API migration, Orval collision workaround, fundamental-analysis redesign, Ripple Lab architecture) that are more detailed/up to date than this file for implementation specifics.
