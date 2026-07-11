/**
 * AI explanation engine for fundamental analysis.
 * Receives pre-computed structured data — never raw text or unstructured numbers.
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

export interface FundamentalExplanation {
  summary: string;
  growthAnalysis: string;
  profitabilityAnalysis: string;
  cashFlowAnalysis: string;
  balanceSheetAnalysis: string;
  valuationAnalysis: string;
  peerAnalysis: string;
  strengths: string[];
  risks: string[];
  conclusion: string;
  disclaimer: string;
}

const TOOL_NAME = "submit_fundamental_explanation";

const fundamentalTool: Anthropic.Tool = {
  name: TOOL_NAME,
  description: "Submit the structured plain-language fundamental analysis explanation.",
  input_schema: {
    type: "object",
    required: [
      "summary",
      "growthAnalysis",
      "profitabilityAnalysis",
      "cashFlowAnalysis",
      "balanceSheetAnalysis",
      "valuationAnalysis",
      "peerAnalysis",
      "strengths",
      "risks",
      "conclusion",
      "disclaimer",
    ],
    properties: {
      summary: {
        type: "string",
        description: "Max 120 words covering: what works, what doesn't, main trends, financial situation, valuation vs peers, main risk.",
      },
      growthAnalysis: {
        type: "string",
        description: "2-3 sentences explaining the growth metrics provided. Highlight trend, quality, and peer comparison.",
      },
      profitabilityAnalysis: {
        type: "string",
        description: "2-3 sentences on margins, ROE, ROIC. Note trends and peer comparison.",
      },
      cashFlowAnalysis: {
        type: "string",
        description: "2-3 sentences on FCF generation, cash conversion, earnings quality.",
      },
      balanceSheetAnalysis: {
        type: "string",
        description: "2-3 sentences on debt levels, liquidity, financial strength.",
      },
      valuationAnalysis: {
        type: "string",
        description: "2-3 sentences on current multiples vs peers and own history. No buy/sell recommendations.",
      },
      peerAnalysis: {
        type: "string",
        description: "2-3 sentences comparing the company to its peer group across the key metrics provided.",
      },
      strengths: {
        type: "array",
        items: { type: "string" },
        description: "Up to 5 concise bullet points on positive fundamental aspects.",
      },
      risks: {
        type: "array",
        items: { type: "string" },
        description: "Up to 5 concise bullet points on fundamental risks or concerns.",
      },
      conclusion: {
        type: "string",
        description: "2-3 balanced concluding sentences summarising the overall fundamental picture without investment recommendations.",
      },
      disclaimer: { type: "string" },
    },
  },
};

const DISCLAIMER_EN =
  "This analysis is for informational and educational purposes only and does not constitute financial, tax, or legal advice. Data may contain errors, delays, or omissions. Fair value estimates depend on the assumptions used and do not represent a certain prediction of the future price.";
const DISCLAIMER_IT =
  "Questa analisi ha finalità esclusivamente informative ed educative e non costituisce consulenza finanziaria, fiscale o legale. I dati possono contenere errori, ritardi o omissioni. Le stime di fair value dipendono dalle ipotesi utilizzate e non rappresentano una previsione certa del prezzo futuro.";

export async function generateFundamentalExplanation(
  data: FundamentalData,
  language: Language,
): Promise<FundamentalExplanation> {
  const languageName = language === "it" ? "Italian" : "English";
  const disclaimer = language === "it" ? DISCLAIMER_IT : DISCLAIMER_EN;

  // Build a compact but complete JSON payload — the AI only references these numbers
  const payload = {
    company: {
      symbol: data.symbol,
      name: data.name,
      sector: data.sector,
      industry: data.industry,
      lastPrice: data.lastPrice,
      marketCap: data.marketCap,
      enterpriseValue: data.enterpriseValue,
      currency: data.currency,
    },
    scores: {
      overall: data.scores.overall,
      growth: data.scores.growth.score,
      profitability: data.scores.profitability.score,
      cashFlow: data.scores.cashFlow.score,
      financialStrength: data.scores.financialStrength.score,
      capitalEfficiency: data.scores.capitalEfficiency.score,
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
      revenueYoyVsPeerMedian: data.growth.revenueYoy.peerMedian,
      revenueYoyPeerPercentile: data.growth.revenueYoy.peerPercentile,
    },
    profitability: {
      grossMarginTtm: data.profitability.grossMarginTtm,
      operatingMarginTtm: data.profitability.operatingMarginTtm,
      operatingMarginTrend: data.profitability.operatingMarginTrend,
      operatingMarginVsPeers: data.profitability.operatingMarginVsPeers,
      netMarginTtm: data.profitability.netMarginTtm,
      fcfMarginTtm: data.profitability.fcfMarginTtm,
      roa: data.profitability.roa,
      roe: data.profitability.roe,
      roic: data.profitability.roic,
      roeWarning: data.profitability.roeWarning,
      peerOperatingMarginMedian: data.profitability.peerOperatingMarginMedian,
    },
    cashFlow: {
      ocfTtm: data.cashFlow.ocfTtm,
      fcfTtm: data.cashFlow.fcfTtm,
      fcfMarginTtm: data.cashFlow.fcfMarginTtm,
      cashConversionRatio: data.cashFlow.cashConversionRatio,
      sbcToRevenue: data.cashFlow.sbcToRevenueTtm,
      earningsQuality: data.cashFlow.earningsQuality,
      earningsQualitySignals: data.cashFlow.earningsQualitySignals,
    },
    balanceSheet: {
      cash: data.financialStrength.cash,
      totalDebt: data.financialStrength.totalDebt,
      netDebt: data.financialStrength.netDebt,
      isNetCash: data.financialStrength.isNetCash,
      debtToEquity: data.financialStrength.debtToEquity,
      netDebtToEbitda: data.financialStrength.netDebtToEbitda,
      netDebtToEbitdaIsNm: data.financialStrength.netDebtToEbitdaIsNm,
      currentRatio: data.financialStrength.currentRatio,
      interestCoverage: data.financialStrength.interestCoverage,
    },
    valuation: {
      pe: data.valuation.pe.value,
      peVsPeers: data.valuation.pe.vsPeers,
      peVsHistory3y: data.valuation.pe.vsHistory3y,
      forwardPe: data.valuation.forwardPe.value,
      evEbitda: data.valuation.evEbitda.value,
      evEbitdaVsPeers: data.valuation.evEbitda.vsPeers,
      ps: data.valuation.ps.value,
      pFcf: data.valuation.pFcf.value,
      dividendYield: data.valuation.dividendYield,
      dilution1y: data.valuation.dilution1y,
      valuationQuadrant: data.valuation.valuationMatrix.quadrant,
    },
    peerComparison: {
      peerCount: data.peers.peerGroupSize,
      peers: data.peers.peers.slice(0, 5).map((p) => ({
        symbol: p.symbol,
        revenueGrowthYoy: p.revenueGrowthYoy,
        operatingMargin: p.operatingMargin,
        roic: p.roic,
        pe: p.pe,
        evToEbitda: p.evToEbitda,
      })),
    },
    redFlags: data.redFlags.map((f) => ({ key: f.key, severity: f.severity, dataPoint: f.dataPoint })),
    strengths: data.strengths.map((s) => ({ key: s.key, dataPoint: s.dataPoint })),
    dataCoverage: {
      coveragePct: data.dataCoverage.coveragePct,
      confidenceLevel: data.dataCoverage.confidenceLevel,
    },
  };

  const systemPrompt = `You are an educational financial analyst inside the "The Ripple Effect" platform. 
You must explain exclusively the pre-computed data provided in the input. 
Never invent data, competitors, forecasts, or motivations not present in the input.
Distinguish facts, estimates, and interpretations.
When a data point is null or absent, declare it clearly — do not fill in.
Do not give personalised investment recommendations.
Do not predict with certainty the future direction of the price.
Compare the company with its peer group and with its own history using only the data given.
Highlight both positive aspects and risks equally.
Respond entirely in ${languageName}.
Never use phrases like "it's definitely undervalued", "the price will rise", "it's a buy", "it's a safe stock".
Use hedged, educational language: "suggests", "may indicate", "the data shows", "compared to peers".`;

  const userPrompt = `Fundamental analysis data for ${data.symbol} (${data.name}):\n${JSON.stringify(payload, null, 2)}`;

  try {
    const message = await getClient().messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
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
