import { logger } from "../logger";

const FMP_BASE_URL = "https://financialmodelingprep.com/stable";

function apiKey(): string {
  const key = process.env.FMP_API_KEY;
  if (!key) {
    throw new Error(
      "FMP_API_KEY must be set. Provision it via the environment secrets flow.",
    );
  }
  return key;
}

async function fmpGet<T>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
  const url = new URL(`${FMP_BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  url.searchParams.set("apikey", apiKey());

  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    logger.error({ status: res.status, path, body }, "FMP request failed");
    throw new Error(`FMP request to ${path} failed with status ${res.status}`);
  }
  return (await res.json()) as T;
}

export interface FmpSearchResult {
  symbol: string;
  name: string;
  currency: string;
  exchangeFullName: string;
  exchange: string;
}

export async function searchTickers(query: string): Promise<FmpSearchResult[]> {
  return fmpGet<FmpSearchResult[]>("/search-symbol", { query, limit: 10 });
}

// FMP's /search-symbol only matches against the ticker symbol itself, so a
// query like "Tesla" returns nothing. /search-name matches against the
// company name, which is what users usually type.
export async function searchByName(query: string): Promise<FmpSearchResult[]> {
  return fmpGet<FmpSearchResult[]>("/search-name", { query, limit: 10 });
}

export interface FmpQuote {
  symbol: string;
  name: string;
  price: number;
  exchange: string;
}

export async function getQuote(symbol: string): Promise<FmpQuote | undefined> {
  const results = await fmpGet<FmpQuote[]>("/quote", { symbol });
  return results[0];
}

export interface FmpDailyBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export async function getDailyHistory(symbol: string, from?: string): Promise<FmpDailyBar[]> {
  const bars = await fmpGet<FmpDailyBar[]>("/historical-price-eod/full", {
    symbol,
    ...(from ? { from } : {}),
  });
  // FMP returns most-recent-first; normalize to chronological ascending order.
  return [...bars].reverse();
}

export interface FmpIntradayBar {
  date: string; // "YYYY-MM-DD HH:mm:ss"
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type IntradayInterval = "5min" | "30min" | "1hour";

export async function getIntradayHistory(
  symbol: string,
  interval: IntradayInterval,
): Promise<FmpIntradayBar[]> {
  const data = await fmpGet<FmpIntradayBar[]>(`/historical-chart/${interval}`, { symbol });
  // FMP returns most-recent-first; normalize to chronological ascending order.
  return [...data].reverse();
}
