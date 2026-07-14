import { migrate } from "drizzle-orm/node-postgres/migrator";
import path from "path";
import { db } from "./index";

// process.cwd() differs between dev and prod:
//   dev:  pnpm runs the script with cwd = artifacts/api-server/ (the package dir)
//   prod: the artifact.toml invokes `node artifacts/api-server/dist/index.mjs`
//         with the repo root as cwd.
// We detect the two cases via NODE_ENV and adjust the relative path accordingly.
// Do NOT use import.meta.url/__dirname: this module is bundled by esbuild into
// a single dist/index.mjs, so those would point at the bundle, not this file.
const MIGRATIONS_FOLDER =
  process.env.NODE_ENV === "development"
    ? path.join(process.cwd(), "../../lib/db/drizzle")
    : path.join(process.cwd(), "lib/db/drizzle");

// Runs on every boot (dev and production) — see index.ts. Drizzle tracks
// applied migrations in a `__drizzle_migrations` table and skips ones
// already applied, so this is a cheap no-op once a given migration has run.
// Do NOT also run `drizzle-kit push`/`push-force` against an environment
// that uses this — mixing the two schema-management modes is unsupported by
// Drizzle and can desync the migration tracking table from reality.
export async function runMigrations(): Promise<void> {
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
}
