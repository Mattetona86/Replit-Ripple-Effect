import { z } from "zod";
import { Direction, ImportanceCategory, Score, TimeHorizon } from "./enums";
import { NewsEvent } from "./news-event";
import { EconomicDriver } from "./economic-driver";
import { IndustryExposure } from "./industry-exposure";
import { RippleChainNode } from "./ripple-chain-node";
import { RippleCompany } from "./ripple-company";
import { RippleRisk } from "./ripple-risk";
import { ConfirmationSignal } from "./confirmation-signal";
import { InvalidationSignal } from "./invalidation-signal";
import { SourceEvidence } from "./source-evidence";
import { DataConfidence } from "./data-confidence";

// Renamed from the current codebase's `RippleAnalysis`. Response shape for
// POST /api/market/ripple-lab/analyze. Wire-compatible with the current
// frontend in this phase: every field the current frontend reads still
// exists under the same name (`opportunities`, `rippleChain`, etc.) — the
// only addition is `dataConfidence`, which old/unaware clients simply ignore.
//
// news.source/publishedAt/url stay plain strings (server defaults missing
// input to '' today, see ripple-service.ts) rather than switching to
// nullable, to avoid a wire behavior change in this phase.
export const RippleAnalysisResult = z.object({
  news: z.object({
    headline: z.string(),
    source: z.string(),
    publishedAt: z.string(),
    url: z.string(),
    primaryTickers: z.array(z.string()),
  }),
  event: NewsEvent,
  classification: z.object({
    importance: ImportanceCategory,
    direction: Direction,
    timeHorizon: TimeHorizon,
    confidence: Score,
    themes: z.array(z.string()).max(6),
  }),
  economicDrivers: z.array(EconomicDriver).max(4),
  industries: z.array(IndustryExposure).max(6),
  rippleChain: z.array(RippleChainNode).max(12),
  opportunities: z.array(RippleCompany).max(5),
  risks: z.array(RippleRisk).max(4),
  confirmationSignals: z.array(ConfirmationSignal).max(4),
  invalidationSignals: z.array(InvalidationSignal).max(4),
  sources: z.array(SourceEvidence).max(6),
  dataConfidence: DataConfidence,
});
export type RippleAnalysisResult = z.infer<typeof RippleAnalysisResult>;
