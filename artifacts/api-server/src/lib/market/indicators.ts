import { SMA, EMA, RSI, MACD } from "technicalindicators";

export interface Bar {
  time: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IndicatorPoint {
  time: number;
  value: number;
}

export interface MacdPoint {
  time: number;
  macd: number;
  signal: number;
  histogram: number;
}

export interface SwingPoint {
  time: number;
  price: number;
  type: "high" | "low";
}

export interface Level {
  price: number;
  type: "support" | "resistance";
}

export type MarketStructure =
  | "higher_highs_higher_lows"
  | "lower_highs_lower_lows"
  | "sideways"
  | "mixed";

/** Aligns an indicator's trailing output array (shorter than input) back onto absolute bar times. */
function alignTrailing(bars: Bar[], values: number[]): IndicatorPoint[] {
  const offset = bars.length - values.length;
  if (offset < 0) return [];
  return values.map((value, i) => ({ time: bars[i + offset]!.time, value }));
}

export function computeSma(bars: Bar[], period: number): IndicatorPoint[] {
  const values = SMA.calculate({ period, values: bars.map((b) => b.close) });
  return alignTrailing(bars, values);
}

export function computeEma(bars: Bar[], period: number): IndicatorPoint[] {
  const values = EMA.calculate({ period, values: bars.map((b) => b.close) });
  return alignTrailing(bars, values);
}

export function computeRsi(bars: Bar[], period = 14): IndicatorPoint[] {
  const values = RSI.calculate({ period, values: bars.map((b) => b.close) });
  return alignTrailing(bars, values);
}

export function computeMacd(
  bars: Bar[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9,
): MacdPoint[] {
  const results = MACD.calculate({
    values: bars.map((b) => b.close),
    fastPeriod,
    slowPeriod,
    signalPeriod,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  });
  const offset = bars.length - results.length;
  if (offset < 0) return [];
  const points: MacdPoint[] = [];
  results.forEach((r, i) => {
    if (r.MACD === undefined || r.signal === undefined || r.histogram === undefined) return;
    points.push({
      time: bars[i + offset]!.time,
      macd: r.MACD,
      signal: r.signal,
      histogram: r.histogram,
    });
  });
  return points;
}

export function computeVolumeAvg(bars: Bar[], period = 20): IndicatorPoint[] {
  const values = SMA.calculate({ period, values: bars.map((b) => b.volume) });
  return alignTrailing(bars, values);
}

export function isUnusualVolume(bars: Bar[], volumeAvg20: IndicatorPoint[]): boolean {
  if (bars.length === 0 || volumeAvg20.length === 0) return false;
  const lastBar = bars[bars.length - 1]!;
  const lastAvg = volumeAvg20[volumeAvg20.length - 1]!;
  return lastBar.volume > lastAvg.value * 1.5;
}

/**
 * Detects local swing highs/lows using a simple fractal window: a bar is a swing
 * high/low if it is the max/min within `window` bars on either side.
 */
export function findSwingPoints(bars: Bar[], window = 5): SwingPoint[] {
  const points: SwingPoint[] = [];
  for (let i = window; i < bars.length - window; i++) {
    const slice = bars.slice(i - window, i + window + 1);
    const bar = bars[i]!;
    const isHigh = slice.every((b) => b.high <= bar.high);
    const isLow = slice.every((b) => b.low >= bar.low);
    if (isHigh) points.push({ time: bar.time, price: bar.high, type: "high" });
    else if (isLow) points.push({ time: bar.time, price: bar.low, type: "low" });
  }
  return points;
}

export function classifyMarketStructure(swingPoints: SwingPoint[]): MarketStructure {
  const highs = swingPoints.filter((p) => p.type === "high").slice(-3);
  const lows = swingPoints.filter((p) => p.type === "low").slice(-3);
  if (highs.length < 2 || lows.length < 2) return "sideways";

  const risingHighs = highs[highs.length - 1]!.price > highs[0]!.price;
  const risingLows = lows[lows.length - 1]!.price > lows[0]!.price;
  const fallingHighs = highs[highs.length - 1]!.price < highs[0]!.price;
  const fallingLows = lows[lows.length - 1]!.price < lows[0]!.price;

  if (risingHighs && risingLows) return "higher_highs_higher_lows";
  if (fallingHighs && fallingLows) return "lower_highs_lower_lows";
  if (Math.abs(highs[highs.length - 1]!.price / highs[0]!.price - 1) < 0.02) return "sideways";
  return "mixed";
}

/**
 * Auto-detects support/resistance levels by clustering nearby swing-point prices.
 * Returns at most a few of the most-touched levels relative to current price.
 */
export function findSupportResistance(swingPoints: SwingPoint[], lastPrice: number): Level[] {
  if (swingPoints.length === 0) return [];
  const tolerance = lastPrice * 0.015;
  const clusters: { prices: number[]; count: number }[] = [];

  for (const point of swingPoints) {
    const cluster = clusters.find((c) =>
      Math.abs(c.prices[0]! - point.price) <= tolerance,
    );
    if (cluster) {
      cluster.prices.push(point.price);
      cluster.count += 1;
    } else {
      clusters.push({ prices: [point.price], count: 1 });
    }
  }

  const levels: Level[] = clusters
    .filter((c) => c.count >= 2)
    .map((c) => ({
      price: c.prices.reduce((a, b) => a + b, 0) / c.prices.length,
      type: (c.prices.reduce((a, b) => a + b, 0) / c.prices.length < lastPrice
        ? "support"
        : "resistance") as "support" | "resistance",
    }));

  const support = levels
    .filter((l) => l.type === "support")
    .sort((a, b) => b.price - a.price)
    .slice(0, 2);
  const resistance = levels
    .filter((l) => l.type === "resistance")
    .sort((a, b) => a.price - b.price)
    .slice(0, 2);

  return [...support, ...resistance];
}
