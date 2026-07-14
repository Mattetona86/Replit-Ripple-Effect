import { z } from "zod";
import { EconomicDriver } from "./economic-driver";
import { IndustryExposure } from "./industry-exposure";
import { RippleChainNode } from "./ripple-chain-node";
import { RippleCompanyFromLLM } from "./ripple-company";
import { RippleRisk } from "./ripple-risk";
import { ConfirmationSignal } from "./confirmation-signal";
import { InvalidationSignal } from "./invalidation-signal";
import { SourceEvidence } from "./source-evidence";
import { RippleAnalysisResult } from "./ripple-analysis-result";

// Validates Anthropic's tool_use.input for `submit_ripple_analysis` — the one
// trust boundary that had zero runtime validation before this change.
//
// Derived from RippleAnalysisResult via .omit()/.extend() rather than
// hand-duplicated, so the two schemas can't silently drift apart.
//
// `event`/`classification.importance|direction|timeHorizon|confidence` stay
// strictly required, matching pre-existing behavior (the old code never
// defended these with `?? []` — an analysis without them is meaningless).
// Every other array is wrapped in `.catch([])`: Anthropic's tool call is
// best-effort, not guaranteed-conformant, so if one section comes back
// missing or malformed, that section degrades to empty instead of failing
// the whole analysis — restoring the graceful-degradation behavior the old
// `raw.x ?? []` fallbacks provided, while still validating well-formed data
// strictly.
//
// `themes` and `opportunities` caps are raised above the tool prompt's own
// display-oriented "Max 6" / "Max 5" to the true structural upper bound
// implied elsewhere in the same prompt (the theme taxonomy has 11 entries;
// rippleChain — which opportunities are explicitly told to draw from — caps
// at 12 nodes), so a compliant-but-larger response isn't rejected outright.
// The server still truncates to the display limits after validation (see
// computeRippleScore's `.slice(0, 5)` in ripple-llm.ts).
export const RippleAnalysisResultFromLLM = RippleAnalysisResult
  .omit({ news: true, dataConfidence: true })
  .extend({
    classification: RippleAnalysisResult.shape.classification.extend({
      themes: z.array(z.string()).max(11),
    }),
    economicDrivers: z.array(EconomicDriver).max(4).catch([]),
    industries: z.array(IndustryExposure).max(6).catch([]),
    rippleChain: z.array(RippleChainNode).max(12).catch([]),
    opportunities: z.array(RippleCompanyFromLLM).max(12).catch([]),
    risks: z.array(RippleRisk).max(4).catch([]),
    confirmationSignals: z.array(ConfirmationSignal).max(4).catch([]),
    invalidationSignals: z.array(InvalidationSignal).max(4).catch([]),
    sources: z.array(SourceEvidence).max(6).catch([]),
  });
export type RippleAnalysisResultFromLLM = z.infer<typeof RippleAnalysisResultFromLLM>;
