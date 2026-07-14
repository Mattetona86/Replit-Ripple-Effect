import app from "./app";
import { logger } from "./lib/logger";
import { runMigrations } from "@workspace/db/migrate";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function main(): Promise<void> {
  // Applies any pending SQL migrations (lib/db/drizzle/) before accepting
  // traffic — this is what makes a plain deploy (no manual `db push` step)
  // sufficient: the schema self-heals on boot. Fails fast and loud if the
  // database is unreachable or a migration errors, rather than starting the
  // server against a schema it doesn't actually have.
  try {
    await runMigrations();
    logger.info("Database migrations applied");
  } catch (err) {
    logger.error({ err }, "Failed to apply database migrations — refusing to start");
    process.exit(1);
  }

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
  });
}

main();
