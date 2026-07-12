/**
 * Fetches all fundamental data for a symbol via yahoo-finance2.
 *
 * Uses fundamentalsTimeSeries for financial statements (income, balance, cash-flow)
 * and quoteSummary for real-time price, ratios, and analyst estimates.
 *
 * Replaces the 12 parallel FMP calls with ~7 parallel calls to Yahoo Finance.
 */

import YahooFinance from "yahoo-finance2";
const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });
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

function fmtDate(d: Date | string | undefined | null): string {
  if (!d) return new Date().toISOString().slice(0, 10);
  if (typeof d === "string") return d.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function div(a: number | null | undefined, b: number | null | undefined): number | null {
  if (a == null || b == null || b === 0) return null;
  return a / b;
}

// ── Adapters from fundamentalsTimeSeries shapes ───────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapFtsIncome(e: any, period: "annual" | "quarter"): FmpIncomeStatement {
  const date = fmtDate(e.date);
  return {
    date,
    period,
    calendarYear: date.slice(0, 4),
    revenue: e.totalRevenue ?? e.operatingRevenue ?? null,
    grossProfit: e.grossProfit ?? null,
    operatingIncome: e.operatingIncome ?? null,
    netIncome: e.netIncome ?? e.netIncomeCommonStockholders ?? null,
    ebitda: e.EBITDA ?? e.normalizedEBITDA ?? null,
    eps: e.basicEPS ?? null,
    epsDiluted: e.dilutedEPS ?? null,
    weightedAverageShsOutDil: e.dilutedAverageShares ?? null,
    researchAndDevelopmentExpenses: e.researchAndDevelopment ?? null,
    sellingGeneralAndAdministrativeExpenses: e.sellingGeneralAndAdministration ?? null,
    operatingExpenses: e.operatingExpense ?? null,
    costOfRevenue: e.costOfRevenue ?? e.reconciledCostOfRevenue ?? null,
    interestExpense: e.interestExpense ?? e.interestExpenseNonOperating ?? null,
    incomeTaxExpense: e.taxProvision ?? null,
    ebit: e.EBIT ?? e.operatingIncome ?? null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapFtsBalance(e: any, period: "annual" | "quarter"): FmpBalanceSheet {
  const date = fmtDate(e.date);
  const cash = e.cashAndCashEquivalents ?? null;
  const shortTermDebt = e.currentDebt ?? null;
  const longTermDebt = e.longTermDebt ?? null;
  const totalDebt = e.totalDebt ?? null;
  const netDebt = e.netDebt ?? (totalDebt != null && cash != null ? totalDebt - cash : null);

  return {
    date,
    period,
    calendarYear: date.slice(0, 4),
    cashAndCashEquivalents: cash,
    shortTermInvestments: e.otherShortTermInvestments ?? null,
    totalCurrentAssets: e.currentAssets ?? null,
    totalAssets: e.totalAssets ?? null,
    totalCurrentLiabilities: e.currentLiabilities ?? null,
    totalLiabilities: e.totalLiabilitiesNetMinorityInterest ?? null,
    totalEquity: e.stockholdersEquity ?? e.commonStockEquity ?? null,
    totalDebt,
    netDebt,
    longTermDebt,
    shortTermDebt,
    goodwill: e.goodwill ?? null,
    intangibleAssets: e.otherIntangibleAssets ?? e.goodwillAndOtherIntangibleAssets ?? null,
    inventory: e.inventory ?? null,
    netReceivables: e.accountsReceivable ?? e.receivables ?? null,
    retainedEarnings: e.retainedEarnings ?? null,
    minorityInterest: e.minorityInterest ?? null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapFtsCashFlow(e: any, period: "annual" | "quarter"): FmpCashFlow {
  const date = fmtDate(e.date);
  const ocf: number | null = e.operatingCashFlow ?? e.cashFlowFromContinuingOperatingActivities ?? null;
  const capex: number | null = e.capitalExpenditure ?? e.purchaseOfPPE ?? null;
  const fcf = e.freeCashFlow ?? (ocf != null && capex != null ? ocf + capex : null);

  return {
    date,
    period,
    calendarYear: date.slice(0, 4),
    operatingCashFlow: ocf,
    capitalExpenditure: capex,
    freeCashFlow: fcf,
    stockBasedCompensation: e.stockBasedCompensation ?? null,
    acquisitionsNet: null,
    dividendsPaid: e.cashDividendsPaid ?? e.commonStockDividendPaid ?? null,
    commonStockRepurchased: e.repurchaseOfCapitalStock ?? null,
    debtRepayment: e.repaymentOfDebt ?? e.longTermDebtPayments ?? null,
    netChangeInCash: e.changesInCash ?? null,
    deprecationAndAmortization:
      e.depreciationAmortizationDepletion ??
      e.depreciationAndAmortization ??
      e.depreciation ??
      null,
  };
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
    const ebit = inc.ebit;
    const assets = bal?.totalAssets;
    const equity = bal?.totalEquity;
    const debt = bal?.totalDebt;
    const curAssets = bal?.totalCurrentAssets;
    const curLiab = bal?.totalCurrentLiabilities;
    const inv = bal?.inventory;
    const rec = bal?.netReceivables;
    const fcf = cf?.freeCashFlow;
    const intExp = inc.interestExpense;

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
  const period1 = "2019-01-01";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let qs: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let ftsAnnualFin: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let ftsAnnualBs: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let ftsAnnualCf: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let ftsQtrFin: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let ftsQtrBs: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let ftsQtrCf: any[] = [];

  try {
    const results = await Promise.allSettled([
      // 0: quoteSummary for price, profile, ratios, estimates
      yahooFinance.quoteSummary(symbol, {
        modules: [
          "price",
          "summaryProfile",
          "defaultKeyStatistics",
          "financialData",
          "earningsTrend",
          "summaryDetail",
        ],
      } as Parameters<typeof yahooFinance.quoteSummary>[1]),
      // 1-3: Annual financials
      yahooFinance.fundamentalsTimeSeries(
        symbol,
        { period1, type: "annual", module: "financials" },
        { validateResult: false },
      ),
      yahooFinance.fundamentalsTimeSeries(
        symbol,
        { period1, type: "annual", module: "balance-sheet" },
        { validateResult: false },
      ),
      yahooFinance.fundamentalsTimeSeries(
        symbol,
        { period1, type: "annual", module: "cash-flow" },
        { validateResult: false },
      ),
      // 4-6: Quarterly financials (for TTM)
      yahooFinance.fundamentalsTimeSeries(
        symbol,
        { period1: "2022-01-01", type: "quarterly", module: "financials" },
        { validateResult: false },
      ),
      yahooFinance.fundamentalsTimeSeries(
        symbol,
        { period1: "2022-01-01", type: "quarterly", module: "balance-sheet" },
        { validateResult: false },
      ),
      yahooFinance.fundamentalsTimeSeries(
        symbol,
        { period1: "2022-01-01", type: "quarterly", module: "cash-flow" },
        { validateResult: false },
      ),
    ]);

    if (results[0].status === "rejected") {
      logger.error({ symbol, err: results[0].reason }, "Yahoo quoteSummary failed");
      return null;
    }
    qs = (results[0] as PromiseFulfilledResult<unknown>).value;

    if (results[1].status === "fulfilled") ftsAnnualFin = (results[1].value as unknown[]) ?? [];
    if (results[2].status === "fulfilled") ftsAnnualBs = (results[2].value as unknown[]) ?? [];
    if (results[3].status === "fulfilled") ftsAnnualCf = (results[3].value as unknown[]) ?? [];
    if (results[4].status === "fulfilled") ftsQtrFin = (results[4].value as unknown[]) ?? [];
    if (results[5].status === "fulfilled") ftsQtrBs = (results[5].value as unknown[]) ?? [];
    if (results[6].status === "fulfilled") ftsQtrCf = (results[6].value as unknown[]) ?? [];
  } catch (err) {
    logger.error({ symbol, err }, "Yahoo Finance fetch failed");
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { price, summaryProfile, defaultKeyStatistics, financialData, earningsTrend, summaryDetail } = qs as Record<string, any>;

  if (!price) {
    logger.warn({ symbol }, "Yahoo Finance: no price data");
    return null;
  }

  logger.info(
    {
      symbol,
      annualFin: ftsAnnualFin.length,
      annualBs: ftsAnnualBs.length,
      annualCf: ftsAnnualCf.length,
      qtrFin: ftsQtrFin.length,
      qtrBs: ftsQtrBs.length,
      qtrCf: ftsQtrCf.length,
    },
    "Yahoo Finance data fetched",
  );

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    website: (summaryProfile as any)?.website ?? null,
    description: summaryProfile?.longBusinessSummary ?? null,
    fullTimeEmployees:
      summaryProfile?.fullTimeEmployees != null
        ? String(summaryProfile.fullTimeEmployees)
        : null,
    fiscalYearEnd: null,
  };

  // ── Financial statements ─────────────────────────────────────────────────────
  // fundamentalsTimeSeries returns oldest-first; reverse to newest-first (FMP convention)
  // Filter out entries without revenue (sparse entries)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const validAnnualFin = [...ftsAnnualFin].reverse().filter((e: any) => e.totalRevenue != null || e.operatingRevenue != null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const validAnnualBs = [...ftsAnnualBs].reverse().filter((e: any) => e.totalAssets != null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const validAnnualCf = [...ftsAnnualCf].reverse().filter((e: any) => e.operatingCashFlow != null || e.cashFlowFromContinuingOperatingActivities != null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const validQtrFin = [...ftsQtrFin].reverse().filter((e: any) => e.totalRevenue != null || e.operatingRevenue != null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const validQtrBs = [...ftsQtrBs].reverse().filter((e: any) => e.totalAssets != null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const validQtrCf = [...ftsQtrCf].reverse().filter((e: any) => e.operatingCashFlow != null || e.cashFlowFromContinuingOperatingActivities != null);

  const annualIncome = validAnnualFin.map((e) => mapFtsIncome(e, "annual"));
  const quarterlyIncome = validQtrFin.map((e) => mapFtsIncome(e, "quarter"));
  const annualBalance = validAnnualBs.map((e) => mapFtsBalance(e, "annual"));
  const quarterlyBalance = validQtrBs.map((e) => mapFtsBalance(e, "quarter"));
  const annualCashFlow = validAnnualCf.map((e) => mapFtsCashFlow(e, "annual"));
  const quarterlyCashFlow = validQtrCf.map((e) => mapFtsCashFlow(e, "quarter"));

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
  const latestAssets = annualBalance[0]?.totalAssets ?? quarterlyBalance[0]?.totalAssets ?? null;

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
    // Peers not supported via Yahoo Finance without additional calls
    peerProfiles: [],
    peerKeyMetricsTtm: [],
    peerIncomeAnnual: [],
  };
}
