/**
 * Computes all fundamental metrics, scores, red flags, and strengths
 * from raw FMP data. The AI model never touches raw numbers — it only
 * receives the structured output of this module.
 */

import type {
  FmpProfile,
  FmpIncomeStatement,
  FmpBalanceSheet,
  FmpCashFlow,
  FmpKeyMetrics,
  FmpFinancialRatios,
  FmpAnalystEstimate,
} from "./fundamental-fmp-client";

// ── Shared metric types ───────────────────────────────────────────────────────

export type Trend = "improving" | "declining" | "stable" | null;
export type EarningsQuality = "high" | "adequate" | "weak" | "very_weak";
export type ScoreLabel =
  | "very_strong"
  | "strong"
  | "neutral"
  | "weak"
  | "very_weak";
export type ValuationQuadrant =
  | "quality_cheap"
  | "quality_expensive"
  | "weak_cheap"
  | "weak_expensive";

export interface GrowthMetric {
  value: number | null;
  peerMedian: number | null;
  peerPercentile: number | null;
  trend: Trend;
  isNm: boolean; // not meaningful (e.g. sign change)
}

// ── Section types ─────────────────────────────────────────────────────────────

export interface GrowthSection {
  revenueTtm: number | null;
  revenueYoy: GrowthMetric;
  revenue3yCagr: GrowthMetric;
  revenue5yCagr: GrowthMetric;
  revenueQoQ: GrowthMetric;
  revenueYoYLatestQ: GrowthMetric;
  epsDilutedTtm: number | null;
  epsYoy: GrowthMetric;
  eps3yCagr: GrowthMetric;
  operatingIncomeYoy: GrowthMetric;
  netIncomeYoy: GrowthMetric;
  ocfYoy: GrowthMetric;
  fcfYoy: GrowthMetric;
  fcf3yCagr: GrowthMetric;
}

export interface ProfitabilitySection {
  grossMarginTtm: number | null;
  grossMarginLastFy: number | null;
  grossMargin3yAvg: number | null;
  grossMarginTrend: Trend;
  grossMarginVsPeers: number | null;
  operatingMarginTtm: number | null;
  operatingMarginLastFy: number | null;
  operatingMargin3yAvg: number | null;
  operatingMarginTrend: Trend;
  operatingMarginVsPeers: number | null;
  ebitdaMarginTtm: number | null;
  netMarginTtm: number | null;
  netMarginLastFy: number | null;
  netMargin3yAvg: number | null;
  netMarginTrend: Trend;
  fcfMarginTtm: number | null;
  roa: number | null;
  roe: number | null;
  roic: number | null;
  roeWarning: string | null; // high ROE driven by leverage or negative equity
  peerGrossMarginMedian: number | null;
  peerOperatingMarginMedian: number | null;
  peerRoicMedian: number | null;
}

export interface CashFlowSection {
  ocfTtm: number | null;
  capexTtm: number | null;
  fcfTtm: number | null;
  fcfPerShareTtm: number | null;
  fcfMarginTtm: number | null;
  cashConversionRatio: number | null; // OCF / Net Income
  ocfToNetIncome: number | null;
  fcfToNetIncome: number | null;
  capexToRevenue: number | null;
  sbcTtm: number | null;
  sbcToRevenueTtm: number | null;
  earningsQuality: EarningsQuality;
  earningsQualitySignals: string[];
}

export interface FinancialStrengthSection {
  cash: number | null;
  totalDebt: number | null;
  netDebt: number | null;
  isNetCash: boolean;
  debtToEquity: number | null;
  debtToAssets: number | null;
  netDebtToEbitda: number | null;
  netDebtToEbitdaIsNm: boolean;
  currentRatio: number | null;
  quickRatio: number | null;
  interestCoverage: number | null;
  ocfToDebt: number | null;
  goodwillToAssets: number | null;
  intangibleToAssets: number | null;
}

export interface CapitalEfficiencySection {
  roic: number | null;
  assetTurnover: number | null;
  inventoryTurnover: number | null;
  receivablesTurnover: number | null;
  dso: number | null; // days sales outstanding
  dio: number | null; // days inventory outstanding
  dpo: number | null; // days payable outstanding
  cashConversionCycle: number | null;
}

export interface ValuationMultiple {
  value: number | null;
  peerMedian: number | null;
  peerPercentile: number | null;
  historicalMedian3y: number | null;
  historicalMedian5y: number | null;
  vsPeers: number | null; // % premium(+) or discount(-)
  vsHistory3y: number | null;
}

export interface ValuationSection {
  pe: ValuationMultiple;
  forwardPe: ValuationMultiple;
  ps: ValuationMultiple;
  pb: ValuationMultiple;
  pFcf: ValuationMultiple;
  evRevenue: ValuationMultiple;
  evEbitda: ValuationMultiple;
  evEbit: ValuationMultiple;
  dividendYield: number | null;
  buybackYield: number | null;
  sharesOutstanding: number | null;
  dilution1y: number | null;
  dilution3y: number | null;
  valuationMatrix: {
    qualityScore: number;
    valuationScore: number; // higher = cheaper
    quadrant: ValuationQuadrant;
    label: string;
    labelIt: string;
  };
}

export interface PeerCompanyData {
  symbol: string;
  name: string;
  marketCap: number | null;
  revenueGrowthYoy: number | null;
  grossMargin: number | null;
  operatingMargin: number | null;
  fcfMargin: number | null;
  roic: number | null;
  netDebtToEbitda: number | null;
  pe: number | null;
  evToEbitda: number | null;
  evToSales: number | null;
  priceToFcf: number | null;
}

export interface PeerComparisonSection {
  peers: PeerCompanyData[];
  peerGroupSize: number;
  excludedCount: number;
}

export interface HistoricalDataPoint {
  year: string;
  value: number | null;
}

export interface HistoricalSection {
  revenue: HistoricalDataPoint[];
  operatingIncome: HistoricalDataPoint[];
  netIncome: HistoricalDataPoint[];
  eps: HistoricalDataPoint[];
  ocf: HistoricalDataPoint[];
  fcf: HistoricalDataPoint[];
  grossMargin: HistoricalDataPoint[];
  operatingMargin: HistoricalDataPoint[];
  netMargin: HistoricalDataPoint[];
  netDebt: HistoricalDataPoint[];
  sharesOutstanding: HistoricalDataPoint[];
}

export interface DimensionScore {
  score: number;
  label: ScoreLabel;
  labelEn: string;
  labelIt: string;
  keyDrivers: string[];
}

export interface FundamentalScores {
  growth: DimensionScore;
  profitability: DimensionScore;
  cashFlow: DimensionScore;
  financialStrength: DimensionScore;
  capitalEfficiency: DimensionScore;
  valuation: DimensionScore;
  overall: number;
  overallLabel: ScoreLabel;
  overallLabelEn: string;
  overallLabelIt: string;
  confidenceLevel: "high" | "medium" | "low";
  coveragePct: number;
  metricsAvailable: number;
  metricsTotal: number;
}

export interface RedFlag {
  key: string;
  titleEn: string;
  titleIt: string;
  severity: "low" | "medium" | "high";
  dataPoint: string;
  explanationEn: string;
  explanationIt: string;
  period: string;
}

export interface FundamentalStrength {
  key: string;
  titleEn: string;
  titleIt: string;
  dataPoint: string;
  explanationEn: string;
  explanationIt: string;
}

export interface DataCoverage {
  coveragePct: number;
  confidenceLevel: "high" | "medium" | "low";
  metricsAvailable: number;
  metricsTotal: number;
  missingAreas: string[];
}

export interface FundamentalData {
  symbol: string;
  name: string;
  sector: string | null;
  industry: string | null;
  country: string | null;
  currency: string;
  exchange: string | null;
  logoUrl: string | null;
  lastPrice: number;
  marketCap: number | null;
  enterpriseValue: number | null;
  asOf: string;
  lastFilingDate: string | null;
  fiscalYearEnd: string | null;
  scores: FundamentalScores;
  growth: GrowthSection;
  profitability: ProfitabilitySection;
  cashFlow: CashFlowSection;
  financialStrength: FinancialStrengthSection;
  capitalEfficiency: CapitalEfficiencySection;
  valuation: ValuationSection;
  peers: PeerComparisonSection;
  redFlags: RedFlag[];
  strengths: FundamentalStrength[];
  historical: HistoricalSection;
  dataCoverage: DataCoverage;
}

// ── Raw data bundle ───────────────────────────────────────────────────────────

export interface FundamentalRawData {
  profile: FmpProfile;
  incomeAnnual: FmpIncomeStatement[];
  incomeQuarterly: FmpIncomeStatement[];
  balanceAnnual: FmpBalanceSheet[];
  balanceQuarterly: FmpBalanceSheet[];
  cashFlowAnnual: FmpCashFlow[];
  cashFlowQuarterly: FmpCashFlow[];
  keyMetricsAnnual: FmpKeyMetrics[];
  keyMetricsTtm: FmpKeyMetrics[];
  ratiosAnnual: FmpFinancialRatios[];
  ratiosTtm: FmpFinancialRatios[];
  estimates: FmpAnalystEstimate[];
  peerProfiles: FmpProfile[];
  peerKeyMetricsTtm: FmpKeyMetrics[][];
  peerIncomeAnnual: FmpIncomeStatement[][];
}

// ── Helper utilities ──────────────────────────────────────────────────────────

function safeDiv(num: number | null | undefined, den: number | null | undefined): number | null {
  if (num == null || den == null || den === 0) return null;
  return num / den;
}

function safePct(num: number | null | undefined, den: number | null | undefined): number | null {
  const v = safeDiv(num, den);
  return v == null ? null : v * 100;
}

function yoy(current: number | null | undefined, previous: number | null | undefined): {
  value: number | null;
  isNm: boolean;
} {
  if (current == null || previous == null) return { value: null, isNm: false };
  if (previous === 0) return { value: null, isNm: true };
  if ((previous < 0 && current > 0) || (previous > 0 && current < 0)) {
    return { value: null, isNm: true };
  }
  return { value: ((current - previous) / Math.abs(previous)) * 100, isNm: false };
}

function cagr(
  start: number | null | undefined,
  end: number | null | undefined,
  years: number,
): { value: number | null; isNm: boolean } {
  if (start == null || end == null || years <= 0) return { value: null, isNm: false };
  if (start <= 0 || end <= 0) return { value: null, isNm: true };
  return { value: (Math.pow(end / start, 1 / years) - 1) * 100, isNm: false };
}

function trend3(values: (number | null)[]): Trend {
  const valid = values.filter((v): v is number => v != null);
  if (valid.length < 2) return null;
  const first = valid[0];
  const last = valid[valid.length - 1];
  const diff = last - first;
  const threshold = Math.abs(first) * 0.05;
  if (diff > threshold) return "improving";
  if (diff < -threshold) return "declining";
  return "stable";
}

function median(arr: (number | null)[]): number | null {
  const valid = arr.filter((v): v is number => v != null).sort((a, b) => a - b);
  if (valid.length === 0) return null;
  const mid = Math.floor(valid.length / 2);
  return valid.length % 2 === 0 ? (valid[mid - 1] + valid[mid]) / 2 : valid[mid];
}

function percentileOf(value: number | null, arr: (number | null)[]): number | null {
  if (value == null) return null;
  const valid = arr.filter((v): v is number => v != null);
  if (valid.length === 0) return null;
  const below = valid.filter((v) => v < value).length;
  return Math.round((below / valid.length) * 100);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function round2(v: number | null | undefined): number | null {
  if (v == null || !isFinite(v)) return null;
  return Math.round(v * 100) / 100;
}

function labelScore(score: number): { label: ScoreLabel; en: string; it: string } {
  if (score >= 80) return { label: "very_strong", en: "Very strong", it: "Molto forte" };
  if (score >= 65) return { label: "strong", en: "Strong", it: "Forte" };
  if (score >= 50) return { label: "neutral", en: "Neutral", it: "Neutrale" };
  if (score >= 35) return { label: "weak", en: "Weak", it: "Debole" };
  return { label: "very_weak", en: "Very weak", it: "Molto debole" };
}

// Compute TTM by summing last 4 quarterly values
function ttmSum(
  quarters: { value: number | null }[],
  accessor: (q: { value: number | null }) => number | null = (q) => q.value,
): number | null {
  const last4 = quarters.slice(0, 4);
  if (last4.length < 4) return null;
  let total = 0;
  for (const q of last4) {
    const v = accessor(q);
    if (v == null) return null;
    total += v;
  }
  return total;
}

function incTtm(
  quarters: FmpIncomeStatement[],
  field: keyof FmpIncomeStatement,
): number | null {
  const vals = quarters.slice(0, 4).map((q) => q[field] as number | null);
  if (vals.length < 4) return null;
  let sum = 0;
  for (const v of vals) {
    if (v == null) return null;
    sum += v;
  }
  return sum;
}

function bsTtm(
  quarters: FmpBalanceSheet[],
  field: keyof FmpBalanceSheet,
): number | null {
  return (quarters[0]?.[field] as number | null) ?? null;
}

function cfTtm(
  quarters: FmpCashFlow[],
  field: keyof FmpCashFlow,
): number | null {
  const vals = quarters.slice(0, 4).map((q) => q[field] as number | null);
  if (vals.length < 4) return null;
  let sum = 0;
  for (const v of vals) {
    if (v == null) return null;
    sum += v;
  }
  return sum;
}

// ── Main calculator ───────────────────────────────────────────────────────────

export function computeFundamentals(raw: FundamentalRawData): FundamentalData {
  const { profile } = raw;
  const ia = raw.incomeAnnual;
  const iq = raw.incomeQuarterly;
  const ba = raw.balanceAnnual;
  const bq = raw.balanceQuarterly;
  const cfa = raw.cashFlowAnnual;
  const cfq = raw.cashFlowQuarterly;
  const kma = raw.keyMetricsAnnual;
  const kmt = raw.keyMetricsTtm;
  const ra = raw.ratiosAnnual;
  const rt = raw.ratiosTtm;
  const est = raw.estimates;

  // ── TTM base metrics ────────────────────────────────────────────────────────
  const kmTtm = kmt[0] ?? null;
  const rtTtm = rt[0] ?? null;

  const revenueTtm = incTtm(iq, "revenue");
  const grossProfitTtm = incTtm(iq, "grossProfit");
  const operatingIncomeTtm = incTtm(iq, "operatingIncome");
  const ebitTtm = incTtm(iq, "ebit");
  const ebitdaTtm = incTtm(iq, "ebitda");
  const netIncomeTtm = incTtm(iq, "netIncome");
  const interestExpenseTtm = incTtm(iq, "interestExpense");
  const epsDilutedTtm = incTtm(iq, "epsDiluted");

  const ocfTtm = cfTtm(cfq, "operatingCashFlow");
  const capexTtm = cfTtm(cfq, "capitalExpenditure");
  const sbcTtm = cfTtm(cfq, "stockBasedCompensation");
  const fcfTtm =
    ocfTtm != null && capexTtm != null ? ocfTtm + capexTtm : null; // capex is negative in FMP

  const cashLatest = bsTtm(bq, "cashAndCashEquivalents");
  const totalDebtLatest = bsTtm(bq, "totalDebt");
  const totalEquityLatest = bsTtm(bq, "totalEquity");
  const totalAssetsLatest = bsTtm(bq, "totalAssets");
  const goodwillLatest = bsTtm(bq, "goodwill");
  const intangiblesLatest = bsTtm(bq, "intangibleAssets");
  const currentAssetsLatest = bsTtm(bq, "totalCurrentAssets");
  const currentLiabilitiesLatest = bsTtm(bq, "totalCurrentLiabilities");
  const inventoryLatest = bsTtm(bq, "inventory");
  const receivablesLatest = bsTtm(bq, "netReceivables");
  const netDebtLatest = bsTtm(bq, "netDebt");

  // ── Enterprise Value ────────────────────────────────────────────────────────
  const marketCap = (profile.mktCap ?? kmTtm?.marketCap) || null;
  const enterpriseValue =
    kmTtm?.enterpriseValue ??
    (marketCap != null && netDebtLatest != null ? marketCap + netDebtLatest : null);

  // ── Prior year income & CF (for YoY) ────────────────────────────────────────
  const revenueLastFy = ia[0]?.revenue ?? null;
  const revenueYrMinus1 = ia[1]?.revenue ?? null;
  const revenueYrMinus2 = ia[2]?.revenue ?? null;
  const revenueYrMinus3 = ia[3]?.revenue ?? null;
  const revenueYrMinus4 = ia[4]?.revenue ?? null;

  const epsLastFy = ia[0]?.epsDiluted ?? null;
  const epsYrMinus1 = ia[1]?.epsDiluted ?? null;
  const epsYrMinus2 = ia[2]?.epsDiluted ?? null;

  const ocfLastFy = cfa[0]?.operatingCashFlow ?? null;
  const ocfYrMinus1 = cfa[1]?.operatingCashFlow ?? null;

  const fcfLastFy =
    cfa[0]?.freeCashFlow ??
    (cfa[0]?.operatingCashFlow != null && cfa[0]?.capitalExpenditure != null
      ? cfa[0].operatingCashFlow + cfa[0].capitalExpenditure
      : null);
  const fcfYrMinus1 =
    cfa[1]?.freeCashFlow ??
    (cfa[1]?.operatingCashFlow != null && cfa[1]?.capitalExpenditure != null
      ? cfa[1].operatingCashFlow + cfa[1].capitalExpenditure
      : null);
  const fcfYrMinus2 =
    cfa[2]?.freeCashFlow ??
    (cfa[2]?.operatingCashFlow != null && cfa[2]?.capitalExpenditure != null
      ? cfa[2].operatingCashFlow + cfa[2].capitalExpenditure
      : null);

  const opIncLastFy = ia[0]?.operatingIncome ?? null;
  const opIncYrMinus1 = ia[1]?.operatingIncome ?? null;
  const niLastFy = ia[0]?.netIncome ?? null;
  const niYrMinus1 = ia[1]?.netIncome ?? null;

  // ── Peer metrics extraction ───────────────────────────────────────────────
  function peerField(
    field: keyof FmpKeyMetrics,
    index: number,
  ): number | null {
    return (raw.peerKeyMetricsTtm[index]?.[0]?.[field] as number | null) ?? null;
  }
  function peerIncome(field: keyof FmpIncomeStatement, index: number): number | null {
    return (raw.peerIncomeAnnual[index]?.[0]?.[field] as number | null) ?? null;
  }
  function peerIncomePrev(field: keyof FmpIncomeStatement, index: number): number | null {
    return (raw.peerIncomeAnnual[index]?.[1]?.[field] as number | null) ?? null;
  }

  const peerCount = raw.peerProfiles.length;

  const peerRevGrowths: (number | null)[] = raw.peerProfiles.map((_, i) => {
    const cur = peerIncome("revenue", i);
    const prev = peerIncomePrev("revenue", i);
    return yoy(cur, prev).value;
  });
  const peerGrossMargins: (number | null)[] = raw.peerProfiles.map((_, i) => {
    const r = peerIncome("revenue", i);
    const g = peerIncome("grossProfit", i);
    return safePct(g, r);
  });
  const peerOpMargins: (number | null)[] = raw.peerProfiles.map((_, i) => {
    const r = peerIncome("revenue", i);
    const o = peerIncome("operatingIncome", i);
    return safePct(o, r);
  });
  const peerNetMargins: (number | null)[] = raw.peerProfiles.map((_, i) => {
    const r = peerIncome("revenue", i);
    const n = peerIncome("netIncome", i);
    return safePct(n, r);
  });
  const peerRoics: (number | null)[] = raw.peerProfiles.map((_, i) => {
    const v = peerField("roic", i);
    return v != null ? v * 100 : null;
  });
  const peerPes: (number | null)[] = raw.peerProfiles.map((_, i) => peerField("peRatioTTM", i));
  const peerEvEbitdas: (number | null)[] = raw.peerProfiles.map((_, i) =>
    peerField("enterpriseValueOverEBITDATTM", i),
  );
  const peerEvSales: (number | null)[] = raw.peerProfiles.map((_, i) =>
    peerField("evToSalesTTM", i),
  );
  const peerPFcfs: (number | null)[] = raw.peerProfiles.map((_, i) =>
    peerField("priceToFreeCashFlowsRatioTTM", i),
  );

  // ── Growth Section ────────────────────────────────────────────────────────
  const revYoy = yoy(revenueTtm ?? revenueLastFy, revenueYrMinus1);
  const revCagr3 = cagr(revenueYrMinus2, revenueTtm ?? revenueLastFy, 3);
  const revCagr5 = cagr(revenueYrMinus4, revenueTtm ?? revenueLastFy, 5);

  // Quarterly YoY: latest quarter vs same quarter last year
  const revQ0 = iq[0]?.revenue ?? null;
  const revQ4 = iq[4]?.revenue ?? null; // same quarter prior year
  const revQoQData = yoy(iq[0]?.revenue ?? null, iq[1]?.revenue ?? null);
  const revYoYQ = yoy(revQ0, revQ4);

  const epsYoyData = yoy(epsDilutedTtm ?? epsLastFy, epsYrMinus1);
  const epsCagr3 = cagr(epsYrMinus2, epsDilutedTtm ?? epsLastFy, 3);

  const opIncYoy = yoy(operatingIncomeTtm ?? opIncLastFy, opIncYrMinus1);
  const niYoy = yoy(netIncomeTtm ?? niLastFy, niYrMinus1);
  const ocfYoy_ = yoy(ocfTtm ?? ocfLastFy, ocfYrMinus1);
  const fcfYoy_ = yoy(fcfTtm ?? fcfLastFy, fcfYrMinus1);
  const fcfCagr3 = cagr(fcfYrMinus2, fcfTtm ?? fcfLastFy, 3);

  const peerRevGrowthMedian = median(peerRevGrowths);

  function mkGrowthMetric(
    v: { value: number | null; isNm: boolean },
    peerValues: (number | null)[],
    trendVals: (number | null)[] = [],
  ): GrowthMetric {
    return {
      value: round2(v.value),
      peerMedian: round2(median(peerValues)),
      peerPercentile: v.isNm ? null : percentileOf(v.value, peerValues),
      trend: trendVals.length >= 2 ? trend3(trendVals) : null,
      isNm: v.isNm,
    };
  }

  const growth: GrowthSection = {
    revenueTtm: round2(revenueTtm),
    revenueYoy: mkGrowthMetric(revYoy, peerRevGrowths),
    revenue3yCagr: mkGrowthMetric(revCagr3, peerRevGrowths),
    revenue5yCagr: mkGrowthMetric(revCagr5, peerRevGrowths),
    revenueQoQ: mkGrowthMetric(revQoQData, []),
    revenueYoYLatestQ: mkGrowthMetric(revYoYQ, []),
    epsDilutedTtm: round2(epsDilutedTtm),
    epsYoy: mkGrowthMetric(epsYoyData, []),
    eps3yCagr: mkGrowthMetric(epsCagr3, []),
    operatingIncomeYoy: mkGrowthMetric(opIncYoy, []),
    netIncomeYoy: mkGrowthMetric(niYoy, []),
    ocfYoy: mkGrowthMetric(ocfYoy_, []),
    fcfYoy: mkGrowthMetric(fcfYoy_, []),
    fcf3yCagr: mkGrowthMetric(fcfCagr3, []),
  };

  // ── Profitability Section ─────────────────────────────────────────────────
  const grossMarginTtm = safePct(grossProfitTtm, revenueTtm);
  const grossMarginFy = safePct(ia[0]?.grossProfit, ia[0]?.revenue);
  const grossMarginFy1 = safePct(ia[1]?.grossProfit, ia[1]?.revenue);
  const grossMarginFy2 = safePct(ia[2]?.grossProfit, ia[2]?.revenue);
  const grossMarginAvg3 = median([grossMarginFy, grossMarginFy1, grossMarginFy2]);

  const opMarginTtm = safePct(operatingIncomeTtm, revenueTtm);
  const opMarginFy = safePct(ia[0]?.operatingIncome, ia[0]?.revenue);
  const opMarginFy1 = safePct(ia[1]?.operatingIncome, ia[1]?.revenue);
  const opMarginFy2 = safePct(ia[2]?.operatingIncome, ia[2]?.revenue);
  const opMarginAvg3 = median([opMarginFy, opMarginFy1, opMarginFy2]);

  const ebitdaMarginTtm = safePct(ebitdaTtm, revenueTtm);
  const netMarginTtm = safePct(netIncomeTtm, revenueTtm);
  const netMarginFy = safePct(ia[0]?.netIncome, ia[0]?.revenue);
  const netMarginFy1 = safePct(ia[1]?.netIncome, ia[1]?.revenue);
  const netMarginFy2 = safePct(ia[2]?.netIncome, ia[2]?.revenue);
  const netMarginAvg3 = median([netMarginFy, netMarginFy1, netMarginFy2]);
  const fcfMarginTtm = safePct(fcfTtm, revenueTtm);

  const roa = (rtTtm?.returnOnAssets ?? ra[0]?.returnOnAssets ?? null);
  const roe = (rtTtm?.returnOnEquity ?? ra[0]?.returnOnEquity ?? null);
  const roic = kmTtm?.roic != null ? kmTtm.roic * 100 : (kma[0]?.roic != null ? kma[0].roic * 100 : null);

  // ROE warning
  let roeWarning: string | null = null;
  if (roe != null && Math.abs(roe) > 0.3) {
    if (totalEquityLatest != null && totalEquityLatest <= 0) {
      roeWarning = "negative_equity";
    } else if (
      totalDebtLatest != null &&
      totalEquityLatest != null &&
      totalEquityLatest > 0 &&
      totalDebtLatest / totalEquityLatest > 2
    ) {
      roeWarning = "high_leverage";
    }
  }

  const peerGrossMarginMedian = median(peerGrossMargins);
  const peerOpMarginMedian = median(peerOpMargins);
  const peerRoicMedian = median(peerRoics);

  const profitability: ProfitabilitySection = {
    grossMarginTtm: round2(grossMarginTtm),
    grossMarginLastFy: round2(grossMarginFy),
    grossMargin3yAvg: round2(grossMarginAvg3),
    grossMarginTrend: trend3([grossMarginFy2, grossMarginFy1, grossMarginFy, grossMarginTtm]),
    grossMarginVsPeers: round2(peerGrossMarginMedian != null && grossMarginTtm != null ? grossMarginTtm - peerGrossMarginMedian : null),
    operatingMarginTtm: round2(opMarginTtm),
    operatingMarginLastFy: round2(opMarginFy),
    operatingMargin3yAvg: round2(opMarginAvg3),
    operatingMarginTrend: trend3([opMarginFy2, opMarginFy1, opMarginFy, opMarginTtm]),
    operatingMarginVsPeers: round2(peerOpMarginMedian != null && opMarginTtm != null ? opMarginTtm - peerOpMarginMedian : null),
    ebitdaMarginTtm: round2(ebitdaMarginTtm),
    netMarginTtm: round2(netMarginTtm),
    netMarginLastFy: round2(netMarginFy),
    netMargin3yAvg: round2(netMarginAvg3),
    netMarginTrend: trend3([netMarginFy2, netMarginFy1, netMarginFy, netMarginTtm]),
    fcfMarginTtm: round2(fcfMarginTtm),
    roa: round2(roa != null ? roa * 100 : null),
    roe: round2(roe != null ? roe * 100 : null),
    roic: round2(roic),
    roeWarning,
    peerGrossMarginMedian: round2(peerGrossMarginMedian),
    peerOperatingMarginMedian: round2(peerOpMarginMedian),
    peerRoicMedian: round2(peerRoicMedian),
  };

  // ── Cash Flow & Earnings Quality ─────────────────────────────────────────
  const cashConversionRatio = safeDiv(ocfTtm, netIncomeTtm);
  const fcfToNetIncome = safeDiv(fcfTtm, netIncomeTtm);
  const capexToRevenue = safePct(capexTtm, revenueTtm);
  const sbcToRevenue = safePct(sbcTtm, revenueTtm);
  const fcfPerShare = kmTtm?.freeCashFlowPerShare ?? null;

  // Earnings quality signals
  const eqSignals: string[] = [];
  if (netIncomeTtm != null && ocfTtm != null && netIncomeTtm > 0 && ocfTtm < 0)
    eqSignals.push("positive_ni_negative_ocf");
  if (cashConversionRatio != null && cashConversionRatio < 0.7)
    eqSignals.push("low_cash_conversion");
  if (sbcToRevenue != null && sbcToRevenue > 10) eqSignals.push("high_sbc");
  if (fcfTtm != null && fcfTtm < 0) eqSignals.push("negative_fcf");
  // Check receivables growing faster than revenue
  const recGrowth = yoy(
    bsTtm(bq, "netReceivables"),
    bq[4] != null ? (bq[4].netReceivables ?? null) : null,
  );
  if (!recGrowth.isNm && revYoy.value != null && recGrowth.value != null && recGrowth.value > revYoy.value + 15)
    eqSignals.push("receivables_outpacing_revenue");

  let earningsQuality: EarningsQuality;
  if (eqSignals.length === 0) earningsQuality = "high";
  else if (eqSignals.length === 1) earningsQuality = "adequate";
  else if (eqSignals.length === 2) earningsQuality = "weak";
  else earningsQuality = "very_weak";

  const cashFlow: CashFlowSection = {
    ocfTtm: round2(ocfTtm),
    capexTtm: round2(capexTtm),
    fcfTtm: round2(fcfTtm),
    fcfPerShareTtm: round2(fcfPerShare),
    fcfMarginTtm: round2(fcfMarginTtm),
    cashConversionRatio: round2(cashConversionRatio),
    ocfToNetIncome: round2(cashConversionRatio),
    fcfToNetIncome: round2(fcfToNetIncome),
    capexToRevenue: round2(capexToRevenue),
    sbcTtm: round2(sbcTtm),
    sbcToRevenueTtm: round2(sbcToRevenue),
    earningsQuality,
    earningsQualitySignals: eqSignals,
  };

  // ── Financial Strength ────────────────────────────────────────────────────
  const isNetCash = netDebtLatest != null && netDebtLatest < 0;
  const debtToEquity = kmTtm?.debtToEquity ?? kma[0]?.debtToEquity ?? null;
  const debtToAssets = kmTtm?.debtToAssets ?? kma[0]?.debtToAssets ?? null;
  let ndToEbitda: number | null = null;
  let ndToEbitdaIsNm = false;
  if (netDebtLatest != null && ebitdaTtm != null) {
    if (ebitdaTtm <= 0 || isNetCash) ndToEbitdaIsNm = true;
    else ndToEbitda = round2(netDebtLatest / ebitdaTtm);
  }
  const currentRatio = kmTtm?.currentRatio ?? kma[0]?.currentRatio ?? null;
  const quickRatio = rtTtm?.quickRatio ?? ra[0]?.quickRatio ?? null;
  const interestCoverage = kmTtm?.interestCoverage ?? kma[0]?.interestCoverage ?? null;
  const ocfToDebt = safeDiv(ocfTtm, totalDebtLatest);
  const goodwillToAssets = safePct(goodwillLatest, totalAssetsLatest);
  const intangiblesToAssets = safePct(intangiblesLatest, totalAssetsLatest);

  const financialStrength: FinancialStrengthSection = {
    cash: round2(cashLatest),
    totalDebt: round2(totalDebtLatest),
    netDebt: round2(netDebtLatest),
    isNetCash,
    debtToEquity: round2(debtToEquity),
    debtToAssets: round2(debtToAssets),
    netDebtToEbitda: ndToEbitda,
    netDebtToEbitdaIsNm: ndToEbitdaIsNm,
    currentRatio: round2(currentRatio),
    quickRatio: round2(quickRatio),
    interestCoverage: round2(interestCoverage),
    ocfToDebt: round2(ocfToDebt),
    goodwillToAssets: round2(goodwillToAssets),
    intangibleToAssets: round2(intangiblesToAssets),
  };

  // ── Capital Efficiency ────────────────────────────────────────────────────
  const assetTurnover = kmTtm?.assetTurnover ?? kma[0]?.assetTurnover ?? null;
  const inventoryTurnover = kmTtm?.inventoryTurnover ?? kma[0]?.inventoryTurnover ?? null;
  const receivablesTurnover = kmTtm?.receivablesTurnover ?? kma[0]?.receivablesTurnover ?? null;
  const dso = kmTtm?.daysOfSalesOutstanding ?? kma[0]?.daysOfSalesOutstanding ?? null;
  const dio = kmTtm?.daysOfInventoryOutstanding ?? kma[0]?.daysOfInventoryOutstanding ?? null;
  const dpo = kmTtm?.daysPayablesOutstanding ?? kma[0]?.daysPayablesOutstanding ?? null;
  const ccc =
    dso != null && dio != null && dpo != null ? dso + dio - dpo : null;

  const capitalEfficiency: CapitalEfficiencySection = {
    roic: round2(roic),
    assetTurnover: round2(assetTurnover),
    inventoryTurnover: round2(inventoryTurnover),
    receivablesTurnover: round2(receivablesTurnover),
    dso: round2(dso),
    dio: round2(dio),
    dpo: round2(dpo),
    cashConversionCycle: round2(ccc),
  };

  // ── Valuation ─────────────────────────────────────────────────────────────
  function mkValuationMultiple(
    currentVal: number | null,
    peerVals: (number | null)[],
    historicalVals: (number | null)[],
  ): ValuationMultiple {
    const pm = median(peerVals);
    const h3 = median(historicalVals.slice(0, 3));
    const h5 = median(historicalVals.slice(0, 5));
    const vsPeers = currentVal != null && pm != null && pm !== 0
      ? round2(((currentVal / pm) - 1) * 100)
      : null;
    const vsHist3y = currentVal != null && h3 != null && h3 !== 0
      ? round2(((currentVal / h3) - 1) * 100)
      : null;
    return {
      value: round2(currentVal),
      peerMedian: round2(pm),
      peerPercentile: percentileOf(currentVal, peerVals),
      historicalMedian3y: round2(h3),
      historicalMedian5y: round2(h5),
      vsPeers,
      vsHistory3y: vsHist3y,
    };
  }

  const historicalPes = kma.map((k) => k.peRatio ?? k.peRatioTTM ?? null);
  const historicalPs = kma.map((k) => k.priceToSalesRatio ?? k.priceToSalesRatioTTM ?? null);
  const historicalPb = kma.map((k) => k.priceToBookRatio ?? k.priceToBookRatioTTM ?? null);
  const historicalPfcf = kma.map((k) => k.priceToFreeCashFlowsRatioTTM ?? k.evToFreeCashFlowTTM ?? null);
  const historicalEvEbitda = kma.map((k) => k.enterpriseValueOverEBITDATTM ?? null);
  const historicalEvSales = kma.map((k) => k.evToSalesTTM ?? null);

  const peVal = kmTtm?.peRatioTTM ?? kma[0]?.peRatioTTM ?? null;
  const psVal = kmTtm?.priceToSalesRatioTTM ?? kma[0]?.priceToSalesRatioTTM ?? null;
  const pbVal = kmTtm?.priceToBookRatioTTM ?? kma[0]?.priceToBookRatioTTM ?? null;
  const pfcfVal = kmTtm?.priceToFreeCashFlowsRatioTTM ?? kma[0]?.priceToFreeCashFlowsRatioTTM ?? null;
  const evEbitdaVal = kmTtm?.enterpriseValueOverEBITDATTM ?? kma[0]?.enterpriseValueOverEBITDATTM ?? null;
  const evSalesVal = kmTtm?.evToSalesTTM ?? kma[0]?.evToSalesTTM ?? null;
  const evEbitVal = ebitTtm != null && enterpriseValue != null && ebitTtm > 0 ? round2(enterpriseValue / ebitTtm) : null;
  const dividendYield = kmTtm?.dividendYield ?? kma[0]?.dividendYield ?? null;
  const buybackYield = kmTtm?.buybackYield ?? kma[0]?.buybackYield ?? null;

  // Shares dilution
  const sharesNow = ia[0]?.weightedAverageShsOutDil ?? null;
  const shares1yAgo = ia[1]?.weightedAverageShsOutDil ?? null;
  const shares3yAgo = ia[3]?.weightedAverageShsOutDil ?? null;
  const dilution1y = yoy(sharesNow, shares1yAgo);
  const dilution3y = cagr(shares3yAgo, sharesNow, 3);

  // Forward PE from analyst estimates
  const fwdEps = est.find((e) => new Date(e.date) > new Date())?.estimatedEpsAvg ?? null;
  const currentPrice = profile.price;
  const forwardPeVal =
    fwdEps != null && fwdEps > 0 && currentPrice > 0
      ? currentPrice / fwdEps
      : null;

  // Valuation matrix
  const qualityScore = clamp(
    ((profitability.roic ?? 0) > 0 ? 20 : 0) +
    ((profitability.operatingMarginTtm ?? 0) > 0 ? 20 : 0) +
    (growth.revenueYoy.value != null && growth.revenueYoy.value > 0 ? 20 : 0) +
    (!cashFlow.earningsQualitySignals.length ? 20 : 10) +
    (financialStrength.currentRatio != null && financialStrength.currentRatio > 1 ? 20 : 0),
    0,
    100,
  );
  // Higher valuationScore = cheaper (inverted)
  const pePctile = percentileOf(peVal, peerPes);
  const valuationScore = pePctile != null ? 100 - pePctile : 50;
  let quadrant: ValuationQuadrant;
  if (qualityScore >= 50 && valuationScore >= 50) quadrant = "quality_cheap";
  else if (qualityScore >= 50) quadrant = "quality_expensive";
  else if (valuationScore >= 50) quadrant = "weak_cheap";
  else quadrant = "weak_expensive";

  const quadrantLabels: Record<ValuationQuadrant, { en: string; it: string }> = {
    quality_cheap: { en: "Strong fundamentals at contained valuation", it: "Fondamentali forti a valutazione contenuta" },
    quality_expensive: { en: "Quality company with high expectations priced in", it: "Azienda di qualità con aspettative elevate" },
    weak_cheap: { en: "Possible value trap", it: "Possibile value trap" },
    weak_expensive: { en: "Unfavorable risk/reward profile", it: "Profilo rischio/rendimento sfavorevole" },
  };

  const valuation: ValuationSection = {
    pe: mkValuationMultiple(peVal, peerPes, historicalPes),
    forwardPe: mkValuationMultiple(forwardPeVal, peerPes, historicalPes),
    ps: mkValuationMultiple(psVal, peerEvSales, historicalPs),
    pb: mkValuationMultiple(pbVal, [], historicalPb),
    pFcf: mkValuationMultiple(pfcfVal, peerPFcfs, historicalPfcf),
    evRevenue: mkValuationMultiple(evSalesVal, peerEvSales, historicalEvSales),
    evEbitda: mkValuationMultiple(evEbitdaVal, peerEvEbitdas, historicalEvEbitda),
    evEbit: mkValuationMultiple(evEbitVal, [], []),
    dividendYield: round2(dividendYield != null ? dividendYield * 100 : null),
    buybackYield: round2(buybackYield != null ? buybackYield * 100 : null),
    sharesOutstanding: round2(sharesNow),
    dilution1y: round2(dilution1y.isNm ? null : dilution1y.value),
    dilution3y: round2(dilution3y.isNm ? null : dilution3y.value),
    valuationMatrix: {
      qualityScore,
      valuationScore,
      quadrant,
      label: quadrantLabels[quadrant].en,
      labelIt: quadrantLabels[quadrant].it,
    },
  };

  // ── Peer Comparison Table ────────────────────────────────────────────────
  const peers: PeerComparisonSection = {
    peers: raw.peerProfiles.map((p, i) => {
      const curRev = peerIncome("revenue", i);
      const prevRev = peerIncomePrev("revenue", i);
      const revGrowth = yoy(curRev, prevRev);
      const gp = peerIncome("grossProfit", i);
      const oi = peerIncome("operatingIncome", i);
      const ni = peerIncome("netIncome", i);
      return {
        symbol: p.symbol,
        name: p.companyName,
        marketCap: round2(p.mktCap),
        revenueGrowthYoy: round2(revGrowth.isNm ? null : revGrowth.value),
        grossMargin: round2(safePct(gp, curRev)),
        operatingMargin: round2(safePct(oi, curRev)),
        fcfMargin: null, // TTM FCF margin not readily available from this data
        roic: round2(peerField("roic", i) != null ? (peerField("roic", i) as number) * 100 : null),
        netDebtToEbitda: null,
        pe: round2(peerPes[i]),
        evToEbitda: round2(peerEvEbitdas[i]),
        evToSales: round2(peerEvSales[i]),
        priceToFcf: round2(peerPFcfs[i]),
      };
    }),
    peerGroupSize: peerCount,
    excludedCount: 0,
  };

  // ── Historical Section ────────────────────────────────────────────────────
  function buildHistory(
    annual: { date: string; value: number | null }[],
  ): HistoricalDataPoint[] {
    return annual
      .map((a) => ({ year: a.date.slice(0, 4), value: round2(a.value) }))
      .reverse(); // chronological
  }

  const historical: HistoricalSection = {
    revenue: buildHistory(ia.map((s) => ({ date: s.date, value: s.revenue }))),
    operatingIncome: buildHistory(ia.map((s) => ({ date: s.date, value: s.operatingIncome }))),
    netIncome: buildHistory(ia.map((s) => ({ date: s.date, value: s.netIncome }))),
    eps: buildHistory(ia.map((s) => ({ date: s.date, value: s.epsDiluted }))),
    ocf: buildHistory(cfa.map((s) => ({ date: s.date, value: s.operatingCashFlow }))),
    fcf: buildHistory(
      cfa.map((s) => ({
        date: s.date,
        value:
          s.freeCashFlow ??
          (s.operatingCashFlow != null && s.capitalExpenditure != null
            ? s.operatingCashFlow + s.capitalExpenditure
            : null),
      })),
    ),
    grossMargin: buildHistory(
      ia.map((s) => ({ date: s.date, value: safePct(s.grossProfit, s.revenue) })),
    ),
    operatingMargin: buildHistory(
      ia.map((s) => ({ date: s.date, value: safePct(s.operatingIncome, s.revenue) })),
    ),
    netMargin: buildHistory(
      ia.map((s) => ({ date: s.date, value: safePct(s.netIncome, s.revenue) })),
    ),
    netDebt: buildHistory(ba.map((s) => ({ date: s.date, value: s.netDebt }))),
    sharesOutstanding: buildHistory(
      ia.map((s) => ({ date: s.date, value: s.weightedAverageShsOutDil })),
    ),
  };

  // ── Red Flags ─────────────────────────────────────────────────────────────
  const redFlags: RedFlag[] = [];

  if (growth.revenueYoy.value != null && growth.revenueYoy.value < -5 && !growth.revenueYoy.isNm) {
    redFlags.push({
      key: "revenue_decline",
      titleEn: "Revenue decline",
      titleIt: "Ricavi in calo",
      severity: growth.revenueYoy.value < -15 ? "high" : "medium",
      dataPoint: `Revenue YoY: ${growth.revenueYoy.value.toFixed(1)}%`,
      explanationEn: "Revenue declined year-over-year, which may indicate competitive pressure, pricing issues, or demand slowdown.",
      explanationIt: "I ricavi sono diminuiti su base annua, possibile segnale di pressione competitiva o rallentamento della domanda.",
      period: ia[0]?.date?.slice(0, 10) ?? "TTM",
    });
  }

  if (profitability.operatingMarginTrend === "declining" && profitability.operatingMarginTtm != null) {
    redFlags.push({
      key: "margin_compression",
      titleEn: "Margin compression",
      titleIt: "Compressione dei margini",
      severity: "medium",
      dataPoint: `Operating margin TTM: ${profitability.operatingMarginTtm.toFixed(1)}%`,
      explanationEn: "Operating margins have been declining, which may reflect rising costs, pricing pressure, or structural changes.",
      explanationIt: "I margini operativi sono in contrazione. Potrebbe riflettere costi crescenti, pressione sui prezzi o cambiamenti strutturali.",
      period: "Trailing 3 years",
    });
  }

  if (cashFlow.earningsQuality === "weak" || cashFlow.earningsQuality === "very_weak") {
    redFlags.push({
      key: "low_earnings_quality",
      titleEn: "Low earnings quality",
      titleIt: "Bassa qualità degli utili",
      severity: cashFlow.earningsQuality === "very_weak" ? "high" : "medium",
      dataPoint: `Cash conversion: ${cashFlow.cashConversionRatio != null ? cashFlow.cashConversionRatio.toFixed(2) : "N/A"}`,
      explanationEn: "Net income is significantly higher than operating cash flow, raising questions about earnings sustainability.",
      explanationIt: "L'utile netto è significativamente superiore al cash flow operativo. Possibile bassa qualità degli utili.",
      period: "TTM",
    });
  }

  if (financialStrength.currentRatio != null && financialStrength.currentRatio < 1) {
    redFlags.push({
      key: "low_current_ratio",
      titleEn: "Weak short-term liquidity",
      titleIt: "Scarsa liquidità a breve termine",
      severity: financialStrength.currentRatio < 0.7 ? "high" : "medium",
      dataPoint: `Current ratio: ${financialStrength.currentRatio.toFixed(2)}`,
      explanationEn: "Current ratio below 1 indicates that current liabilities exceed current assets, raising short-term solvency concerns.",
      explanationIt: "Il current ratio sotto 1 indica che le passività correnti superano le attività correnti.",
      period: "Latest quarter",
    });
  }

  if (financialStrength.interestCoverage != null && financialStrength.interestCoverage < 2 && financialStrength.interestCoverage > 0) {
    redFlags.push({
      key: "weak_interest_coverage",
      titleEn: "Weak interest coverage",
      titleIt: "Copertura interessi debole",
      severity: financialStrength.interestCoverage < 1.5 ? "high" : "medium",
      dataPoint: `Interest coverage: ${financialStrength.interestCoverage.toFixed(1)}x`,
      explanationEn: "Low interest coverage means operating income barely covers interest payments, limiting financial flexibility.",
      explanationIt: "La bassa copertura degli interessi indica che il reddito operativo è insufficiente a coprire agevolmente gli oneri finanziari.",
      period: "TTM",
    });
  }

  if (cashFlow.sbcToRevenueTtm != null && cashFlow.sbcToRevenueTtm > 10) {
    redFlags.push({
      key: "high_sbc",
      titleEn: "High stock-based compensation",
      titleIt: "Stock-based compensation elevata",
      severity: cashFlow.sbcToRevenueTtm > 15 ? "high" : "medium",
      dataPoint: `SBC/Revenue: ${cashFlow.sbcToRevenueTtm.toFixed(1)}%`,
      explanationEn: "Stock-based compensation is high relative to revenue, diluting shareholder value and inflating non-GAAP earnings.",
      explanationIt: "La stock-based compensation è elevata rispetto ai ricavi e può ridurre il valore per gli azionisti.",
      period: "TTM",
    });
  }

  if (totalEquityLatest != null && totalEquityLatest < 0) {
    redFlags.push({
      key: "negative_equity",
      titleEn: "Negative shareholders' equity",
      titleIt: "Patrimonio netto negativo",
      severity: "high",
      dataPoint: `Total equity: ${totalEquityLatest.toLocaleString()}`,
      explanationEn: "Negative equity means liabilities exceed assets. This can indicate financial distress, high leverage, or large accumulated losses.",
      explanationIt: "Il patrimonio netto negativo significa che le passività superano le attività. Può indicare difficoltà finanziarie o leva elevata.",
      period: "Latest quarter",
    });
  }

  if (valuation.dilution1y != null && valuation.dilution1y > 3) {
    redFlags.push({
      key: "share_dilution",
      titleEn: "Significant share dilution",
      titleIt: "Forte diluizione azionaria",
      severity: valuation.dilution1y > 8 ? "high" : "medium",
      dataPoint: `Share count growth: +${valuation.dilution1y.toFixed(1)}% YoY`,
      explanationEn: "The share count is growing significantly, diluting existing shareholders' ownership.",
      explanationIt: "Il numero di azioni è in forte crescita, diluendo la quota degli azionisti esistenti.",
      period: "Last 12 months",
    });
  }

  if (cashFlow.fcfTtm != null && cashFlow.fcfTtm < 0) {
    redFlags.push({
      key: "negative_fcf",
      titleEn: "Negative free cash flow",
      titleIt: "Free cash flow negativo",
      severity: "medium",
      dataPoint: `FCF TTM: ${cashFlow.fcfTtm.toFixed(0)}`,
      explanationEn: "The company is consuming more cash than it generates. If persistent, this requires external financing.",
      explanationIt: "L'azienda consuma più cassa di quanta ne generi. Se persistente, richiede finanziamenti esterni.",
      period: "TTM",
    });
  }

  // ── Strengths ─────────────────────────────────────────────────────────────
  const strengths: FundamentalStrength[] = [];

  if (growth.revenueYoy.value != null && growth.revenueYoy.value > 10) {
    strengths.push({
      key: "strong_revenue_growth",
      titleEn: "Strong revenue growth",
      titleIt: "Forte crescita dei ricavi",
      dataPoint: `Revenue YoY: +${growth.revenueYoy.value.toFixed(1)}%`,
      explanationEn: "Revenue is growing at a healthy double-digit rate, indicating strong business momentum.",
      explanationIt: "I ricavi crescono a un ritmo a doppia cifra, segnale di forte dinamica commerciale.",
    });
  }

  if (profitability.operatingMarginTrend === "improving" && profitability.operatingMarginTtm != null && profitability.operatingMarginTtm > 0) {
    strengths.push({
      key: "margin_expansion",
      titleEn: "Expanding margins",
      titleIt: "Espansione dei margini",
      dataPoint: `Operating margin TTM: ${profitability.operatingMarginTtm.toFixed(1)}%`,
      explanationEn: "Operating margins are improving, suggesting increasing pricing power or operating leverage.",
      explanationIt: "I margini operativi sono in espansione. Possibile segnale di potere di prezzo o leva operativa crescente.",
    });
  }

  if (financialStrength.isNetCash && cashLatest != null) {
    strengths.push({
      key: "net_cash",
      titleEn: "Net cash position",
      titleIt: "Posizione netta di cassa",
      dataPoint: `Net debt: ${financialStrength.netDebt?.toFixed(0) ?? "N/A"}`,
      explanationEn: "The company holds more cash than debt, providing financial flexibility and resilience.",
      explanationIt: "L'azienda detiene più cassa che debiti, garantendo flessibilità e solidità finanziaria.",
    });
  }

  if (cashFlow.earningsQuality === "high" && cashFlow.cashConversionRatio != null && cashFlow.cashConversionRatio > 1) {
    strengths.push({
      key: "high_earnings_quality",
      titleEn: "High earnings quality",
      titleIt: "Alta qualità degli utili",
      dataPoint: `Cash conversion ratio: ${cashFlow.cashConversionRatio.toFixed(2)}`,
      explanationEn: "Operating cash flow exceeds net income, indicating high-quality, cash-backed earnings.",
      explanationIt: "Il cash flow operativo supera l'utile netto, indicando utili di alta qualità supportati dalla cassa.",
    });
  }

  if (profitability.roic != null && profitability.roic > 15) {
    strengths.push({
      key: "high_roic",
      titleEn: "High return on invested capital",
      titleIt: "ROIC elevato",
      dataPoint: `ROIC: ${profitability.roic.toFixed(1)}%`,
      explanationEn: "The company generates a strong return on its invested capital, suggesting a competitive advantage.",
      explanationIt: "L'azienda genera un alto rendimento sul capitale investito, possibile segnale di vantaggio competitivo.",
    });
  }

  if (cashFlow.fcfTtm != null && cashFlow.fcfTtm > 0 && revenueTtm != null && revenueTtm > 0) {
    const margin = (cashFlow.fcfTtm / revenueTtm) * 100;
    if (margin > 10) {
      strengths.push({
        key: "strong_fcf_generation",
        titleEn: "Strong free cash flow generation",
        titleIt: "Forte generazione di free cash flow",
        dataPoint: `FCF margin: ${margin.toFixed(1)}%`,
        explanationEn: "The company converts a healthy portion of its revenue into free cash flow.",
        explanationIt: "L'azienda converte una parte significativa dei ricavi in free cash flow.",
      });
    }
  }

  // ── Scoring Engine ────────────────────────────────────────────────────────
  function scoreGrowth(): number {
    let s = 50;
    if (growth.revenueYoy.value != null) {
      const v = growth.revenueYoy.value;
      if (v > 20) s += 20;
      else if (v > 10) s += 12;
      else if (v > 0) s += 4;
      else s -= 15;
    }
    if (growth.revenue3yCagr.value != null) {
      const v = growth.revenue3yCagr.value;
      if (v > 15) s += 15;
      else if (v > 5) s += 8;
      else if (v > 0) s += 2;
      else s -= 10;
    }
    if (growth.revenueYoy.peerPercentile != null) {
      s += (growth.revenueYoy.peerPercentile - 50) * 0.2;
    }
    return clamp(Math.round(s), 0, 100);
  }

  function scoreProfitability(): number {
    let s = 50;
    if (profitability.operatingMarginTtm != null) {
      const v = profitability.operatingMarginTtm;
      if (v > 20) s += 20;
      else if (v > 10) s += 10;
      else if (v > 0) s += 2;
      else s -= 15;
    }
    if (profitability.roic != null) {
      const v = profitability.roic;
      if (v > 20) s += 15;
      else if (v > 10) s += 8;
      else if (v > 0) s += 2;
      else s -= 10;
    }
    if (profitability.operatingMarginTrend === "improving") s += 8;
    if (profitability.operatingMarginTrend === "declining") s -= 8;
    if (profitability.operatingMarginVsPeers != null) {
      if (profitability.operatingMarginVsPeers > 5) s += 8;
      else if (profitability.operatingMarginVsPeers < -5) s -= 5;
    }
    return clamp(Math.round(s), 0, 100);
  }

  function scoreCashFlow(): number {
    let s = 50;
    if (cashFlow.cashConversionRatio != null) {
      if (cashFlow.cashConversionRatio > 1.1) s += 20;
      else if (cashFlow.cashConversionRatio > 0.8) s += 8;
      else if (cashFlow.cashConversionRatio < 0.5) s -= 20;
      else s -= 8;
    }
    if (cashFlow.fcfMarginTtm != null) {
      if (cashFlow.fcfMarginTtm > 15) s += 15;
      else if (cashFlow.fcfMarginTtm > 5) s += 7;
      else if (cashFlow.fcfMarginTtm < 0) s -= 15;
    }
    if (cashFlow.earningsQuality === "high") s += 10;
    else if (cashFlow.earningsQuality === "adequate") s += 3;
    else if (cashFlow.earningsQuality === "weak") s -= 8;
    else if (cashFlow.earningsQuality === "very_weak") s -= 15;
    return clamp(Math.round(s), 0, 100);
  }

  function scoreFinancialStrength(): number {
    let s = 50;
    if (financialStrength.isNetCash) s += 20;
    else if (financialStrength.netDebtToEbitda != null && !financialStrength.netDebtToEbitdaIsNm) {
      const v = financialStrength.netDebtToEbitda;
      if (v < 1) s += 12;
      else if (v < 2.5) s += 5;
      else if (v < 4) s -= 5;
      else s -= 15;
    }
    if (financialStrength.currentRatio != null) {
      if (financialStrength.currentRatio > 2) s += 10;
      else if (financialStrength.currentRatio > 1.5) s += 5;
      else if (financialStrength.currentRatio < 1) s -= 15;
    }
    if (financialStrength.interestCoverage != null) {
      if (financialStrength.interestCoverage > 5) s += 10;
      else if (financialStrength.interestCoverage < 2) s -= 15;
    }
    if (totalEquityLatest != null && totalEquityLatest < 0) s -= 20;
    return clamp(Math.round(s), 0, 100);
  }

  function scoreCapitalEfficiency(): number {
    let s = 50;
    if (capitalEfficiency.roic != null) {
      if (capitalEfficiency.roic > 20) s += 25;
      else if (capitalEfficiency.roic > 10) s += 12;
      else if (capitalEfficiency.roic > 5) s += 5;
      else s -= 10;
    }
    if (peerRoicMedian != null && capitalEfficiency.roic != null) {
      if (capitalEfficiency.roic > peerRoicMedian + 5) s += 10;
      else if (capitalEfficiency.roic < peerRoicMedian - 5) s -= 8;
    }
    return clamp(Math.round(s), 0, 100);
  }

  function scoreValuation(): number {
    // Cheaper relative to peers = higher score (not a recommendation, just relative positioning)
    let s = 50;
    if (valuation.pe.vsPeers != null) {
      if (valuation.pe.vsPeers < -20) s += 20;
      else if (valuation.pe.vsPeers < -5) s += 10;
      else if (valuation.pe.vsPeers > 20) s -= 15;
      else if (valuation.pe.vsPeers > 5) s -= 8;
    } else if (valuation.evEbitda.vsPeers != null) {
      if (valuation.evEbitda.vsPeers < -20) s += 15;
      else if (valuation.evEbitda.vsPeers > 20) s -= 10;
    }
    return clamp(Math.round(s), 0, 100);
  }

  // Count available metrics
  const checkMetrics = [
    revenueTtm, grossProfitTtm, operatingIncomeTtm, netIncomeTtm,
    ocfTtm, fcfTtm, cashLatest, totalDebtLatest, roic,
    peVal, evEbitdaVal, currentRatio,
  ];
  const available = checkMetrics.filter((v) => v != null).length;
  const total = checkMetrics.length;
  const coveragePct = Math.round((available / total) * 100);

  const gScore = scoreGrowth();
  const pScore = scoreProfitability();
  const cfScore = scoreCashFlow();
  const fsScore = scoreFinancialStrength();
  const ceScore = scoreCapitalEfficiency();
  const vScore = scoreValuation();

  const overallScore = Math.round(
    gScore * 0.2 + pScore * 0.2 + cfScore * 0.2 + fsScore * 0.15 + ceScore * 0.1 + vScore * 0.15,
  );

  const gLabel = labelScore(gScore);
  const pLabel = labelScore(pScore);
  const cfLabel = labelScore(cfScore);
  const fsLabel = labelScore(fsScore);
  const ceLabel = labelScore(ceScore);
  const vLabel = labelScore(vScore);
  const overallLabel = labelScore(overallScore);

  const scores: FundamentalScores = {
    growth: { score: gScore, label: gLabel.label, labelEn: gLabel.en, labelIt: gLabel.it, keyDrivers: buildGrowthDrivers(growth) },
    profitability: { score: pScore, label: pLabel.label, labelEn: pLabel.en, labelIt: pLabel.it, keyDrivers: buildProfitDrivers(profitability) },
    cashFlow: { score: cfScore, label: cfLabel.label, labelEn: cfLabel.en, labelIt: cfLabel.it, keyDrivers: buildCfDrivers(cashFlow) },
    financialStrength: { score: fsScore, label: fsLabel.label, labelEn: fsLabel.en, labelIt: fsLabel.it, keyDrivers: buildFsDrivers(financialStrength) },
    capitalEfficiency: { score: ceScore, label: ceLabel.label, labelEn: ceLabel.en, labelIt: ceLabel.it, keyDrivers: buildCeDrivers(capitalEfficiency) },
    valuation: { score: vScore, label: vLabel.label, labelEn: vLabel.en, labelIt: vLabel.it, keyDrivers: buildValDrivers(valuation) },
    overall: overallScore,
    overallLabel: overallLabel.label,
    overallLabelEn: overallLabel.en,
    overallLabelIt: overallLabel.it,
    confidenceLevel: coveragePct >= 85 ? "high" : coveragePct >= 65 ? "medium" : "low",
    coveragePct,
    metricsAvailable: available,
    metricsTotal: total,
  };

  const dataCoverage: DataCoverage = {
    coveragePct,
    confidenceLevel: scores.confidenceLevel,
    metricsAvailable: available,
    metricsTotal: total,
    missingAreas: [
      ...(revenueTtm == null ? ["revenue TTM"] : []),
      ...(roic == null ? ["ROIC"] : []),
      ...(peVal == null ? ["P/E ratio"] : []),
      ...(ocfTtm == null ? ["operating cash flow TTM"] : []),
    ],
  };

  return {
    symbol: profile.symbol,
    name: profile.companyName,
    sector: profile.sector ?? null,
    industry: profile.industry ?? null,
    country: profile.country ?? null,
    currency: profile.currency ?? "USD",
    exchange: profile.exchangeShortName ?? null,
    logoUrl: profile.image ?? null,
    lastPrice: currentPrice,
    marketCap: round2(marketCap),
    enterpriseValue: round2(enterpriseValue),
    asOf: new Date().toISOString(),
    lastFilingDate: ia[0]?.date ?? null,
    fiscalYearEnd: profile.fiscalYearEnd ?? null,
    scores,
    growth,
    profitability,
    cashFlow,
    financialStrength,
    capitalEfficiency,
    valuation,
    peers,
    redFlags,
    strengths,
    historical,
    dataCoverage,
  };
}

// ── Score key driver helpers ──────────────────────────────────────────────────

function buildGrowthDrivers(g: GrowthSection): string[] {
  const d: string[] = [];
  if (g.revenueYoy.value != null)
    d.push(`Revenue YoY ${g.revenueYoy.value > 0 ? "+" : ""}${g.revenueYoy.value.toFixed(1)}%`);
  if (g.revenue3yCagr.value != null && !g.revenue3yCagr.isNm)
    d.push(`3-yr CAGR ${g.revenue3yCagr.value > 0 ? "+" : ""}${g.revenue3yCagr.value.toFixed(1)}%`);
  return d.slice(0, 3);
}

function buildProfitDrivers(p: ProfitabilitySection): string[] {
  const d: string[] = [];
  if (p.operatingMarginTtm != null) d.push(`Op. margin ${p.operatingMarginTtm.toFixed(1)}%`);
  if (p.roic != null) d.push(`ROIC ${p.roic.toFixed(1)}%`);
  if (p.operatingMarginTrend) d.push(`Margin trend: ${p.operatingMarginTrend}`);
  return d.slice(0, 3);
}

function buildCfDrivers(cf: CashFlowSection): string[] {
  const d: string[] = [];
  if (cf.cashConversionRatio != null) d.push(`Cash conversion ${cf.cashConversionRatio.toFixed(2)}x`);
  if (cf.fcfMarginTtm != null) d.push(`FCF margin ${cf.fcfMarginTtm.toFixed(1)}%`);
  d.push(`Earnings quality: ${cf.earningsQuality}`);
  return d.slice(0, 3);
}

function buildFsDrivers(fs: FinancialStrengthSection): string[] {
  const d: string[] = [];
  if (fs.isNetCash) d.push("Net cash position");
  else if (fs.netDebtToEbitda != null && !fs.netDebtToEbitdaIsNm)
    d.push(`ND/EBITDA ${fs.netDebtToEbitda.toFixed(1)}x`);
  if (fs.currentRatio != null) d.push(`Current ratio ${fs.currentRatio.toFixed(2)}`);
  if (fs.interestCoverage != null) d.push(`Interest coverage ${fs.interestCoverage.toFixed(1)}x`);
  return d.slice(0, 3);
}

function buildCeDrivers(ce: CapitalEfficiencySection): string[] {
  const d: string[] = [];
  if (ce.roic != null) d.push(`ROIC ${ce.roic.toFixed(1)}%`);
  if (ce.assetTurnover != null) d.push(`Asset turnover ${ce.assetTurnover.toFixed(2)}x`);
  if (ce.cashConversionCycle != null) d.push(`CCC ${ce.cashConversionCycle.toFixed(0)} days`);
  return d.slice(0, 3);
}

function buildValDrivers(v: ValuationSection): string[] {
  const d: string[] = [];
  if (v.pe.value != null) d.push(`P/E ${v.pe.value.toFixed(1)}x`);
  if (v.evEbitda.value != null) d.push(`EV/EBITDA ${v.evEbitda.value.toFixed(1)}x`);
  if (v.pe.vsPeers != null) d.push(`P/E vs peers: ${v.pe.vsPeers > 0 ? "+" : ""}${v.pe.vsPeers.toFixed(0)}%`);
  return d.slice(0, 3);
}
