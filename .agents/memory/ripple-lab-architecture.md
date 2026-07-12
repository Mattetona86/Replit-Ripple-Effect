---
name: Ripple Lab architecture
description: Key decisions and constraints for the Ripple Lab feature (news → ripple chain → opportunities analysis engine).
---

## Route
`POST /api/market/ripple-lab/analyze` — auth-protected, same `requireAuth` middleware.

## No zod in api-server
The api-server build does NOT have `zod` as a direct dependency. Use `@workspace/api-zod` types or manual validation (`req.body` with type assertions). Never `import { z } from "zod"` directly in api-server routes.

**Why:** esbuild cannot resolve `zod` as a bare import since it's only a transitive dep of `@workspace/api-zod`, not listed in api-server/package.json.

## LLM pattern
Uses Anthropic `tool_choice: { type: "tool", name: "submit_ripple_analysis" }` — same forced tool pattern as `fundamental-llm.ts`. The tool schema encodes the full RippleAnalysis structure. Server-side score recomputation after LLM response for accuracy.

## Knowledge base
15 seed companies in `artifacts/api-server/src/lib/ripple-lab/knowledge-base.ts`. 17 known relationships with evidence basis. Injected into LLM system prompt as compact text. Do not add speculative relationships to the static KB.

## Frontend API call
Ripple Lab page uses `useMutation` + direct `fetch('/api/market/ripple-lab/analyze')` with `useAuth().getToken()` for the bearer token. No orval codegen needed — avoids openapi.yaml changes.

## Cache
LRU cache keyed by `headline::tickers::language` (first 120 chars), 2-hour TTL, max 50 entries.

## Speculative chain nodes
The service filters out `relationship === 'speculative'` nodes before returning. Only confirmed, strongly_supported, and plausible nodes are shown.
