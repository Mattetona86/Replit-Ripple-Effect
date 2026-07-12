/**
 * AI explanation engine for fundamental analysis.
 * Produces a concise structured verdict — never raw numbers or verbose sections.
 */

import Anthropic from "@anthropic-ai/sdk";
import { logger } from "../logger";
import type { Language } from "./llm";
import type { FundamentalData } from "./fundamental-calculator";

let client: Anthropic | undefined;
function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY must be set");
    client = new Anthropic({ apiKey });
  }
  return client;
}

export interface AICatalyst {
  title: string;
  explanation: string;
  supportingData?: string;
  timeHorizon: string;
}

export interface AIRisk {
  title: string;
  severity: "high" | "medium" | "low";
  explanation: string;
  metricToMonitor: string;
}

export interface FundamentalExplanation {
  headline: string;
  ourTake: string;
  businessLine: string;
  valuationLine: string;
  momentumLine: string;
  mainRisk: string;
  catalysts: AICatalyst[];
  aiRisks: AIRisk[];
  metricsToWatch: string[];
  disclaimer: string;
}

const TOOL_NAME = "submit_fundamental_verdict";

const fundamentalTool: Anthropic.Tool = {
  name: TOOL_NAME,
  description: "Submit the concise structured fundamental analysis verdict.",
  input_schema: {
    type: "object",
    required: [
      "headline",
      "ourTake",
      "businessLine",
      "valuationLine",
      "momentumLine",
      "mainRisk",
      "catalysts",
      "aiRisks",
      "metricsToWatch",
    ],
    properties: {
      headline: {
        type: "string",
        description:
          "Maximum 12 words. A neutral, factual headline capturing the single most important data signal. No recommendation language.",
      },
      ourTake: {
        type: "string",
        description:
          "Maximum 80 words. Balanced educational verdict on the company's current fundamental picture. Reference the most important data points. Use hedged language (suggests, may indicate, the data shows). No buy/sell/hold recommendation. No price prediction.",
      },
      businessLine: {
        type: "string",
        description:
          "One sentence (max 20 words) on business trend: revenue momentum, margin trajectory, or earnings quality.",
      },
      valuationLine: {
        type: "string",
        description:
          "One sentence (max 20 words) on current valuation vs history or peers. No recommendation.",
      },
      momentumLine: {
        type: "string",
        description:
          "One sentence (max 20 words) on current momentum: latest quarter trend, analyst sentiment, or recent news tone.",
      },
      mainRisk: {
        type: "string",
        description:
          "One sentence (max 20 words) on the single most important fundamental risk.",
      },
      catalysts: {
        type: "array",
        items: {
          type: "object",
          required: ["title", "explanation", "timeHorizon"],
          properties: {
            title: { type: "string", description: "Max 6 words." },
            explanation: { type: "string", description: "Max 30 words. Explain the catalyst and the specific metric or trend supporting it." },
            supportingData: { type: "string", description: "Specific data point from the input (e.g. 'Revenue CAGR 3Y: +18%')." },
            timeHorizon: { type: "string", description: "One of: 'Short term (< 6 months)', 'Medium term (6–18 months)', 'Long term (> 18 months)'." },
          },
        },
        description: "Exactly 3 distinct catalysts grounded in the provided data. No invented facts.",
      },
      aiRisks: {
        type: "array",
        items: {
          type: "object",
          required: ["title", "severity", "explanation", "metricToMonitor"],
          properties: {
            title: { type: "string", description: "Max 6 words." },
            severity: { type: "string", enum: ["high", "medium", "low"] },
            explanation: { type: "string", description: "Max 30 words. Explain the risk and why the metric is concerning." },
            metricToMonitor: { type: "string", description: "The specific metric to track (e.g. 'Free cash flow margin TTM')." },
          },
        },
        description: "Exactly 3 distinct risks grounded in the provided data. Must differ from catalysts.",
      },
      metricsToWatch: {
        type: "array",
        items: { type: "string" },
        description: "Exactly 3 metric names to monitor in the next 1–2 quarters. Short labels (e.g. 'Operating margin', 'FCF conversion', 'Revenue guidance').",
      },
    },
  },
};

const DISCLAIMER_EN =
  "For informational and educational purposes only. Not financial advice. Data may contain errors or delays. Past performance is not indicative of future results.";
const DISCLAIMER_IT =
  "Solo a scopo informativo ed educativo. Non costituisce consulenza finanziaria. I dati possono contenere errori o ritardi. I rendimenti passati non sono indicativi di quelli futuri.";

export async function generateFundamentalExplanation(
  data: FundamentalData,
  language: Language,
): Promise<FundamentalExplanation> {
  const languageName = language === "it" ? "Italian" : "English";
  const disclaimer = language === "it" ? DISCLAIMER_IT : DISCLAIMER_EN;

  const payload = {
    company: {
      symbol: data.symbol,
      name: data.name,
      sector: data.sector,
      industry: data.industry,
      currency: data.currency,
    },
    scores: {
      overall: data.scores.overall,
      growth: data.scores.growth.score,
      profitability: data.scores.profitability.score,
      cashFlow: data.scores.cashFlow.score,
      financialStrength: data.scores.financialStrength.score,
      valuation: data.scores.valuation.score,
    },
    growth: {
      revenueTtm: data.growth.revenueTtm,
      revenueYoy: data.growth.revenueYoy.value,
      revenueYoyIsNm: data.growth.revenueYoy.isNm,
      revenue3yCagr: data.growth.revenue3yCagr.value,
      revenue3yCagrIsNm: data.growth.revenue3yCagr.isNm,
      epsDilutedTtm: data.growth.epsDilutedTtm,
      epsYoy: data.growth.epsYoy.value,
      epsYoyIsNm: data.growth.epsYoy.isNm,
      fcfYoy: data.growth.fcfYoy.value,
    },
    profitability: {
      operatingMarginTtm: data.profitability.operatingMarginTtm,
      operatingMarginTrend: data.profitability.operatingMarginTrend,
      netMarginTtm: data.profitability.netMarginTtm,
      fcfMarginTtm: data.profitability.fcfMarginTtm,
      roic: data.profitability.roic,
      roeWarning: data.profitability.roeWarning,
    },
    cashFlow: {
      fcfTtm: data.cashFlow.fcfTtm,
      cashConversionRatio: data.cashFlow.cashConversionRatio,
      earningsQuality: data.cashFlow.earningsQuality,
      earningsQualitySignals: data.cashFlow.earningsQualitySignals,
    },
    balanceSheet: {
      isNetCash: data.financialStrength.isNetCash,
      netDebt: data.financialStrength.netDebt,
      netDebtToEbitda: data.financialStrength.netDebtToEbitda,
      netDebtToEbitdaIsNm: data.financialStrength.netDebtToEbitdaIsNm,
      currentRatio: data.financialStrength.currentRatio,
      interestCoverage: data.financialStrength.interestCoverage,
    },
    valuation: {
      pe: data.valuation.pe.value,
      peVsHistory5y: data.valuation.pe.historicalMedian5y != null
        ? { current: data.valuation.pe.value, median5y: data.valuation.pe.historicalMedian5y }
        : null,
      forwardPe: data.valuation.forwardPe.value,
      evEbitda: data.valuation.evEbitda.value,
      evEbitdaVsHistory5y: data.valuation.evEbitda.historicalMedian5y != null
        ? { current: data.valuation.evEbitda.value, median5y: data.valuation.evEbitda.historicalMedian5y }
        : null,
      valuationQuadrant: data.valuation.valuationMatrix.quadrant,
    },
    priceChange: {
      oneYear: data.priceVsBusiness.priceChange1y,
      threeYear: data.priceVsBusiness.priceChange3y,
      fiveYear: data.priceVsBusiness.priceChange5y,
    },
    redFlags: data.redFlags.map((f) => ({
      key: f.key,
      severity: f.severity,
      dataPoint: f.dataPoint,
    })),
    strengths: data.strengths.map((s) => ({
      key: s.key,
      dataPoint: s.dataPoint,
    })),
    newsAvailable: data.newsMomentum.available,
    recentNews: data.newsMomentum.items.slice(0, 5).map((n) => n.title),
  };

  const systemPrompt = `You are an educational analyst for "The Ripple Effect" platform.
Your job: produce a concise, structured verdict using ONLY the pre-computed data provided.
Rules:
- Never invent data, competitor names, specific numbers not in the input.
- Use hedged language: "suggests", "may indicate", "the data shows", "historically".
- No buy/sell/hold recommendation. No price prediction. No absolute certainty.
- When a value is null, omit it or note it as unavailable. Never fill in invented numbers.
- Keep all text under the word limits specified in each field.
- Respond entirely in ${languageName}.`;

  const userPrompt = `Write the fundamental verdict for ${data.symbol} (${data.name}) using only this data:\n${JSON.stringify(payload, null, 2)}`;

  try {
    const message = await getClient().messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      tools: [fundamentalTool],
      tool_choice: { type: "tool", name: TOOL_NAME },
    });

    const toolUse = message.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
    );
    if (!toolUse) throw new Error("No tool_use block in LLM response");

    const result = toolUse.input as FundamentalExplanation;
    result.disclaimer = disclaimer;
    return result;
  } catch (error) {
    logger.error({ err: error, symbol: data.symbol }, "Failed to generate fundamental explanation");
    throw error;
  }
}
