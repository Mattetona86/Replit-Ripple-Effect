/**
 * Raw FMP data types and fetch helpers for fundamental analysis.
 * All functions call the /stable/ endpoint family.
 */

import { logger } from "../logger";

const FMP_BASE_URL = "https://financialmodelingprep.com/stable";

function apiKey(): string {
  const key = process.env.FMP_API_KEY;
  if (!key) throw new Error("FMP_API_KEY must be set");
  return key;
}

async function fmpGet<T>(
  path: string,
  params: Record<string, string | number | undefined> = {},
): Promise<T> {
  const url = new URL(`${FMP_BASE_URL}${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) url.searchParams.set(k, String(v));
  }
  url.searchParams.set("apikey", apiKey());

  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    logger.error({ status: res.status, path, body }, "FMP fundamental request failed");
    throw new Error(`FMP ${path} failed with status ${res.status}`);
  }
  return (await res.json()) as T;
}

// ── Profile ──────────────────────────────────────────────────────────────────

export interface FmpProfile {
  symbol: string;
  companyName: string;
  exchangeShortName: string;
  price: number;
  mktCap: number | null;
  sector: string | null;
  industry: string | null;
  country: string | null;
  currency: string | null;
  image: string | null;
  ipoDate: string | null;
  isFund: boolean;
  isEtf: boolean;
  isActivelyTrading: boolean;
  website: string | null;
  description: string | null;
  fullTimeEmployees: string | null;
  fiscalYearEnd: string | null;
}

export async function getProfile(symbol: string): Promise<FmpProfile | null> {
  const arr = await fmpGet<FmpProfile[]>("/profile", { symbol });
  return arr[0] ?? null;
}

// ── Income Statement ──────────────────────────────────────────────────────────

export interface FmpIncomeStatement {
  date: string;
  period: string;
  calendarYear: string;
  revenue: number | null;
  grossProfit: number | null;
  operatingIncome: number | null;
  netIncome: number | null;
  ebitda: number | null;
  eps: number | null;
  epsDiluted: number | null;
  weightedAverageShsOutDil: number | null;
  researchAndDevelopmentExpenses: number | null;
  sellingGeneralAndAdministrativeExpenses: number | null;
  operatingExpenses: number | null;
  costOfRevenue: number | null;
  interestExpense: number | null;
  incomeTaxExpense: number | null;
  ebit: number | null;
}

export async function getIncomeStatements(
  symbol: string,
  period: "annual" | "quarter",
  limit = 8,
): Promise<FmpIncomeStatement[]> {
  return fmpGet<FmpIncomeStatement[]>("/income-statement", {
    symbol,
    period,
    limit,
  });
}

// ── Balance Sheet ─────────────────────────────────────────────────────────────

export interface FmpBalanceSheet {
  date: string;
  period: string;
  calendarYear: string;
  cashAndCashEquivalents: number | null;
  shortTermInvestments: number | null;
  totalCurrentAssets: number | null;
  totalAssets: number | null;
  totalCurrentLiabilities: number | null;
  totalLiabilities: number | null;
  totalEquity: number | null;
  totalDebt: number | null;
  netDebt: number | null;
  longTermDebt: number | null;
  shortTermDebt: number | null;
  goodwill: number | null;
  intangibleAssets: number | null;
  inventory: number | null;
  netReceivables: number | null;
  retainedEarnings: number | null;
  minorityInterest: number | null;
}

export async function getBalanceSheets(
  symbol: string,
  period: "annual" | "quarter",
  limit = 8,
): Promise<FmpBalanceSheet[]> {
  return fmpGet<FmpBalanceSheet[]>("/balance-sheet-statement", {
    symbol,
    period,
    limit,
  });
}

// ── Cash Flow ─────────────────────────────────────────────────────────────────

export interface FmpCashFlow {
  date: string;
  period: string;
  calendarYear: string;
  operatingCashFlow: number | null;
  capitalExpenditure: number | null;
  freeCashFlow: number | null;
  stockBasedCompensation: number | null;
  acquisitionsNet: number | null;
  dividendsPaid: number | null;
  commonStockRepurchased: number | null;
  debtRepayment: number | null;
  netChangeInCash: number | null;
  deprecationAndAmortization: number | null;
}

export async function getCashFlows(
  symbol: string,
  period: "annual" | "quarter",
  limit = 8,
): Promise<FmpCashFlow[]> {
  return fmpGet<FmpCashFlow[]>("/cash-flow-statement", {
    symbol,
    period,
    limit,
  });
}

// ── Key Metrics ───────────────────────────────────────────────────────────────

export interface FmpKeyMetrics {
  date: string;
  period: string;
  calendarYear: string;
  revenuePerShare: number | null;
  netIncomePerShare: number | null;
  operatingCashFlowPerShare: number | null;
  freeCashFlowPerShare: number | null;
  bookValuePerShare: number | null;
  tangibleBookValuePerShare: number | null;
  roic: number | null;
  returnOnTangibleAssets: number | null;
  earningsYield: number | null;
  freeCashFlowYield: number | null;
  debtToEquity: number | null;
  debtToAssets: number | null;
  netDebtToEBITDA: number | null;
  currentRatio: number | null;
  interestCoverage: number | null;
  peRatioTTM: number | null;
  priceToSalesRatioTTM: number | null;
  priceToBookRatioTTM: number | null;
  evToSalesTTM: number | null;
  enterpriseValueOverEBITDATTM: number | null;
  evToFreeCashFlowTTM: number | null;
  priceToFreeCashFlowsRatioTTM: number | null;
  pocfratio: number | null;
  dividendYield: number | null;
  buybackYield: number | null;
  shareholderYield: number | null;
  payoutRatio: number | null;
  // working capital metrics
  daysOfSalesOutstanding: number | null;
  daysOfInventoryOutstanding: number | null;
  daysPayablesOutstanding: number | null;
  receivablesTurnover: number | null;
  inventoryTurnover: number | null;
  assetTurnover: number | null;
  // share counts
  sharesOutstanding: number | null;
  enterpriseValue: number | null;
  marketCap: number | null;
  peRatio: number | null;
  priceToBookRatio: number | null;
  priceToSalesRatio: number | null;
  evToFreeCashFlow: number | null;
}

export async function getKeyMetrics(
  symbol: string,
  period: "annual" | "quarter" | "ttm",
  limit = 6,
): Promise<FmpKeyMetrics[]> {
  return fmpGet<FmpKeyMetrics[]>("/key-metrics", { symbol, period, limit });
}

// ── Financial Ratios ──────────────────────────────────────────────────────────

export interface FmpFinancialRatios {
  date: string;
  period: string;
  calendarYear: string;
  grossProfitMargin: number | null;
  operatingProfitMargin: number | null;
  netProfitMargin: number | null;
  returnOnAssets: number | null;
  returnOnEquity: number | null;
  returnOnCapitalEmployed: number | null;
  debtRatio: number | null;
  debtEquityRatio: number | null;
  currentRatio: number | null;
  quickRatio: number | null;
  priceEarningsRatio: number | null;
  priceToBookRatio: number | null;
  priceToSalesRatio: number | null;
  freeCashFlowPerShare: number | null;
  priceToFreeCashFlowsRatio: number | null;
  ebitPerRevenue: number | null;
  ebtPerEbit: number | null;
  priceCashFlowRatio: number | null;
  interestCoverage: number | null;
}

export async function getFinancialRatios(
  symbol: string,
  period: "annual" | "quarter" | "ttm",
  limit = 6,
): Promise<FmpFinancialRatios[]> {
  return fmpGet<FmpFinancialRatios[]>("/ratios", { symbol, period, limit });
}

// ── Peers ─────────────────────────────────────────────────────────────────────

export interface FmpPeerResult {
  symbol: string;
  peers: string[];
}

export async function getPeers(symbol: string): Promise<string[]> {
  const res = await fmpGet<FmpPeerResult[]>("/peers", { symbol }).catch(() => []);
  return res[0]?.peers ?? [];
}

// ── Analyst Estimates ─────────────────────────────────────────────────────────

export interface FmpAnalystEstimate {
  date: string;
  symbol: string;
  estimatedRevenueLow: number | null;
  estimatedRevenueHigh: number | null;
  estimatedRevenueAvg: number | null;
  estimatedEbitdaLow: number | null;
  estimatedEbitdaHigh: number | null;
  estimatedEbitdaAvg: number | null;
  estimatedEbitLow: number | null;
  estimatedEbitHigh: number | null;
  estimatedEbitAvg: number | null;
  estimatedNetIncomeLow: number | null;
  estimatedNetIncomeHigh: number | null;
  estimatedNetIncomeAvg: number | null;
  estimatedSgaExpenseLow: number | null;
  estimatedSgaExpenseHigh: number | null;
  estimatedSgaExpenseAvg: number | null;
  estimatedEpsLow: number | null;
  estimatedEpsHigh: number | null;
  estimatedEpsAvg: number | null;
  numberAnalystEstimatedRevenue: number | null;
  numberAnalystEstimatedEps: number | null;
}

export async function getAnalystEstimates(symbol: string, limit = 4): Promise<FmpAnalystEstimate[]> {
  return fmpGet<FmpAnalystEstimate[]>("/analyst-estimates", { symbol, period: "annual", limit }).catch(() => []);
}
