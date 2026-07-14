/**
 * Shared TypeScript types for the Ripple Lab analysis engine.
 *
 * The response shape (`RippleAnalysis`) is no longer hand-written here — it's
 * derived from the validated Zod contract in `@workspace/api-zod` (see
 * lib/api-zod/src/ripple-lab/), which is the single source of truth shared
 * with the OpenAPI contract. Only the service input type stays local, since
 * it's an internal parameter shape, not part of the wire contract.
 */

import type { RippleAnalysisResult } from '@workspace/api-zod';

export interface RippleNewsInput {
  headline: string;
  body?: string;
  source?: string;
  url?: string;
  publishedAt?: string;
  primaryTickers?: string[];
}

export type RippleAnalysis = RippleAnalysisResult;
