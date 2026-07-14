/**
 * Shared helpers for the Ripple Effect tabs (Opportunities/Chain/Risks) and
 * the Company Drawer — kept in one place so the three views can't drift on
 * how they classify direction/confidence/fundamental fit.
 */
import type { Direction, RelationshipStrength, RippleChainNode, RippleOpportunity } from '@/lib/ripple-types';

export const DIR_COLOR: Record<Direction, { text: string; bg: string; dot: string }> = {
  very_positive: { text: 'text-emerald-700', bg: 'bg-emerald-50', dot: 'bg-emerald-500' },
  positive: { text: 'text-emerald-600', bg: 'bg-emerald-50', dot: 'bg-emerald-400' },
  neutral: { text: 'text-blue-600', bg: 'bg-blue-50', dot: 'bg-blue-400' },
  mixed: { text: 'text-amber-600', bg: 'bg-amber-50', dot: 'bg-amber-400' },
  negative: { text: 'text-red-600', bg: 'bg-red-50', dot: 'bg-red-400' },
  very_negative: { text: 'text-red-700', bg: 'bg-red-50', dot: 'bg-red-500' },
};

// i18n key suffix for each direction value — caller does t(`rl.direction.${DIR_I18N_KEY[d]}`)
export const DIR_I18N_KEY: Record<Direction, string> = {
  very_positive: 'veryPositive',
  positive: 'positive',
  neutral: 'neutral',
  mixed: 'mixed',
  negative: 'negative',
  very_negative: 'veryNegative',
};

export const REL_CONFIDENCE_COLOR: Record<RelationshipStrength, string> = {
  confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  strongly_supported: 'bg-blue-50 text-blue-700 border-blue-200',
  plausible: 'bg-amber-50 text-amber-700 border-amber-200',
  speculative: 'bg-gray-50 text-gray-500 border-gray-200',
};

/**
 * A RippleOpportunity's own `confidence` field is a plain 0-100 rating, NOT
 * the categorical confirmed/strongly_supported/plausible/speculative tier —
 * that tier only exists on rippleChain nodes. Never derive "relationship
 * confidence" by bucketing the numeric score (that fabricates a category the
 * LLM never asserted for this company) — look up the matching rippleChain
 * node by ticker instead, and return undefined (render as "—") if there
 * isn't one, rather than guessing.
 */
export function findRelationshipConfidence(
  rippleChain: RippleChainNode[],
  ticker: string,
): RelationshipStrength | undefined {
  return rippleChain.find(n => n.type === 'company' && n.ticker === ticker)?.relationship;
}

export function fundamentalTier(score: number | null): 'strong' | 'good' | 'neutral' | 'weak' | 'unavailable' {
  if (score === null) return 'unavailable';
  if (score >= 80) return 'strong';
  if (score >= 65) return 'good';
  if (score >= 45) return 'neutral';
  return 'weak';
}

export function valuationTier(score: number | null): 'attractive' | 'neutral' | 'expensive' | 'unavailable' {
  if (score === null) return 'unavailable';
  if (score >= 65) return 'attractive';
  if (score >= 40) return 'neutral';
  return 'expensive';
}

export function scoreColorClass(score: number): string {
  if (score >= 70) return 'text-emerald-700';
  if (score >= 50) return 'text-amber-700';
  return 'text-red-600';
}

export function isPartialScore(opp: RippleOpportunity): boolean {
  return opp.fundamentalScore === null || opp.valuationScore === null;
}

export function truncateWords(text: string, maxWords = 12): string {
  const words = text.split(' ');
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(' ') + '…';
}
