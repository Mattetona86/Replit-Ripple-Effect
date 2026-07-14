import { z } from "zod";

export const Direction = z.enum([
  "very_positive",
  "positive",
  "neutral",
  "negative",
  "very_negative",
  "mixed",
]);
export type Direction = z.infer<typeof Direction>;

export const TimeHorizon = z.enum(["immediate", "short_term", "medium_term", "long_term"]);
export type TimeHorizon = z.infer<typeof TimeHorizon>;

export const ImportanceCategory = z.enum([
  "STRUCTURAL_SHIFT",
  "THEME_BOOSTER",
  "TACTICAL_CATALYST",
  "NOISE",
]);
export type ImportanceCategory = z.infer<typeof ImportanceCategory>;

export const RelationshipConfidence = z.enum([
  "confirmed",
  "strongly_supported",
  "plausible",
  "speculative",
]);
export type RelationshipConfidence = z.infer<typeof RelationshipConfidence>;

// Ripple chain node level: 0 = the news' own ticker(s), 1 = first-order, 2 = second-order.
export const RippleLevel = z.union([z.literal(0), z.literal(1), z.literal(2)]);
export type RippleLevel = z.infer<typeof RippleLevel>;

// Companies (scored opportunities) are never level 0 — that's the ticker the news is directly about.
export const RippleCompanyLevel = z.union([z.literal(1), z.literal(2)]);
export type RippleCompanyLevel = z.infer<typeof RippleCompanyLevel>;

export const RippleEntityKind = z.enum(["company", "industry", "theme", "economic_driver"]);
export type RippleEntityKind = z.infer<typeof RippleEntityKind>;

export const EventType = z.enum([
  "earnings",
  "guidance",
  "capex",
  "major_contract",
  "product_launch",
  "supply_constraint",
  "production_expansion",
  "pricing",
  "demand_change",
  "acquisition",
  "partnership",
  "regulation",
  "government_spending",
  "tariffs",
  "sanctions",
  "export_controls",
  "litigation",
  "management_change",
  "financing",
  "interest_rates",
  "inflation",
  "commodity_price",
  "geopolitical_event",
  "natural_disaster",
  "analyst_revision",
  "technology_breakthrough",
  "other",
]);
export type EventType = z.infer<typeof EventType>;

// Shared "how solid is this claim" tier. The current LLM tool only ever emits
// a subset of this per field (sources: all 3; confirmationSignals: fact/inference
// only) — kept as one shared enum so those two stop drifting independently.
export const EvidenceTier = z.enum(["fact", "inference", "speculation"]);
export type EvidenceTier = z.infer<typeof EvidenceTier>;

export const Magnitude = z.enum(["high", "medium", "low"]);
export type Magnitude = z.infer<typeof Magnitude>;

export const Severity = z.enum(["high", "medium", "low"]);
export type Severity = z.infer<typeof Severity>;

export const ConfidenceLevel = z.enum(["high", "medium", "low"]);
export type ConfidenceLevel = z.infer<typeof ConfidenceLevel>;

// Every *Score field in Ripple Lab is a 0-100 rating computed or estimated
// server-side/LLM-side. Never coerce a missing rating to 0 — use Score.nullable().
export const Score = z.number().min(0).max(100);
