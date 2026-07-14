import { z } from "zod";
import { NewsAnalysisRequest } from "./news-analysis-request";
import { RippleAnalysisResult } from "./ripple-analysis-result";

// The persisted shape: what POST /market/ripple-lab/analyze and
// GET /market/ripple-lab/:id both return. `schemaVersion` is a row-level
// storage concern (lets a future migration reshape `analysis` without
// guessing what shape old rows are in) — distinct from the AI-output
// contract itself, so it lives here rather than inside RippleAnalysisResult.
export const RippleAnalysisRecord = z.object({
  id: z.number().int().positive(),
  schemaVersion: z.number().int().positive(),
  article: NewsAnalysisRequest,
  analysis: RippleAnalysisResult,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type RippleAnalysisRecord = z.infer<typeof RippleAnalysisRecord>;

export const GetRippleAnalysisParams = z.object({
  id: z.coerce.number().int().positive(),
});
export type GetRippleAnalysisParams = z.infer<typeof GetRippleAnalysisParams>;
