import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import router from "./routes";
import { logger } from "./lib/logger";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";

// Duck-typed instead of `err instanceof ZodError`: api-server has no direct
// `zod` dependency (only transitively, via @workspace/api-zod) — see
// .agents/memory/ripple-lab-architecture.md. Every route in this app calls
// `Schema.parse(...)` and lets validation errors throw uncaught; without this,
// they fall through to Express's default handler as an opaque 500.
function isZodError(err: unknown): err is { issues: unknown[] } {
  return (
    typeof err === "object" &&
    err !== null &&
    "issues" in err &&
    Array.isArray((err as { issues: unknown }).issues)
  );
}

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

app.use(cors({ credentials: true, origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);

app.use("/api", router);

// Must be registered last, and must keep all 4 params (Express only treats a
// middleware as an error handler when its arity is 4) — see comment above.
//
// Always responds with JSON: client input errors (ZodError) as 400, anything
// else (LLM-output validation failures, unexpected bugs, upstream provider
// errors) as 500. This is the one place that distinction is made — frontends
// can rely on status code alone (400 vs. everything else) to tell "you sent
// something invalid" apart from "something went wrong on our end."
app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  if (isZodError(err)) {
    res.status(400).json({ error: "Invalid request", issues: err.issues });
    return;
  }
  logger.error({ err }, "Unhandled error");
  const message = err instanceof Error ? err.message : "Internal server error";
  res.status(500).json({ error: message });
});

export default app;
