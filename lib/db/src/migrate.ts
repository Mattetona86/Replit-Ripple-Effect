import { migrate } from "drizzle-orm/node-postgres/migrator";
import path from "path";
import { db } from "./index";

// Deliberately NOT resolved relative to import.meta.url/__dirname: this
// module gets bundled (esbuild `bundle: true`, no `external` entry for
// @workspace/db) into a single artifacts/api-server/dist/index.mjs — at
// runtime import.meta.url/__dirname there point at the dist/ bundle, not at
// this file's original location, so a path relative to them would resolve
// to the wrong directory. process.cwd() is safe because the production run
// command (see artifacts/api-server/.replit-artifact/artifact.toml) invokes
// `node artifacts/api-server/dist/index.mjs` with the repo root as cwd.
const MIGRATIONS_FOLDER = path.join(process.cwd(), "lib/db/drizzle");

// Runs on every boot (dev and production) — see index.ts. Drizzle tracks
// applied migrations in a `__drizzle_migrations` table and skips ones
// already applied, so this is a cheap no-op once a given migration has run.
// Do NOT also run `drizzle-kit push`/`push-force` against an environment
// that uses this — mixing the two schema-management modes is unsupported by
// Drizzle and can desync the migration tracking table from reality.
export async function runMigrations(): Promise<void> {
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
}
