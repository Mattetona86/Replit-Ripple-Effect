import Anthropic from "@anthropic-ai/sdk";
import type { Bar, IndicatorPoint, MacdPoint, Level, MarketStructure } from "./indicators";
import { logger } from "../logger";

let client: Anthropic | undefined;

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY must be set. Provision it via the environment secrets flow.",
      );
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

export type Language = "en" | "it";

export interface IndicatorRead {
  key: string;
  label: string;
  currentValueLabel: string;
  signal: "bullish" | "bearish" | "neutral";
  explanation: string;
}

export interface IllustrativeSetup {
  entry: number | null;
  entryReasoning: string | null;
  stop: number | null;
  stopReasoning: string | null;
  target: number | null;
  targetReasoning: string | null;
}

export interface LeveledExplanation {
  support: number | null;
  supportReasoning: string | null;
  resistance: number | null;
  resistanceReasoning: string | null;
  ma200: number | null;
  ma200Reasoning: string | null;
  illustrativeSetup: IllustrativeSetup | null;
}

export interface AnalysisExplanation {
  indicatorReads: IndicatorRead[];
  bullishCase: string;
  bearishCase: string;
  summary: string;
  levels: LeveledExplanation;
  disclaimer: string;
}

export interface AnalysisContext {
  symbol: string;
  name: string;
  timeframe: string;
  language: Language;
  lastPrice: number;
  bars: Bar[];
  sma50: IndicatorPoint[];
  sma200: IndicatorPoint[];
  ema20: IndicatorPoint[];
  ema50: IndicatorPoint[];
  rsi14: IndicatorPoint[];
  macd: MacdPoint[];
  marketStructure: MarketStructure;
  supportLevels: number[];
  resistanceLevels: number[];
  unusualVolume: boolean;
}

function last<T>(arr: T[]): T | undefined {
  return arr[arr.length - 1];
}

function round(value: number | undefined): number | null {
  if (value === undefined || Number.isNaN(value)) return null;
  return Math.round(value * 100) / 100;
}

const ANALYSIS_TOOL_NAME = "submit_analysis_explanation";

const analysisTool: Anthropic.Tool = {
  name: ANALYSIS_TOOL_NAME,
  description: "Submit the structured, plain-language technical analysis explanation.",
  input_schema: {
    type: "object",
    required: ["indicatorReads", "bullishCase", "bearishCase", "summary", "levels", "disclaimer"],
    properties: {
      indicatorReads: {
        type: "array",
        items: {
          type: "object",
          required: ["key", "label", "currentValueLabel", "signal", "explanation"],
          properties: {
            key: { type: "string" },
            label: { type: "string" },
            currentValueLabel: { type: "string" },
            signal: { type: "string", enum: ["bullish", "bearish", "neutral"] },
            explanation: { type: "string" },
          },
        },
      },
      bullishCase: { type: "string" },
      bearishCase: { type: "string" },
      summary: { type: "string" },
      levels: {
        type: "object",
        required: [
          "support",
          "supportReasoning",
          "resistance",
          "resistanceReasoning",
          "ma200",
          "ma200Reasoning",
          "illustrativeSetup",
        ],
        properties: {
          support: { type: ["number", "null"] },
          supportReasoning: { type: ["string", "null"] },
          resistance: { type: ["number", "null"] },
          resistanceReasoning: { type: ["string", "null"] },
          ma200: { type: ["number", "null"] },
          ma200Reasoning: { type: ["string", "null"] },
          illustrativeSetup: {
            type: ["object", "null"],
            required: ["entry", "entryReasoning", "stop", "stopReasoning", "target", "targetReasoning"],
            properties: {
              entry: { type: ["number", "null"] },
              entryReasoning: { type: ["string", "null"] },
              stop: { type: ["number", "null"] },
              stopReasoning: { type: ["string", "null"] },
              target: { type: ["number", "null"] },
              targetReasoning: { type: ["string", "null"] },
            },
          },
        },
      },
      disclaimer: { type: "string" },
    },
  },
};

const DISCLAIMER_EN =
  "Educational tool for learning technical analysis. Not financial advice. Technical indicators describe probabilities, not certainties, and can be wrong. Do your own research.";
const DISCLAIMER_IT =
  "Strumento educativo per imparare l'analisi tecnica. Non è consulenza finanziaria. Gli indicatori tecnici descrivono probabilità, non certezze, e possono sbagliare. Fai le tue ricerche.";

export async function generateAnalysisExplanation(
  ctx: AnalysisContext,
): Promise<AnalysisExplanation> {
  const lastBar = last(ctx.bars);
  const facts = {
    symbol: ctx.symbol,
    name: ctx.name,
    timeframe: ctx.timeframe,
    lastPrice: ctx.lastPrice,
    lastClose: lastBar?.close ?? null,
    sma50: round(last(ctx.sma50)?.value),
    sma200: round(last(ctx.sma200)?.value),
    ema20: round(last(ctx.ema20)?.value),
    ema50: round(last(ctx.ema50)?.value),
    rsi14: round(last(ctx.rsi14)?.value),
    macd: last(ctx.macd)
      ? {
          macd: round(last(ctx.macd)!.macd),
          signal: round(last(ctx.macd)!.signal),
          histogram: round(last(ctx.macd)!.histogram),
        }
      : null,
    marketStructure: ctx.marketStructure,
    supportLevels: ctx.supportLevels.map((p) => round(p)),
    resistanceLevels: ctx.resistanceLevels.map((p) => round(p)),
    unusualVolume: ctx.unusualVolume,
  };

  const languageName = ctx.language === "it" ? "Italian" : "English";
  const disclaimer = ctx.language === "it" ? DISCLAIMER_IT : DISCLAIMER_EN;

  const systemPrompt = `You are a calm, precise technical-analysis teacher inside an educational app called "The Ripple Effect". You are given PRE-COMPUTED indicator values for a ticker (never estimate or invent numbers yourself — only reference the numbers provided). Explain what each indicator is currently signaling in plain, beginner-friendly language.

Rules:
- Respond entirely in ${languageName}.
- Write "indicatorReads" for exactly these indicators when data for them is present: sma50, sma200, ema20, ema50, rsi14, macd, volume, market_structure. Use "currentValueLabel" as a short human-readable value (e.g. "58.3" or "above price"). Never omit an indicator whose facts are present.
- Always present BOTH a bullish and bearish read (bullishCase and bearishCase) — never a one-sided directive. Some indicators may be neutral.
- The "summary" field balances both cases in 2-3 sentences and never tells the user to buy or sell.
- For "levels", label the nearest support and resistance from the given lists (or null if none given) and the 200-day/period moving average, each with a short reasoning string tied to the given numbers.
- "illustrativeSetup" is OPTIONAL and only for illustration of how traders might frame risk around the given support/resistance — always frame it as hypothetical/illustrative, never as a recommendation. If levels are insufficient to construct one, set it and its fields to null.
- Never phrase anything as guaranteed, never use imperative buy/sell language ("buy now", "sell here"). Use hedged, educational language ("could suggest", "some traders read this as").
- Set "disclaimer" to exactly: ${JSON.stringify(disclaimer)}`;

  const userPrompt = `Pre-computed facts for ${ctx.symbol} (${ctx.name}) on the ${ctx.timeframe} timeframe:\n${JSON.stringify(facts, null, 2)}`;

  try {
    const message = await getClient().messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      tools: [analysisTool],
      tool_choice: { type: "tool", name: ANALYSIS_TOOL_NAME },
    });

    const toolUse = message.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
    );
    if (!toolUse) throw new Error("Empty LLM response: no tool_use block returned");
    return toolUse.input as AnalysisExplanation;
  } catch (error) {
    logger.error({ err: error, symbol: ctx.symbol }, "Failed to generate analysis explanation");
    throw error;
  }
}
