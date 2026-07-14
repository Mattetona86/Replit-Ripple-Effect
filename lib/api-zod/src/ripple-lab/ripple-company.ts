import { z } from "zod";
import { Direction, RippleCompanyLevel, Score, TimeHorizon } from "./enums";
import { RippleScoreBreakdown, RippleScoreBreakdownFromLLM } from "./ripple-score-breakdown";

// Renamed from the current codebase's `RippleOpportunity`. Wire shape is kept
// flat and unchanged (score fields merged in, not nested) so the current
// frontend keeps working unmodified. `scores` fields are still individually
// validated via RippleScoreBreakdown — see ripple-score-breakdown.ts.
const RippleCompanyNarrative = z.object({
  companyName: z.string().min(1),
  ticker: z.string().min(1).max(10),
  relationshipType: z.string().min(1).max(60),
  rippleLevel: RippleCompanyLevel,
  direction: Direction,
  mechanism: z.string().min(1).max(250),
  timeHorizon: TimeHorizon,
  confidence: Score,
  whyItMatters: z.string().min(1).max(300),
  metricsToMonitor: z.array(z.string()).max(3),
  mainRisk: z.string().min(1).max(200),
  evidence: z.array(z.string()).max(2),
});

export const RippleCompany = RippleCompanyNarrative.merge(RippleScoreBreakdown);
export type RippleCompany = z.infer<typeof RippleCompany>;

// Validates one `opportunities[]` entry straight from Anthropic's tool_use.input,
// before the server recomputes rippleOpportunityScore and re-sorts/truncates.
export const RippleCompanyFromLLM = RippleCompanyNarrative.merge(RippleScoreBreakdownFromLLM);
export type RippleCompanyFromLLM = z.infer<typeof RippleCompanyFromLLM>;
