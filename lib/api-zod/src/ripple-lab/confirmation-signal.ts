import { z } from "zod";
import { EvidenceTier } from "./enums";

// Today the LLM tool only ever emits "fact" or "inference" here (never
// "speculation"), unlike SourceEvidence.type which allows all three — that's
// an existing, deliberate business rule, so it's enforced here too rather
// than silently widened to the full EvidenceTier.
export const ConfirmationSignal = z.object({
  signal: z.string().min(1).max(60),
  description: z.string().min(1).max(200),
  type: EvidenceTier.exclude(["speculation"]),
});
export type ConfirmationSignal = z.infer<typeof ConfirmationSignal>;
