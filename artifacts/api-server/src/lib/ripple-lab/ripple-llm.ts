/**
 * LLM engine for Ripple Lab analysis.
 * Uses Anthropic Claude with forced tool_choice to produce structured JSON.
 * Strict reliability rules: facts vs inferences vs speculation clearly separated.
 */

import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../logger';
import { formatKnowledgeBaseForLLM } from './knowledge-base';
import type {
  RippleNewsInput,
  RippleAnalysis,
  RippleOpportunity,
} from './types';

let client: Anthropic | undefined;
function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY must be set');
    client = new Anthropic({ apiKey });
  }
  return client;
}

const TOOL_NAME = 'submit_ripple_analysis';

const rippleTool: Anthropic.Tool = {
  name: TOOL_NAME,
  description: 'Submit the full structured Ripple analysis for the given news item.',
  input_schema: {
    type: 'object' as const,
    required: ['event', 'classification', 'economicDrivers', 'industries', 'rippleChain', 'opportunities', 'risks', 'confirmationSignals', 'invalidationSignals', 'sources'],
    properties: {
      event: {
        type: 'object',
        required: ['eventTitle', 'eventSummary', 'eventType', 'factualStatement', 'interpretation', 'uncertainties'],
        properties: {
          eventTitle: { type: 'string', description: 'Max 10 words. The core economic event.' },
          eventSummary: { type: 'string', description: 'Max 80 words. Factual, plain-language summary of what happened.' },
          eventType: { type: 'string', enum: ['earnings', 'guidance', 'capex', 'major_contract', 'product_launch', 'supply_constraint', 'production_expansion', 'pricing', 'demand_change', 'acquisition', 'partnership', 'regulation', 'government_spending', 'tariffs', 'sanctions', 'export_controls', 'litigation', 'management_change', 'financing', 'interest_rates', 'inflation', 'commodity_price', 'geopolitical_event', 'natural_disaster', 'analyst_revision', 'technology_breakthrough', 'other'] },
          factualStatement: { type: 'string', description: 'One sentence. Only confirmed facts from the news source. Prefix with FACT:' },
          interpretation: { type: 'string', description: 'One sentence. Economic interpretation. Prefix with INFERENCE:' },
          uncertainties: { type: 'array', items: { type: 'string' }, description: 'Max 3 key uncertainties.' },
        },
      },
      classification: {
        type: 'object',
        required: ['importance', 'direction', 'timeHorizon', 'confidence', 'themes'],
        properties: {
          importance: { type: 'string', enum: ['STRUCTURAL_SHIFT', 'THEME_BOOSTER', 'TACTICAL_CATALYST', 'NOISE'], description: 'STRUCTURAL_SHIFT: multi-year trend created/accelerated. THEME_BOOSTER: reinforces economic theme 6-18 months. TACTICAL_CATALYST: short-term impact, no structural change. NOISE: no material economic impact.' },
          direction: { type: 'string', enum: ['very_positive', 'positive', 'neutral', 'negative', 'very_negative', 'mixed'] },
          timeHorizon: { type: 'string', enum: ['immediate', 'short_term', 'medium_term', 'long_term'], description: 'immediate=hours/days, short_term=1-8 weeks, medium_term=2-12 months, long_term=12+ months' },
          confidence: { type: 'number', description: '0-100. Based on: source quality, clarity of economic link, presence of hard data, number of confirmations, level of inference required.' },
          themes: { type: 'array', items: { type: 'string' }, description: 'From taxonomy: AI infrastructure, semiconductors, data centers, power grid, nuclear energy, defense, drones, robotics, cybersecurity, rare earths, quantum computing' },
        },
      },
      economicDrivers: {
        type: 'array',
        items: {
          type: 'object',
          required: ['driver', 'description', 'magnitude'],
          properties: {
            driver: { type: 'string', description: 'Short label (e.g. "GPU demand surge")' },
            description: { type: 'string', description: 'Max 30 words. What economic force is at work.' },
            magnitude: { type: 'string', enum: ['high', 'medium', 'low'] },
          },
        },
        description: 'Max 4 economic drivers. Order by magnitude.',
      },
      industries: {
        type: 'array',
        items: {
          type: 'object',
          required: ['name', 'direction', 'level', 'mechanism', 'confidence'],
          properties: {
            name: { type: 'string' },
            direction: { type: 'string', enum: ['very_positive', 'positive', 'neutral', 'negative', 'very_negative', 'mixed'] },
            level: { type: 'number', enum: [0, 1, 2] },
            mechanism: { type: 'string', description: 'Max 20 words. Why this industry is affected.' },
            confidence: { type: 'number' },
          },
        },
        description: 'Max 6 industries. Level 0=direct, Level 1=first-order, Level 2=second-order.',
      },
      rippleChain: {
        type: 'array',
        items: {
          type: 'object',
          required: ['id', 'type', 'label', 'ticker', 'level', 'direction', 'relationship', 'mechanism', 'timeHorizon', 'confidence', 'evidence'],
          properties: {
            id: { type: 'string' },
            type: { type: 'string', enum: ['company', 'industry', 'theme', 'economic_driver'] },
            label: { type: 'string' },
            ticker: { type: ['string', 'null'] },
            level: { type: 'number', enum: [0, 1, 2] },
            direction: { type: 'string', enum: ['very_positive', 'positive', 'neutral', 'negative', 'very_negative', 'mixed'] },
            relationship: { type: 'string', enum: ['confirmed', 'strongly_supported', 'plausible', 'speculative'], description: 'confirmed=documented fact; strongly_supported=well-documented industry pattern; plausible=logical economic inference; speculative=limited evidence. Do NOT mark as confirmed if derived only from AI reasoning.' },
            mechanism: { type: 'string', description: 'Max 20 words. The specific mechanism.' },
            timeHorizon: { type: 'string', enum: ['immediate', 'short_term', 'medium_term', 'long_term'] },
            confidence: { type: 'number', description: '0-100' },
            evidence: { type: 'array', items: { type: 'string' }, description: 'Basis for this relationship. Max 2 items.' },
          },
        },
        description: 'Ripple chain nodes. Mix of economic_driver, industry, and company nodes. Max 12 nodes. Show confirmed + strongly_supported + high-confidence plausible. Omit speculative.',
      },
      opportunities: {
        type: 'array',
        items: {
          type: 'object',
          required: ['companyName', 'ticker', 'relationshipType', 'rippleLevel', 'direction', 'mechanism', 'timeHorizon', 'exposureScore', 'causalityScore', 'timingScore', 'fundamentalScore', 'valuationScore', 'confirmationScore', 'riskScore', 'rippleOpportunityScore', 'confidence', 'whyItMatters', 'metricsToMonitor', 'mainRisk', 'evidence'],
          properties: {
            companyName: { type: 'string' },
            ticker: { type: 'string' },
            relationshipType: { type: 'string', description: 'e.g. supplier, customer, infrastructure_provider, competitor, thematic_exposure' },
            rippleLevel: { type: 'number', enum: [1, 2] },
            direction: { type: 'string', enum: ['very_positive', 'positive', 'neutral', 'negative', 'very_negative', 'mixed'] },
            mechanism: { type: 'string', description: 'Max 25 words.' },
            timeHorizon: { type: 'string', enum: ['immediate', 'short_term', 'medium_term', 'long_term'] },
            exposureScore: { type: 'number', description: '0-100. % of business exposed to the economic driver.' },
            causalityScore: { type: 'number', description: '0-100. Directness and credibility of cause-effect link.' },
            timingScore: { type: 'number', description: '0-100. How quickly impact could materialise.' },
            fundamentalScore: { type: ['number', 'null'], description: '0-100 or null. Business quality: revenue growth, margins, FCF, ROIC. Null if unknown.' },
            valuationScore: { type: ['number', 'null'], description: '0-100 or null. Valuation attractiveness (higher=cheaper). Null if unknown.' },
            confirmationScore: { type: 'number', description: '0-100. Guidance, backlog, capex, management comments, analyst revisions.' },
            riskScore: { type: 'number', description: '0-100. Higher=riskier. Concentration, geopolitics, debt, competition, regulation.' },
            rippleOpportunityScore: { type: 'number', description: 'Computed: 0.30×Exposure + 0.20×Causality + 0.10×Timing + 0.15×Fundamental(or 0) + 0.10×Valuation(or 0) + 0.10×Confirmation + 0.05×(100-Risk). Adjust weights proportionally if fundamental/valuation are null.' },
            confidence: { type: 'number', description: '0-100.' },
            whyItMatters: { type: 'string', description: 'One sentence max 25 words. Why this company specifically benefits or is at risk.' },
            metricsToMonitor: { type: 'array', items: { type: 'string' }, description: 'Max 3 specific metrics.' },
            mainRisk: { type: 'string', description: 'Max 20 words. The single most important risk for this opportunity.' },
            evidence: { type: 'array', items: { type: 'string' }, description: 'Max 2 items. Fact or inference.' },
          },
        },
        description: 'Max 5 opportunities ordered by rippleOpportunityScore descending. Only companies from the seed list or those with confirmed relationships. Do not invent companies.',
      },
      risks: {
        type: 'array',
        items: {
          type: 'object',
          required: ['title', 'description', 'severity'],
          properties: {
            title: { type: 'string', description: 'Max 6 words.' },
            description: { type: 'string', description: 'Max 30 words.' },
            severity: { type: 'string', enum: ['high', 'medium', 'low'] },
          },
        },
        description: 'Max 4 risks. Order by severity.',
      },
      confirmationSignals: {
        type: 'array',
        items: {
          type: 'object',
          required: ['signal', 'description', 'type'],
          properties: {
            signal: { type: 'string', description: 'Max 8 words.' },
            description: { type: 'string', description: 'Max 30 words.' },
            type: { type: 'string', enum: ['fact', 'inference'] },
          },
        },
        description: 'Max 4 signals that would confirm the thesis.',
      },
      invalidationSignals: {
        type: 'array',
        items: {
          type: 'object',
          required: ['signal', 'description'],
          properties: {
            signal: { type: 'string', description: 'Max 8 words.' },
            description: { type: 'string', description: 'Max 30 words.' },
          },
        },
        description: 'Max 4 signals that would invalidate the thesis.',
      },
      sources: {
        type: 'array',
        items: {
          type: 'object',
          required: ['type', 'claim', 'basis'],
          properties: {
            type: { type: 'string', enum: ['fact', 'inference', 'speculation'] },
            claim: { type: 'string', description: 'Max 20 words.' },
            basis: { type: 'string', description: 'The source or reasoning.' },
          },
        },
        description: 'Key claims with fact/inference/speculation classification. Max 6 items.',
      },
    },
  },
};

function computeRippleScore(opp: Partial<RippleOpportunity>): number {
  const exposure = opp.exposureScore ?? 0;
  const causality = opp.causalityScore ?? 0;
  const timing = opp.timingScore ?? 0;
  const fundamental = opp.fundamentalScore;
  const valuation = opp.valuationScore;
  const confirmation = opp.confirmationScore ?? 0;
  const risk = opp.riskScore ?? 50;

  // Redistribute weights if fundamental/valuation are null
  let totalWeight = 0.30 + 0.20 + 0.10 + 0.10 + 0.05;
  let score = 0.30 * exposure + 0.20 * causality + 0.10 * timing + 0.10 * confirmation + 0.05 * (100 - risk);

  if (fundamental !== null && fundamental !== undefined) {
    score += 0.15 * fundamental;
    totalWeight += 0.15;
  }
  if (valuation !== null && valuation !== undefined) {
    score += 0.10 * valuation;
    totalWeight += 0.10;
  }

  // Normalize to 0-100
  return Math.round((score / totalWeight) * (1 / (1 - (1 - totalWeight))));
}

export async function generateRippleAnalysis(
  input: RippleNewsInput,
  language: 'en' | 'it',
): Promise<RippleAnalysis> {
  const kb = formatKnowledgeBaseForLLM();
  const languageName = language === 'it' ? 'Italian' : 'English';

  const systemPrompt = `You are the analysis engine for "The Ripple Effect" — a market intelligence platform for sophisticated investors.

Your job: given a financial news item, produce a full structured Ripple analysis that answers:
"The directly involved stock already moved. Which connected companies could benefit from first- and second-order effects?"

RELIABILITY RULES (CRITICAL):
- Never invent company relationships. Only use relationships from the knowledge base or state a clear economic inference.
- Classify every claim as FACT (confirmed from the source), INFERENCE (logical economic conclusion), or SPECULATION (limited evidence).
- Do NOT mark a relationship as "confirmed" if it derives only from AI reasoning.
- Do not invent percentages of exposure. Use null when data is unavailable.
- For opportunities, only include companies from the seed list. Do not invent tickers.

SCORING RUBRICS:
- Exposure (0-100): % of business exposed to the economic driver, supply chain role, geography
- Causality (0-100): directness and credibility of the cause-effect link
- Timing (0-100): how quickly the impact could materialise
- Fundamental (0-100): business quality — revenue growth, margins, FCF, ROIC (use general knowledge for seed companies; null for unknowns)
- Valuation (0-100): higher score = more attractive valuation (use general knowledge; null for unknowns)
- Confirmation (0-100): guidance, backlog, capex, management commentary, analyst revisions
- Risk (0-100): higher = riskier; customer concentration, geopolitics, debt, competition, regulation
- RippleOpportunityScore: 0.30×Exposure + 0.20×Causality + 0.10×Timing + 0.15×Fundamental + 0.10×Valuation + 0.10×Confirmation + 0.05×(100-Risk)

KNOWLEDGE BASE:
${kb}

Respond entirely in ${languageName}. Use hedged language. No buy/sell/hold recommendations.`;

  const primaryTickers = (input.primaryTickers ?? []).join(', ') || 'not specified';
  const userPrompt = `Analyze this financial news:

HEADLINE: ${input.headline}
${input.body ? `BODY: ${input.body}` : ''}
SOURCE: ${input.source ?? 'unknown'}
DATE: ${input.publishedAt ?? 'unknown'}
PRIMARY TICKERS: ${primaryTickers}

Produce a complete Ripple analysis using the submit_ripple_analysis tool.`;

  try {
    const message = await getClient().messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      tools: [rippleTool],
      tool_choice: { type: 'tool', name: TOOL_NAME },
    });

    const toolUse = message.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
    );
    if (!toolUse) throw new Error('No tool_use block in LLM response');

    const raw = toolUse.input as Omit<RippleAnalysis, 'news'>;

    // Server-side score recomputation for accuracy
    const opportunities = (raw.opportunities ?? []).map(opp => ({
      ...opp,
      rippleOpportunityScore: computeRippleScore(opp),
    })).sort((a, b) => b.rippleOpportunityScore - a.rippleOpportunityScore).slice(0, 5);

    const analysis: RippleAnalysis = {
      news: {
        headline: input.headline,
        source: input.source ?? '',
        publishedAt: input.publishedAt ?? '',
        url: input.url ?? '',
        primaryTickers: input.primaryTickers ?? [],
      },
      event: raw.event,
      classification: raw.classification,
      economicDrivers: raw.economicDrivers ?? [],
      industries: raw.industries ?? [],
      rippleChain: (raw.rippleChain ?? []).filter(
        node => node.relationship !== 'speculative',
      ),
      opportunities,
      risks: raw.risks ?? [],
      confirmationSignals: raw.confirmationSignals ?? [],
      invalidationSignals: raw.invalidationSignals ?? [],
      sources: raw.sources ?? [],
    };

    return analysis;
  } catch (error) {
    logger.error({ err: error, headline: input.headline }, 'Failed to generate Ripple analysis');
    throw error;
  }
}
