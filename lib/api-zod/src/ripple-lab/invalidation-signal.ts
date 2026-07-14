import { z } from "zod";

// No `type` field today (unlike SourceEvidence/ConfirmationSignal) — the LLM
// tool schema never asks for one. Adding it for symmetry would require
// changing the Anthropic tool schema and is left for a later phase rather
// than invented here.
export const InvalidationSignal = z.object({
  signal: z.string().min(1).max(60),
  description: z.string().min(1).max(200),
});
export type InvalidationSignal = z.infer<typeof InvalidationSignal>;
