import { LRUCache } from "lru-cache";
import {
  searchTickers as fmpSearchTickers,
  getQuote,
  getDailyHistory,
  getIntradayHistory,
  type FmpDailyBar,
  type FmpIntradayBar,
  type IntradayInterval,
} from "./fmp-client";
import {
  computeSma,
  computeEma,
  computeRsi,
  computeMacd,
  computeVolumeAvg,
  isUnusualVolume,
  findSwingPoints,
  classifyMarketStructure,
  findSupportResistance,
  type Bar,
} from "./indicators";
import { generateAnalysisExplanation, type Language, type AnalysisExplanation } from "./llm";

export type Timeframe = "1D" | "1W" | "1M" | "3M" | "1Y" | "5Y";

export interface TickerSearchResult {
  symbol: string;
  name: string;
  exchange: string;
}

export interface StockAnalysis {
  symbol: string;
  name: string;
  exchange: string;
  timeframe: Timeframe;
  lastPrice: number;
  asOf: string;
  candles: Bar[];
  volumeAvg20: ReturnType<typeof computeVolumeAvg>;
  sma50: ReturnType<typeof computeSma>;
  sma200: ReturnType<typeof computeSma>;
  ema20: ReturnType<typeof computeEma>;
  ema50: ReturnType<typeof computeEma>;
  rsi14: ReturnType<typeof computeRsi>;
  macd: ReturnType<typeof computeMacd>;
  swingPoints: ReturnType<typeof findSwingPoints>;
  marketStructure: ReturnType<typeof classifyMarketStructure>;
  supportLevels: number[];
  resistanceLevels: number[];
  unusualVolume: boolean;
  explanation: AnalysisExplanation;
}

// Cache raw provider responses briefly to respect FMP rate limits across
// rapid symbol/timeframe/language changes from the same user session.
const searchCache = new LRUCache<string, TickerSearchResult[]>({ ttl: 1000 * 60 * 5, max: 200 });
const dailyCache = new LRUCache<string, FmpDailyBar[]>({ ttl: 1000 * 60 * 5, max: 200 });
const intradayCache = new LRUCache<string, FmpIntradayBar[]>({ ttl: 1000 * 60 * 2, max: 200 });

export async function searchTickers(query: string): Promise<TickerSearchResult[]> {
  const cached = searchCache.get(query);
  if (cached) return cached;

  const US_EXCHANGES = new Set(["NASDAQ", "NYSE", "AMEX", "NYSE American", "NYSE Arca", "BATS", "CBOE"]);
  const results = await fmpSearchTickers(query);
  const mapped = results
    .filter((r) => r.symbol && r.name && US_EXCHANGES.has(r.exchange))
    .map((r) => ({ symbol: r.symbol, name: r.name, exchange: r.exchange ?? r.exchangeFullName }));
  searchCache.set(query, mapped);
  return mapped;
}

interface TimeframeConfig {
  kind: "daily" | "intraday";
  intradayInterval?: IntradayInterval;
  displayBars: number;
  warmupBars: number;
}

const TIMEFRAME_CONFIG: Record<Timeframe, TimeframeConfig> = {
  "1D": { kind: "intraday", intradayInterval: "5min", displayBars: 78, warmupBars: 260 },
  "1W": { kind: "intraday", intradayInterval: "30min", displayBars: 70, warmupBars: 260 },
  "1M": { kind: "daily", displayBars: 22, warmupBars: 260 },
  "3M": { kind: "daily", displayBars: 65, warmupBars: 260 },
  "1Y": { kind: "daily", displayBars: 252, warmupBars: 260 },
  "5Y": { kind: "daily", displayBars: 1260, warmupBars: 260 },
};

function toUnixSeconds(dateStr: string): number {
  // FMP daily dates are "YYYY-MM-DD"; intraday dates are "YYYY-MM-DD HH:mm:ss".
  const normalized = dateStr.includes(" ") ? dateStr.replace(" ", "T") + "Z" : dateStr + "T00:00:00Z";
  return Math.floor(new Date(normalized).getTime() / 1000);
}

async function loadBars(symbol: string, config: TimeframeConfig): Promise<Bar[]> {
  if (config.kind === "daily") {
    const cacheKey = symbol;
    let bars = dailyCache.get(cacheKey);
    if (!bars) {
      bars = await getDailyHistory(symbol);
      dailyCache.set(cacheKey, bars);
    }
    return bars.map((b) => ({
      time: toUnixSeconds(b.date),
      open: b.open,
      high: b.high,
      low: b.low,
      close: b.close,
      volume: b.volume,
    }));
  }

  const cacheKey = `${symbol}:${config.intradayInterval}`;
  let bars = intradayCache.get(cacheKey);
  if (!bars) {
    bars = await getIntradayHistory(symbol, config.intradayInterval!);
    intradayCache.set(cacheKey, bars);
  }
  return bars.map((b) => ({
    time: toUnixSeconds(b.date),
    open: b.open,
    high: b.high,
    low: b.low,
    close: b.close,
    volume: b.volume,
  }));
}

export async function getStockAnalysis(
  symbol: string,
  timeframe: Timeframe,
  language: Language,
): Promise<StockAnalysis | undefined> {
  const config = TIMEFRAME_CONFIG[timeframe];
  const [quote, allBars] = await Promise.all([getQuote(symbol), loadBars(symbol, config)]);

  if (!quote || allBars.length === 0) return undefined;

  // Compute indicators over the full fetched series (warm-up included), then
  // trim only the display window for the response so early bars still have
  // correctly-seeded indicator values.
  const sma50Full = computeSma(allBars, 50);
  const sma200Full = computeSma(allBars, 200);
  const ema20Full = computeEma(allBars, 20);
  const ema50Full = computeEma(allBars, 50);
  const rsi14Full = computeRsi(allBars, 14);
  const macdFull = computeMacd(allBars, 12, 26, 9);
  const volumeAvg20Full = computeVolumeAvg(allBars, 20);
  const swingPointsFull = findSwingPoints(allBars, 5);

  const displayBars = allBars.slice(-config.displayBars);
  const displayFrom = displayBars[0]?.time ?? 0;
  const inWindow = (t: number) => t >= displayFrom;

  const lastPrice = quote.price || displayBars[displayBars.length - 1]!.close;
  const swingPoints = swingPointsFull.filter((p) => inWindow(p.time));
  const marketStructure = classifyMarketStructure(swingPointsFull);
  const levels = findSupportResistance(swingPointsFull, lastPrice);
  const supportLevels = levels.filter((l) => l.type === "support").map((l) => l.price);
  const resistanceLevels = levels.filter((l) => l.type === "resistance").map((l) => l.price);
  const unusualVolume = isUnusualVolume(allBars, volumeAvg20Full);

  const explanation = await generateAnalysisExplanation({
    symbol: quote.symbol,
    name: quote.name,
    timeframe,
    language,
    lastPrice,
    bars: allBars,
    sma50: sma50Full,
    sma200: sma200Full,
    ema20: ema20Full,
    ema50: ema50Full,
    rsi14: rsi14Full,
    macd: macdFull,
    marketStructure,
    supportLevels,
    resistanceLevels,
    unusualVolume,
  });

  return {
    symbol: quote.symbol,
    name: quote.name,
    exchange: quote.exchange,
    timeframe,
    lastPrice,
    asOf: new Date(displayBars[displayBars.length - 1]!.time * 1000).toISOString(),
    candles: displayBars,
    volumeAvg20: volumeAvg20Full.filter((p) => inWindow(p.time)),
    sma50: sma50Full.filter((p) => inWindow(p.time)),
    sma200: sma200Full.filter((p) => inWindow(p.time)),
    ema20: ema20Full.filter((p) => inWindow(p.time)),
    ema50: ema50Full.filter((p) => inWindow(p.time)),
    rsi14: rsi14Full.filter((p) => inWindow(p.time)),
    macd: macdFull.filter((p) => inWindow(p.time)),
    swingPoints,
    marketStructure,
    supportLevels,
    resistanceLevels,
    unusualVolume,
    explanation,
  };
}
