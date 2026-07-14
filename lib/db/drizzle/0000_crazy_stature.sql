-- This is migration 0000 even though `saved_analyses` already exists in any
-- environment that previously ran `drizzle-kit push` (the workflow this repo
-- used before switching to tracked migrations). IF NOT EXISTS is added by
-- hand on both CREATE TABLE statements below so this migration is safe to
-- apply once against a fresh database AND once against the existing
-- production database — do not remove it, and do not regenerate this
-- specific file from scratch without re-adding it.
CREATE TABLE IF NOT EXISTS "saved_analyses" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"symbol" text NOT NULL,
	"name" text NOT NULL,
	"timeframe" text NOT NULL,
	"language" text NOT NULL,
	"snapshot" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "saved_analyses_user_id_symbol_timeframe_language_unique" UNIQUE("user_id","symbol","timeframe","language")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ripple_analyses" (
	"id" serial PRIMARY KEY NOT NULL,
	"dedupe_key" text NOT NULL,
	"created_by_user_id" text NOT NULL,
	"headline" text NOT NULL,
	"language" text NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"article" jsonb NOT NULL,
	"analysis" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ripple_analyses_dedupe_key_unique" UNIQUE("dedupe_key")
);
