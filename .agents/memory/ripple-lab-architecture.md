---
name: Ripple Lab architecture
description: Key decisions and constraints for the Ripple Lab feature (news → ripple chain → opportunities analysis engine).
---

## Route
`POST /api/market/ripple-lab/analyze` — auth-protected, same `requireAuth` middleware.

## No zod in api-server
The api-server build does NOT have `zod` as a direct dependency. Use `@workspace/api-zod` types or manual validation (`req.body` with type assertions). Never `import { z } from "zod"` directly in api-server routes.

**Why:** esbuild cannot resolve `zod` as a bare import since it's only a transitive dep of `@workspace/api-zod`, not listed in api-server/package.json.

**Update:** Ripple Lab now validates through `@workspace/api-zod` (not a bare `zod` import — this rule still holds and is why the schemas live in `lib/api-zod/src/ripple-lab/`, hand-written rather than Orval-generated). `routes/market.ts` parses the request with `NewsAnalysisRequest.parse(req.body)`, and `ripple-llm.ts` validates Anthropic's `tool_use.input` with `RippleAnalysisResultFromLLM.safeParse(...)` before trusting any of it. The request/response contract is also now documented in `lib/api-spec/openapi.yaml` (schemas + path added) — but NOT yet wired through `pnpm --filter @workspace/api-spec run codegen`; running codegen will generate a second, colliding copy of these schemas into `lib/api-zod/src/generated/` under the same names — resolve that collision before relying on Orval's generated output for this endpoint.

The old hand-duplicated TS interfaces in `artifacts/api-server/src/lib/ripple-lab/types.ts` and `artifacts/ripple-effect/src/lib/ripple-types.ts` are no longer the source of truth on the backend — `types.ts` now derives `RippleAnalysis` from `@workspace/api-zod`'s `RippleAnalysisResult`. The frontend copy (`ripple-types.ts`) has NOT been touched yet and still matches the wire format (which is unchanged, plus one new additive field, `dataConfidence`) — reconciling it with the generated client is deferred to a later phase, alongside renaming `opportunities` to `companies` and nesting its score fields under `scores`.

**Naming note:** each `rippleChain[]` item's Zod schema is `RippleChainNode` (not `RippleRelationship` — an earlier draft of this contract used that name, but the shape is one entity with a single relationship-strength rating back to the event, not an edge between two entities, so it was renamed back to match what the Anthropic tool prompt itself already calls these: "Ripple chain nodes"). Don't reintroduce "Relationship" for this type or rename the `rippleChain` field to `relationships` in a future pass without first turning it into an actual edge (adding `sourceId`/`targetId`) — otherwise the same node-vs-edge mismatch comes back at the field-name level.

**Review fixes applied (same session):** a global `ZodError` → 400 handler was added in `artifacts/api-server/src/app.ts` (previously every validation error on this route fell through to a generic 500, since no error middleware existed anywhere in api-server). `RippleAnalysisResultFromLLM` (in `llm-raw.ts`) now derives from `RippleAnalysisResult` via `.omit()/.extend()` instead of a hand-duplicated literal, wraps every non-critical array field in `.catch([])` so one malformed/missing LLM field degrades that section to empty instead of failing the whole analysis, and raises the `themes`/`opportunities` caps to the true structural bounds implied by the prompt (11 taxonomy entries / 12 rippleChain nodes) rather than the tighter display caps — `ripple-llm.ts` truncates back down to the display caps (6 themes, 5 opportunities) before the final response is assembled. `news-analysis-request.ts` now normalizes `""` to `undefined` for optional string fields, matching the pre-refactor route's behavior. `openapi.yaml`'s `NewsAnalysisRequest` no longer lists `language` as `required`, matching its own `.default("en")` and the convention already used for the same field on other paths in the file.

## LLM pattern
Uses Anthropic `tool_choice: { type: "tool", name: "submit_ripple_analysis" }` — same forced tool pattern as `fundamental-llm.ts`. The tool schema encodes the full RippleAnalysis structure. Server-side score recomputation after LLM response for accuracy.

## Knowledge base
15 seed companies in `artifacts/api-server/src/lib/ripple-lab/knowledge-base.ts`. 17 known relationships with evidence basis. Injected into LLM system prompt as compact text. Do not add speculative relationships to the static KB.

## Frontend API call
Ripple Lab page uses `useMutation` + direct `fetch('/api/market/ripple-lab/analyze')` with `useAuth().getToken()` for the bearer token, still unchanged. The endpoint is now documented in `openapi.yaml` (see above), but the frontend hasn't been migrated to the Orval-generated client yet — that's a separate phase requiring the codegen collision (see above) to be resolved first.

## Cache and persistence
Three layers, each only hit if the one before it misses: in-memory LRU cache (process-local, `headline::tickers::language` key, 2h TTL, max 50 entries) → Postgres `ripple_analyses` table (same dedupe key + 2h freshness window, survives restarts) → Anthropic call. See `artifacts/api-server/src/lib/ripple-lab/ripple-analyses-store.ts` (`makeDedupeKey`, `findRecentRippleAnalysis`, `saveRippleAnalysis`, `getRippleAnalysisById`) and `ripple-service.ts`'s `analyzeRipple`/`getRippleAnalysis`.

Rows are **not** scoped per-user for dedupe/reuse/read — `createdByUserId` is provenance only. The content is a public-news analysis (e.g. "what does this NVIDIA earnings news mean"), not personal data, so re-analyzing the same article reuses one shared row regardless of who asks, and any signed-in user can reload any analysis by id (`GET /market/ripple-lab/:id`) the same way anyone could already trigger the analysis in the first place. This is a deliberate scope decision, not an oversight — revisit if Ripple Lab ever stores something user-specific (e.g. per-user notes/watchlist attached to an analysis).

`schemaVersion` (currently `1`) lives on the DB row, not inside the `RippleAnalysisResult` JSON itself — it's a storage-format concern for future migrations of the `analysis`/`article` JSONB columns, separate from the AI-output contract.

The `ripple_analyses` table is created automatically on server boot (`runMigrations()`, see `lib/db/src/migrate.ts`, called from `artifacts/api-server/src/index.ts`) via the versioned migration `lib/db/drizzle/0000_crazy_stature.sql` — no manual `drizzle-kit push` needed to deploy this table. That migration also (re-)declares `saved_analyses` with `CREATE TABLE IF NOT EXISTS`, since it's migration 0000 in a repo that previously only used `push` — it's safe against a database that already has `saved_analyses`. See `replit.md`'s "Run & Operate" section for the generate/apply workflow going forward.

No versioned DB migration for this table — like `saved_analyses`, schema changes go through `drizzle-kit push` (see repo-wide `replit.md` "Known limitations").

## Speculative chain nodes
The service filters out `relationship === 'speculative'` nodes before returning. Only confirmed, strongly_supported, and plausible nodes are shown.
