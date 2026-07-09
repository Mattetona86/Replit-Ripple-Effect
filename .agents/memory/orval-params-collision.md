---
name: Orval combined path+query params name collision
description: An OpenAPI operation with both a path param and query params triggers a TS2308 duplicate-export error in generated code.
---

When an OpenAPI GET operation has **both** a path parameter and one or more query parameters, Orval generates two different things under the same name `<OperationIdPascalCase>Params`:
- In `lib/api-zod/src/generated/api.ts` (zod), the path-only param object.
- In `lib/api-zod/src/generated/types/`, the React-client's combined path+query TS type.

Both are exported from the `@workspace/api-zod` barrel, producing `TS2308: Module "./generated/api" has already exported a member named '<Op>Params'`.

**Why:** confirmed via isolated orval test runs — an operation with only a path param, or only query params, never triggers this; it only happens when both exist on the same operation.

**How to apply:** when a GET/DELETE endpoint needs both an identifier and query filters, model the identifier as a query param too instead of a path segment (e.g. `/stocks/analysis?symbol=X&timeframe=Y` instead of `/stocks/{symbol}/analysis?timeframe=Y`). This sidesteps the collision entirely without needing custom Orval config.
