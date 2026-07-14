import { z } from "zod";
import { Score } from "./enums";

// The six inputs to the Ripple Opportunity Score, plus the score itself.
// fundamentalScore/valuationScore are nullable (not defaulted to 0) because
// "unknown" and "zero" mean very different things for a scoring rubric.
export const RippleScoreBreakdown = z.object({
  exposureScore: Score,
  causalityScore: Score,
  timingScore: Score,
  fundamentalScore: Score.nullable(),
  valuationScore: Score.nullable(),
  confirmationScore: Score,
  riskScore: Score,
  rippleOpportunityScore: Score,
});
export type RippleScoreBreakdown = z.infer<typeof RippleScoreBreakdown>;

// Same shape, but rippleOpportunityScore is optional: the LLM's tool call is
// asked to fill it in, but the server always recomputes it deterministically
// in ripple-llm.ts (computeRippleScore) and the LLM's own value is discarded.
// Used only to validate the raw Anthropic tool_use.input, never returned as-is.
export const RippleScoreBreakdownFromLLM = RippleScoreBreakdown.extend({
  rippleOpportunityScore: Score.optional(),
});
export type RippleScoreBreakdownFromLLM = z.infer<typeof RippleScoreBreakdownFromLLM>;
