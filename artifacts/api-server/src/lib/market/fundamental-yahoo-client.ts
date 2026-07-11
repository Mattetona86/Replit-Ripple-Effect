/**
 * Fetches all fundamental data for a symbol via yahoo-finance2 in a single
 * quoteSummary call, then adapts it into the FMP-compatible shapes expected
 * by fundamental-calculator.ts.
 *
 * Replaces the 12 parallel FMP calls with one round-trip (~1-2 s).
 */

import YahooFinance from "yahoo-finance2";
const yahooFinance = new YahooFinance();
import { logger } from "../logger";
import type {
  FmpProfile,
  FmpIncomeStatement,
  FmpBalanceSheet,
  FmpCashFlow,
  FmpKeyMetrics,
  FmpFinancialRatios,
  FmpAnalystEstimate,
} from "./fundamental-fmp-client";
import type { FundamentalRawData } from "./fundamental-calculator";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Format a Date (or string) as YYYY-MM-DD */
function fmtDate(d: Date | string | undefined | null): string {
  if (!d) return new Date().toISOString().slice(0, 10);
  if (typeof d === "string") return d.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

/** Safely divide; returns null if either arg is null/0-denominator */
function div(a: number | null | undefined, b: number | null | undefined): number | null {
  if (a == null || b == null || b === 0) return null;
  return a / b;
}

// ── Income statement adapter ──────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapIncome(stmt: any, period: "annual" | "quarter"): FmpIncomeStatement {
  const date = fmtDate(stmt.endDate);
  return {
    date,
    period,
    calendarYear: date.slice(0, 4),
    revenue: stmt.totalRevenue ?? null,
    grossProfit: stmt.grossProfit ?? null,
    operatingIncome: stmt.operatingIncome ?? null,
    netIncome: stmt.netIncome ?? stmt.netIncomeApplicableToCommonShares ?? null,
    ebitda: null, // filled in below from cash-flow D&A
    eps: null,
    epsDiluted: null,
    weightedAverageShsOutDil: null,
    researchAndDevelopmentExpenses: stmt.researchDevelopment ?? null,
    sellingGeneralAndAdministrativeExpenses: stmt.sellingGeneralAdministrative ?? null,
    operatingExpenses: stmt.totalOperatingExpenses ?? null,
    costOfRevenue: stmt.costOfRevenue ?? null,
    interestExpense: stmt.interestExpense ?? null,
    incomeTaxExpense: stmt.incomeTaxExpense ?? null,
    ebit: stmt.ebit ?? stmt.operatingIncome ?? null,
  };
}

// ── Balance sheet adapter ─────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapBalance(stmt: any, period: "annual" | "quarter"): FmpBalanceSheet {
  const date = fmtDate(stmt.endDate);
  const cash = stmt.cash ?? null;
  const shortTermDebt = stmt.shortLongTermDebt ?? null;
  const longTermDebt = stmt.longTermDebt ?? null;
  const totalDebt =
    shortTermDebt != null || longTermDebt != null
      ? (shortTermDebt ?? 0) + (longTermDebt ?? 0)
      : null;
  const netDebt = totalDebt != null && cash != null ? totalDebt - cash : null;

  return {
    date,
    period,
    calendarYear: date.slice(0, 4),
    cashAndCashEquivalents: cash,
    shortTermInvestments: stmt.shortTermInvestments ?? null,
    totalCurrentAssets: stmt.totalCurrentAssets ?? null,
    totalAssets: stmt.totalAssets ?? null,
    totalCurrentLiabilities: stmt.totalCurrentLiabilities ?? null,
    totalLiabilities: stmt.totalLiab ?? null,
    totalEquity: stmt.totalStockholderEquity ?? null,
    totalDebt,
    netDebt,
    longTermDebt,
    shortTermDebt,
    goodwill: stmt.goodwill ?? null,
    intangibleAssets: stmt.intangibleAssets ?? null,
    inventory: stmt.inventory ?? null,
    netReceivables: stmt.netReceivables ?? null,
    retainedEarnings: stmt.retainedEarnings ?? null,
    minorityInterest: null,
  };
}

// ── Cash flow adapter ─────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapCashFlow(stmt: any, period: "annual" | "quarter"): FmpCashFlow {
  const date = fmtDate(stmt.endDate);
  const ocf: number | null = stmt.totalCashFromOperatingActivities ?? null;
  // Yahoo reports capex as a negative number
  const capex: number | null = stmt.capitalExpenditures ?? null;
  const fcf = ocf != null && capex != null ? ocf + capex : ocf;

  return {
    date,
    period,
    calendarYear: date.slice(0, 4),
    operatingCashFlow: ocf,
    capitalExpenditure: capex,
    freeCashFlow: fcf,
    stockBasedCompensation: stmt.stockBasedCompensation ?? null,
    acquisitionsNet: null,
    dividendsPaid: stmt.dividendsPaid ?? null,
    commonStockRepurchased: stmt.repurchaseOfStock ?? null,
    debtRepayment: stmt.netBorrowings ?? null,
    netChangeInCash: stmt.changeInCash ?? null,
    deprecationAndAmortization: stmt.depreciation ?? null,
  };
}

// ── Back-fill EBITDA in income statements using D&A from cash flows ───────────

function fillEbitda(incomes: FmpIncomeStatement[], cashFlows: FmpCashFlow[]): void {
  const daByYear: Record<string, number> = {};
  for (const cf of cashFlows) {
    if (cf.deprecationAndAmortization != null) {
      daByYear[cf.date.slice(0, 4)] = Math.abs(cf.deprecationAndAmortization);
    }
  }
  for (const inc of incomes) {
    const ebit = inc.ebit;
    const da = daByYear[inc.date.slice(0, 4)];
    if (ebit != null && da != null) {
      inc.ebitda = ebit + da;
    }
  }
}

// ── Compute annual key-metrics from statements ────────────────────────────────

function buildAnnualKeyMetrics(
  incomes: FmpIncomeStatement[],
  balances: FmpBalanceSheet[],
  cashFlows: FmpCashFlow[],
): FmpKeyMetrics[] {
  return incomes.map((inc, i) => {
    const bal = balances[i];
    const cf = cashFlows[i];
    const rev = inc.revenue;
    const ni = inc.netIncome;
    const ebit = inc.ebit;
    const intExp = inc.interestExpense;
    const assets = bal?.totalAssets;
    const equity = bal?.totalEquity;
    const debt = bal?.totalDebt;
    const curAssets = bal?.totalCurrentAssets;
    const curLiab = bal?.totalCurrentLiabilities;
    const inv = bal?.inventory;
    const rec = bal?.netReceivables;
    const fcf = cf?.freeCashFlow;

    // ROIC ≈ NOPAT / (Equity + Debt); NOPAT = EBIT × (1 − 21 % est. tax)
    const investedCapital =
      equity != null && debt != null ? equity + debt : null;
    const nopat = ebit != null ? ebit * 0.79 : null;
    const roic = div(nopat, investedCapital);

    return {
      date: inc.date,
      period: "annual",
      calendarYear: inc.calendarYear,
      revenuePerShare: null,
      netIncomePerShare: null,
      operatingCashFlowPerShare: null,
      freeCashFlowPerShare: null,
      bookValuePerShare: null,
      tangibleBookValuePerShare: null,
      roic,
      returnOnTangibleAssets: null,
      earningsYield: null,
      freeCashFlowYield: null,
      debtToEquity: div(debt, equity),
      debtToAssets: div(debt, assets),
      netDebtToEBITDA: null,
      currentRatio: div(curAssets, curLiab),
      interestCoverage:
        ebit != null && intExp != null && intExp < 0
          ? div(ebit, Math.abs(intExp))
          : null,
      peRatioTTM: null,
      priceToSalesRatioTTM: null,
      priceToBookRatioTTM: null,
      evToSalesTTM: null,
      enterpriseValueOverEBITDATTM: null,
      evToFreeCashFlowTTM: null,
      priceToFreeCashFlowsRatioTTM: null,
      pocfratio: null,
      dividendYield: null,
      buybackYield: null,
      shareholderYield: null,
      payoutRatio: null,
      daysOfSalesOutstanding: rev ? div(rec, rev / 365) : null,
      daysOfInventoryOutstanding: rev ? div(inv, rev / 365) : null,
      daysPayablesOutstanding: null,
      receivablesTurnover: div(rev, rec),
      inventoryTurnover: div(rev, inv),
      assetTurnover: div(rev, assets),
      sharesOutstanding: null,
      enterpriseValue: null,
      marketCap: null,
      peRatio: null,
      priceToBookRatio: null,
      priceToSalesRatio: null,
      evToFreeCashFlow: div(null, fcf),
    };
  });
}

// ── Compute annual ratios from statements ─────────────────────────────────────

function buildAnnualRatios(
  incomes: FmpIncomeStatement[],
  balances: FmpBalanceSheet[],
): FmpFinancialRatios[] {
  return incomes.map((inc, i) => {
    const bal = balances[i];
    const rev = inc.revenue;
    const gp = inc.grossProfit;
    const oi = inc.operatingIncome;
    const ni = inc.netIncome;
    const assets = bal?.totalAssets;
    const equity = bal?.totalEquity;
    const debt = bal?.totalDebt;
    const curAssets = bal?.totalCurrentAssets;
    const curLiab = bal?.totalCurrentLiabilities;
    const inv = bal?.inventory;

    return {
      date: inc.date,
      period: "annual",
      calendarYear: inc.calendarYear,
      grossProfitMargin: div(gp, rev),
      operatingProfitMargin: div(oi, rev),
      netProfitMargin: div(ni, rev),
      returnOnAssets: div(ni, assets),
      returnOnEquity: div(ni, equity),
      returnOnCapitalEmployed: null,
      debtRatio: div(debt, assets),
      debtEquityRatio: div(debt, equity),
      currentRatio: div(curAssets, curLiab),
      quickRatio:
        curAssets != null && curLiab != null
          ? div(curAssets - (inv ?? 0), curLiab)
          : null,
      priceEarningsRatio: null,
      priceToBookRatio: null,
      priceToSalesRatio: null,
      freeCashFlowPerShare: null,
      priceToFreeCashFlowsRatio: null,
      ebitPerRevenue: div(inc.ebit, rev),
      ebtPerEbit: null,
      priceCashFlowRatio: null,
      interestCoverage: null,
    };
  });
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function fetchYahooFundamentalData(
  symbol: string,
): Promise<FundamentalRawData | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let qs: any;
  try {
    qs = await yahooFinance.quoteSummary(symbol, {
      modules: [
        "price",
        "summaryProfile",
        "defaultKeyStatistics",
        "financialData",
        "incomeStatementHistory",
        "incomeStatementHistoryQuarterly",
        "balanceSheetHistory",
        "balanceSheetHistoryQuarterly",
        "cashflowStatementHistory",
        "cashflowStatementHistoryQuarterly",
        "earningsTrend",
        "summaryDetail",
      ],
    } as Parameters<typeof yahooFinance.quoteSummary>[1]);
  } catch (err) {
    logger.error({ symbol, err }, "Yahoo Finance quoteSummary failed");
    return null;
  }

  const {
    price,
    summaryProfile,
    defaultKeyStatistics,
    financialData,
    incomeStatementHistory,
    incomeStatementHistoryQuarterly,
    balanceSheetHistory,
    balanceSheetHistoryQuarterly,
    cashflowStatementHistory,
    cashflowStatementHistoryQuarterly,
    earningsTrend,
    summaryDetail,
  } = qs as Record<string, any>;

  if (!price) {
    logger.warn({ symbol }, "Yahoo Finance: no price data");
    return null;
  }

  // ── Profile ─────────────────────────────────────────────────────────────────
  const profile: FmpProfile = {
    symbol: price.symbol ?? symbol,
    companyName: (price.longName ?? price.shortName ?? symbol) as string,
    exchangeShortName: price.exchangeName ?? null,
    price: price.regularMarketPrice ?? 0,
    mktCap: price.marketCap ?? null,
    sector: summaryProfile?.sector ?? null,
    industry: summaryProfile?.industry ?? null,
    country: summaryProfile?.country ?? null,
    currency: price.currency ?? "USD",
    image: null,
    ipoDate: null,
    isFund: false,
    isEtf: false,
    isActivelyTrading: true,
    website: (summaryProfile as any)?.website ?? null,
    description: summaryProfile?.longBusinessSummary ?? null,
    fullTimeEmployees:
      summaryProfile?.fullTimeEmployees != null
        ? String(summaryProfile.fullTimeEmployees)
        : null,
    fiscalYearEnd: null,
  };

  // ── Financial statements ─────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const annualIncome = ((incomeStatementHistory?.incomeStatementHistory ?? []) as any[]).map((s) => mapIncome(s, "annual"));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const quarterlyIncome = ((incomeStatementHistoryQuarterly?.incomeStatementHistoryQuarterly ?? []) as any[]).map((s) => mapIncome(s, "quarter"));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const annualBalance = ((balanceSheetHistory?.balanceSheetStatements ?? []) as any[]).map((s) => mapBalance(s, "annual"));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const quarterlyBalance = ((balanceSheetHistoryQuarterly?.balanceSheetStatements ?? []) as any[]).map((s) => mapBalance(s, "quarter"));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const annualCashFlow = ((cashflowStatementHistory?.cashflowStatements ?? []) as any[]).map((s) => mapCashFlow(s, "annual"));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const quarterlyCashFlow = ((cashflowStatementHistoryQuarterly?.cashflowStatements ?? []) as any[]).map((s) => mapCashFlow(s, "quarter"));

  // Back-fill EBITDA
  fillEbitda(annualIncome, annualCashFlow);
  fillEbitda(quarterlyIncome, quarterlyCashFlow);

  // ── TTM key metrics (from Yahoo's pre-computed financialData + stats) ────────
  const today = new Date().toISOString().slice(0, 10);
  const mcap = price.marketCap ?? null;
  const ev = (defaultKeyStatistics?.enterpriseValue as number | null | undefined) ?? null;
  const fcfTtm = financialData?.freeCashflow ?? null;
  const shares = (defaultKeyStatistics?.sharesOutstanding as number | null | undefined) ?? null;
  const totalRevTtm = financialData?.totalRevenue ?? null;
  const totalDebtTtm = financialData?.totalDebt ?? null;
  // Yahoo reports debtToEquity as a percentage (e.g., 10.15 = 10.15%), divide by 100
  const d2e =
    financialData?.debtToEquity != null
      ? financialData.debtToEquity / 100
      : null;
  const latestAssets = annualBalance[0]?.totalAssets ?? null;

  const keyMetricsTtm: FmpKeyMetrics[] = [
    {
      date: today,
      period: "TTM",
      calendarYear: today.slice(0, 4),
      revenuePerShare: null,
      netIncomePerShare: null,
      operatingCashFlowPerShare: null,
      freeCashFlowPerShare: div(fcfTtm, shares),
      bookValuePerShare: (defaultKeyStatistics?.bookValue as number | null | undefined) ?? null,
      tangibleBookValuePerShare: null,
      roic: null,
      returnOnTangibleAssets: null,
      earningsYield: null,
      freeCashFlowYield: null,
      debtToEquity: d2e,
      debtToAssets: div(totalDebtTtm, latestAssets),
      netDebtToEBITDA: null,
      currentRatio: financialData?.currentRatio ?? null,
      interestCoverage: null,
      peRatioTTM: (defaultKeyStatistics?.trailingPE as number | null | undefined) ?? null,
      priceToSalesRatioTTM: div(mcap, totalRevTtm),
      priceToBookRatioTTM: (defaultKeyStatistics?.priceToBook as number | null | undefined) ?? null,
      evToSalesTTM: (defaultKeyStatistics?.enterpriseToRevenue as number | null | undefined) ?? null,
      enterpriseValueOverEBITDATTM:
        (defaultKeyStatistics?.enterpriseToEbitda as number | null | undefined) ?? null,
      evToFreeCashFlowTTM: fcfTtm && fcfTtm > 0 ? div(ev, fcfTtm) : null,
      priceToFreeCashFlowsRatioTTM:
        fcfTtm && fcfTtm > 0 ? div(mcap, fcfTtm) : null,
      pocfratio: null,
      dividendYield: summaryDetail?.dividendYield ?? null,
      buybackYield: null,
      shareholderYield: null,
      payoutRatio: summaryDetail?.payoutRatio ?? null,
      daysOfSalesOutstanding: null,
      daysOfInventoryOutstanding: null,
      daysPayablesOutstanding: null,
      receivablesTurnover: null,
      inventoryTurnover: null,
      assetTurnover: div(totalRevTtm, latestAssets),
      sharesOutstanding: shares,
      enterpriseValue: ev,
      marketCap: mcap,
      peRatio: (defaultKeyStatistics?.trailingPE as number | null | undefined) ?? null,
      priceToBookRatio: (defaultKeyStatistics?.priceToBook as number | null | undefined) ?? null,
      priceToSalesRatio: div(mcap, totalRevTtm),
      evToFreeCashFlow: fcfTtm && fcfTtm > 0 ? div(ev, fcfTtm) : null,
    },
  ];

  // Annual key metrics (computed from statements)
  const keyMetricsAnnual = buildAnnualKeyMetrics(
    annualIncome,
    annualBalance,
    annualCashFlow,
  );

  // ── Ratios ───────────────────────────────────────────────────────────────────
  const ratiosTtm: FmpFinancialRatios[] = [
    {
      date: today,
      period: "TTM",
      calendarYear: today.slice(0, 4),
      grossProfitMargin: financialData?.grossMargins ?? null,
      operatingProfitMargin: financialData?.operatingMargins ?? null,
      netProfitMargin: financialData?.profitMargins ?? null,
      returnOnAssets: financialData?.returnOnAssets ?? null,
      returnOnEquity: financialData?.returnOnEquity ?? null,
      returnOnCapitalEmployed: null,
      debtRatio: div(totalDebtTtm, latestAssets),
      debtEquityRatio: d2e,
      currentRatio: financialData?.currentRatio ?? null,
      quickRatio: financialData?.quickRatio ?? null,
      priceEarningsRatio: (defaultKeyStatistics?.trailingPE as number | null | undefined) ?? null,
      priceToBookRatio: (defaultKeyStatistics?.priceToBook as number | null | undefined) ?? null,
      priceToSalesRatio: div(mcap, totalRevTtm),
      freeCashFlowPerShare: div(fcfTtm, shares),
      priceToFreeCashFlowsRatio:
        fcfTtm && fcfTtm > 0 ? div(mcap, fcfTtm) : null,
      ebitPerRevenue: null,
      ebtPerEbit: null,
      priceCashFlowRatio: null,
      interestCoverage: null,
    },
  ];

  const ratiosAnnual = buildAnnualRatios(annualIncome, annualBalance);

  // ── Analyst estimates (from earningsTrend) ───────────────────────────────────
  const estimates: FmpAnalystEstimate[] = (earningsTrend?.trend ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((t: any) => {
      const endDate = t.endDate;
      const dateStr =
        endDate instanceof Date
          ? endDate.toISOString().slice(0, 10)
          : typeof endDate === "string"
            ? endDate.slice(0, 10)
            : today;
      return {
        date: dateStr,
        symbol,
        estimatedRevenueLow: t.revenueEstimate?.low ?? null,
        estimatedRevenueHigh: t.revenueEstimate?.high ?? null,
        estimatedRevenueAvg: t.revenueEstimate?.avg ?? null,
        estimatedEbitdaLow: null,
        estimatedEbitdaHigh: null,
        estimatedEbitdaAvg: null,
        estimatedEbitLow: null,
        estimatedEbitHigh: null,
        estimatedEbitAvg: null,
        estimatedNetIncomeLow: null,
        estimatedNetIncomeHigh: null,
        estimatedNetIncomeAvg: null,
        estimatedSgaExpenseLow: null,
        estimatedSgaExpenseHigh: null,
        estimatedSgaExpenseAvg: null,
        estimatedEpsLow: t.earningsEstimate?.low ?? null,
        estimatedEpsHigh: t.earningsEstimate?.high ?? null,
        estimatedEpsAvg: t.earningsEstimate?.avg ?? null,
        numberAnalystEstimatedRevenue: t.revenueEstimate?.numberOfAnalysts ?? null,
        numberAnalystEstimatedEps: t.earningsEstimate?.numberOfAnalysts ?? null,
      };
    });

  return {
    profile,
    incomeAnnual: annualIncome,
    incomeQuarterly: quarterlyIncome,
    balanceAnnual: annualBalance,
    balanceQuarterly: quarterlyBalance,
    cashFlowAnnual: annualCashFlow,
    cashFlowQuarterly: quarterlyCashFlow,
    keyMetricsAnnual,
    keyMetricsTtm,
    ratiosAnnual,
    ratiosTtm,
    estimates,
    // Peers not supported via Yahoo Finance without additional calls; return empty
    peerProfiles: [],
    peerKeyMetricsTtm: [],
    peerIncomeAnnual: [],
  };
}
