// @workspace/db throws at import time if DATABASE_URL is unset (see
// lib/db/src/index.ts). Tests that only exercise pure logic — dedupe-key
// generation, score math, Zod schema validation — don't need a real
// database; this dummy value just lets those modules import without
// crashing. Tests that actually hit Postgres are skipped unless a real
// DATABASE_URL is provided (see ripple-analyses-store.test.ts).
process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/ripple_lab_test";
