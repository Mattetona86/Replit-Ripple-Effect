/**
 * Shared TypeScript types for the Ripple Lab analysis engine.
 */

export type EventType =
  | 'earnings' | 'guidance' | 'capex' | 'major_contract' | 'product_launch'
  | 'supply_constraint' | 'production_expansion' | 'pricing' | 'demand_change'
  | 'acquisition' | 'partnership' | 'regulation' | 'government_spending'
  | 'tariffs' | 'sanctions' | 'export_controls' | 'litigation' | 'management_change'
  | 'financing' | 'interest_rates' | 'inflation' | 'commodity_price'
  | 'geopolitical_event' | 'natural_disaster' | 'analyst_revision'
  | 'technology_breakthrough' | 'other';

export type Importance = 'STRUCTURAL_SHIFT' | 'THEME_BOOSTER' | 'TACTICAL_CATALYST' | 'NOISE';
export type Direction = 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative' | 'mixed';
export type TimeHorizon = 'immediate' | 'short_term' | 'medium_term' | 'long_term';
export type RelationshipStrength = 'confirmed' | 'strongly_supported' | 'plausible' | 'speculative';
export type NodeType = 'company' | 'industry' | 'theme' | 'economic_driver';

export interface RippleNewsInput {
  headline: string;
  body?: string;
  source?: string;
  url?: string;
  publishedAt?: string;
  primaryTickers?: string[];
}

export interface RippleChainNode {
  id: string;
  type: NodeType;
  label: string;
  ticker: string | null;
  level: 0 | 1 | 2;
  direction: Direction;
  relationship: RelationshipStrength;
  mechanism: string;
  timeHorizon: TimeHorizon;
  confidence: number;
  evidence: string[];
}

export interface RippleOpportunity {
  companyName: string;
  ticker: string;
  relationshipType: string;
  rippleLevel: 1 | 2;
  direction: Direction;
  mechanism: string;
  timeHorizon: TimeHorizon;
  exposureScore: number;
  causalityScore: number;
  timingScore: number;
  fundamentalScore: number | null;
  valuationScore: number | null;
  confirmationScore: number;
  riskScore: number;
  rippleOpportunityScore: number;
  confidence: number;
  whyItMatters: string;
  metricsToMonitor: string[];
  mainRisk: string;
  evidence: string[];
}

export interface RippleAnalysis {
  news: {
    headline: string;
    source: string;
    publishedAt: string;
    url: string;
    primaryTickers: string[];
  };
  event: {
    eventTitle: string;
    eventSummary: string;
    eventType: EventType;
    factualStatement: string;
    interpretation: string;
    uncertainties: string[];
  };
  classification: {
    importance: Importance;
    direction: Direction;
    timeHorizon: TimeHorizon;
    confidence: number;
    themes: string[];
  };
  economicDrivers: Array<{
    driver: string;
    description: string;
    magnitude: 'high' | 'medium' | 'low';
  }>;
  industries: Array<{
    name: string;
    direction: Direction;
    level: 0 | 1 | 2;
    mechanism: string;
    confidence: number;
  }>;
  rippleChain: RippleChainNode[];
  opportunities: RippleOpportunity[];
  risks: Array<{
    title: string;
    description: string;
    severity: 'high' | 'medium' | 'low';
  }>;
  confirmationSignals: Array<{
    signal: string;
    description: string;
    type: 'fact' | 'inference';
  }>;
  invalidationSignals: Array<{
    signal: string;
    description: string;
  }>;
  sources: Array<{
    type: 'fact' | 'inference' | 'speculation';
    claim: string;
    basis: string;
  }>;
}
