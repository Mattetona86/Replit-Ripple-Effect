---
name: Drizzle migrator path in dev vs prod
description: The MIGRATIONS_FOLDER path must differ between dev and prod because pnpm changes CWD to the package dir in dev but prod runs from repo root.
---

The `lib/db/src/migrate.ts` MIGRATIONS_FOLDER uses `process.cwd()`:

- **Dev**: `pnpm --filter @workspace/api-server run dev` sets CWD = `artifacts/api-server/`
  → path must be `../../lib/db/drizzle` (two levels up to repo root)
- **Prod**: artifact.toml invokes `node artifacts/api-server/dist/index.mjs` with CWD = repo root
  → path must be `lib/db/drizzle`

**Why:** Do NOT use `import.meta.url` / `__dirname` — the file is bundled by esbuild so those would point at the dist bundle, not the source location.

**How to apply:**
```typescript
const MIGRATIONS_FOLDER =
  process.env.NODE_ENV === "development"
    ? path.join(process.cwd(), "../../lib/db/drizzle")
    : path.join(process.cwd(), "lib/db/drizzle");
```
