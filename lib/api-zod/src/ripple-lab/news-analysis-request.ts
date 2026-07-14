import { z } from "zod";

// url/publishedAt are intentionally NOT format-validated (no .url() / date
// regex): the current frontend doesn't enforce either client-side, so a hard
// format check here would start rejecting submissions that work today. Only
// length caps are added, as a cost/abuse guard on the Anthropic call.
//
// An explicit "" is normalized to `undefined`, matching the old route's
// `field || undefined` behavior — without this, an empty string would pass
// through as-is and silently blank out a line in the LLM prompt (ripple-llm.ts
// uses `input.source ?? 'unknown'`, and `??` doesn't catch "").
const optionalTrimmedString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value === "" ? undefined : value));

// Request body for POST /api/market/ripple-lab/analyze.
//
// primaryTickers keeps a generous safety ceiling (50) rather than the
// business limit of 10 — the route still truncates to 10 after parsing,
// unchanged from today's behavior; this schema only guards against a wildly
// oversized payload.
export const NewsAnalysisRequest = z.object({
  headline: z.string().trim().min(1).max(2000),
  body: optionalTrimmedString(20000),
  source: optionalTrimmedString(200),
  url: optionalTrimmedString(2000),
  publishedAt: optionalTrimmedString(40),
  primaryTickers: z.array(z.string().trim().min(1).max(15)).max(50).optional(),
  language: z.enum(["en", "it"]).default("en"),
});
export type NewsAnalysisRequest = z.infer<typeof NewsAnalysisRequest>;
