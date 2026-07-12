/**
 * Analisi Fondamentale — Complete redesign
 *
 * Layout priority (document §13):
 * 1. Company header (compact, all key fields)
 * 2. Coverage gate
 * 3. Five key signal cards
 * 4. "Business Performance" chart — indexed to 100 (EPS, Revenue, FCF, NetIncome)
 * 5. "Valuation vs History" snapshot chart
 * 6. Secondary tabs: Growth | Profitability | Cash Flow | Balance Sheet | Valuation | Competitors | Risks
 * 7. Compact AI panel (headline + summary + 3 strengths + 3 risks)
 */

import React, { useState, useMemo } from 'react';
import { Layout } from '@/components/layout';
import { useTranslation } from '@/lib/i18n';
import {
  useSearchTickers,
  useGetFundamentalAnalysis,
  getSearchTickersQueryKey,
  getGetFundamentalAnalysisQueryKey,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import type {
  FundamentalAnalysis,
  GrowthMetric,
  ValuationMultiple,
  RedFlag,
  FundamentalStrength,
  HistoricalDataPoint,
  PeerCompanyData,
  Trend,
} from '@workspace/api-client-react';
import { useDebounce } from 'use-debounce';
import {
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Info,
  ChevronRight,
  BarChart2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ReferenceLine,
  Cell,
  Legend,
  CartesianGrid,
} from 'recharts';

// ─────────────────────────────────────────────────────────────────────────────
// Format helpers
// ─────────────────────────────────────────────────────────────────────────────

function fmtN(v: number | null | undefined, decimals = 1): string {
  if (v == null || !isFinite(v)) return '—';
  return v.toFixed(decimals);
}

function fmtPct(v: number | null | undefined, decimals = 1): string {
  if (v == null || !isFinite(v)) return '—';
  return `${v > 0 ? '+' : ''}${v.toFixed(decimals)}%`;
}

function fmtPctRaw(v: number | null | undefined, decimals = 1): string {
  if (v == null || !isFinite(v)) return '—';
  return `${v.toFixed(decimals)}%`;
}

function fmtMoney(v: number | null | undefined): string {
  if (v == null || !isFinite(v)) return '—';
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (abs >= 1e12) return `${sign}${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(1)}K`;
  return `${sign}${abs.toFixed(0)}`;
}

function fmtX(v: number | null | undefined, decimals = 1): string {
  if (v == null || !isFinite(v)) return '—';
  return `${v.toFixed(decimals)}x`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Color helpers  (green/red used sparingly — descriptive, not buy/sell signals)
// ─────────────────────────────────────────────────────────────────────────────

function pctColor(v: number | null | undefined, higherBetter = true): string {
  if (v == null) return 'text-muted-foreground';
  const positive = higherBetter ? v > 0 : v < 0;
  if (positive) return 'text-emerald-600 dark:text-emerald-400';
  if ((!higherBetter && v > 0) || (higherBetter && v < 0)) return 'text-red-500 dark:text-red-400';
  return 'text-muted-foreground';
}

function severityColor(s: string): string {
  if (s === 'high') return 'text-red-600 dark:text-red-400 bg-red-500/8 border-red-500/25';
  if (s === 'medium') return 'text-orange-600 dark:text-orange-400 bg-orange-500/8 border-orange-500/25';
  return 'text-yellow-600 dark:text-yellow-500 bg-yellow-500/8 border-yellow-500/25';
}

// ─────────────────────────────────────────────────────────────────────────────
// Small shared components
// ─────────────────────────────────────────────────────────────────────────────

function TrendIcon({ trend }: { trend: Trend | null | undefined }) {
  if (!trend) return <Minus size={12} className="text-muted-foreground" />;
  if (trend === 'improving') return <TrendingUp size={12} className="text-emerald-500" />;
  if (trend === 'declining') return <TrendingDown size={12} className="text-red-500" />;
  return <Minus size={12} className="text-muted-foreground" />;
}

function InfoTip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Info size={11} className="cursor-help opacity-40 hover:opacity-80 shrink-0" />
      </TooltipTrigger>
      <TooltipContent className="max-w-[260px] text-xs">{text}</TooltipContent>
    </Tooltip>
  );
}

function SectionCard({ title, children, id }: { title: string; children: React.ReactNode; id?: string }) {
  return (
    <div id={id} className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-border/60 bg-muted/20">
        <h3 className="font-semibold text-sm text-foreground">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function MetricTable({ rows }: { rows: React.ReactNode }) {
  return (
    <table className="w-full text-sm">
      <tbody className="divide-y divide-border/40">{rows}</tbody>
    </table>
  );
}

function MetricRow({
  label, value, sub, peerMedian, peerPercentile, trend, isNm, higherBetter = true, tooltip,
}: {
  label: string; value: React.ReactNode; sub?: string;
  peerMedian?: number | null; peerPercentile?: number | null;
  trend?: Trend | null; isNm?: boolean; higherBetter?: boolean; tooltip?: string;
}) {
  return (
    <tr className="hover:bg-muted/20 transition-colors">
      <td className="py-2.5 pr-3 text-muted-foreground text-xs w-[42%]">
        <div className="flex items-center gap-1">{label}{tooltip && <InfoTip text={tooltip} />}</div>
        {sub && <div className="text-[10px] text-muted-foreground/60 mt-0.5">{sub}</div>}
      </td>
      <td className="py-2.5 pr-3 font-medium text-xs">
        {isNm ? <span className="text-muted-foreground italic text-[11px]">N/M</span> : value}
      </td>
      <td className="py-2.5 pr-3 text-xs text-muted-foreground">
        {peerMedian != null ? fmtPctRaw(peerMedian) : '—'}
      </td>
      <td className="py-2.5 pr-2 text-xs">
        {peerPercentile != null
          ? <span className={pctColor(peerPercentile - 50, higherBetter)}>{peerPercentile}th</span>
          : <span className="text-muted-foreground">—</span>}
      </td>
      <td className="py-2.5 text-xs"><TrendIcon trend={trend} /></td>
    </tr>
  );
}

function MetricTableHeader({ t }: { t: (k: string) => string }) {
  return (
    <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border/60">
      <th className="pb-1.5 pr-3 text-left font-medium">{t('fa.col.metric')}</th>
      <th className="pb-1.5 pr-3 text-left font-medium">{t('fa.col.value')}</th>
      <th className="pb-1.5 pr-3 text-left font-medium">{t('fa.col.peerMedian')}</th>
      <th className="pb-1.5 pr-2 text-left font-medium">{t('fa.col.peerPct')}</th>
      <th className="pb-1.5 text-left font-medium">{t('fa.col.trend')}</th>
    </tr>
  );
}

function ValMetricRow({
  label, value, peerMedian, vsPeers, vsHistory3y, tooltip,
}: {
  label: string; value: number | null | undefined; peerMedian?: number | null;
  vsPeers?: number | null; vsHistory3y?: number | null; tooltip?: string;
}) {
  const fmt = (v: number | null | undefined) => {
    if (v == null) return '—';
    return Math.abs(v) >= 100 ? fmtX(v, 0) : fmtX(v, 1);
  };
  return (
    <tr className="hover:bg-muted/20 transition-colors">
      <td className="py-2.5 pr-3 text-muted-foreground text-xs w-[32%]">
        <div className="flex items-center gap-1">{label}{tooltip && <InfoTip text={tooltip} />}</div>
      </td>
      <td className="py-2.5 pr-3 font-medium text-xs">{fmt(value)}</td>
      <td className="py-2.5 pr-3 text-xs text-muted-foreground">{fmt(peerMedian)}</td>
      <td className={`py-2.5 pr-3 text-xs font-medium ${pctColor(vsPeers, false)}`}>
        {vsPeers != null ? `${vsPeers > 0 ? '+' : ''}${vsPeers.toFixed(0)}%` : '—'}
      </td>
      <td className={`py-2.5 text-xs font-medium ${pctColor(vsHistory3y, false)}`}>
        {vsHistory3y != null ? `${vsHistory3y > 0 ? '+' : ''}${vsHistory3y.toFixed(0)}%` : '—'}
      </td>
    </tr>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Coverage gate helpers
// ─────────────────────────────────────────────────────────────────────────────

function coverageTier(pct: number): 'full' | 'partial' | 'limited' | 'insufficient' {
  if (pct >= 80) return 'full';
  if (pct >= 60) return 'partial';
  if (pct >= 40) return 'limited';
  return 'insufficient';
}

// ─────────────────────────────────────────────────────────────────────────────
// Card 1 — Valuation expansion / contraction
// ─────────────────────────────────────────────────────────────────────────────

function classifyPeVsHistory(vsHistory3y: number | null | undefined, language: string): {
  label: string; color: string;
} {
  if (vsHistory3y == null) return { label: '—', color: 'text-muted-foreground' };
  if (vsHistory3y <= -20) return {
    label: language === 'it' ? 'Molto più economica della storia' : 'Much cheaper than own history',
    color: 'text-blue-600 dark:text-blue-400',
  };
  if (vsHistory3y <= -5) return {
    label: language === 'it' ? 'Più economica della storia' : 'Cheaper than own history',
    color: 'text-blue-500 dark:text-blue-400',
  };
  if (vsHistory3y >= 20) return {
    label: language === 'it' ? 'Valutazione molto più cara della storia' : 'Much more expensive than history',
    color: 'text-orange-600 dark:text-orange-400',
  };
  if (vsHistory3y >= 5) return {
    label: language === 'it' ? 'Valutazione leggermente superiore alla storia' : 'Slightly above historical valuation',
    color: 'text-orange-500 dark:text-orange-400',
  };
  return {
    label: language === 'it' ? 'In linea con la valutazione storica' : 'In line with historical valuation',
    color: 'text-muted-foreground',
  };
}

function classifyEpsGrowthMomentum(epsYoy: number | null, rev3yCagr: number | null, language: string): {
  label: string; badge: string;
} {
  const it = language === 'it';
  if (epsYoy == null || rev3yCagr == null) return {
    label: '—', badge: 'text-muted-foreground bg-muted',
  };
  if (epsYoy > rev3yCagr + 5) return {
    label: it ? 'Accelerazione' : 'Accelerating',
    badge: 'text-emerald-700 bg-emerald-500/10 border-emerald-500/25',
  };
  if (epsYoy > 0 && rev3yCagr > 0) return {
    label: it ? 'Crescita stabile' : 'Stable growth',
    badge: 'text-blue-700 bg-blue-500/10 border-blue-500/25',
  };
  if (epsYoy < rev3yCagr - 5) return {
    label: it ? 'Rallentamento' : 'Slowing',
    badge: 'text-yellow-700 bg-yellow-500/10 border-yellow-500/25',
  };
  if (epsYoy < 0) return {
    label: it ? 'Contrazione' : 'Contracting',
    badge: 'text-red-700 bg-red-500/10 border-red-500/25',
  };
  return {
    label: it ? 'Crescita stabile' : 'Stable growth',
    badge: 'text-blue-700 bg-blue-500/10 border-blue-500/25',
  };
}

function classifyBusinessQuality(
  opMargin: number | null, fcfMargin: number | null, roic: number | null, language: string,
): { label: string; color: string } {
  const it = language === 'it';
  const score = [
    opMargin != null ? (opMargin > 20 ? 2 : opMargin > 10 ? 1 : 0) : 0,
    fcfMargin != null ? (fcfMargin > 15 ? 2 : fcfMargin > 5 ? 1 : 0) : 0,
    roic != null ? (roic > 15 ? 2 : roic > 8 ? 1 : 0) : 0,
  ].reduce((a, b) => a + b, 0);
  if (score >= 5) return { label: it ? 'Molto forte' : 'Very strong', color: 'text-emerald-600' };
  if (score >= 3) return { label: it ? 'Forte' : 'Strong', color: 'text-emerald-500' };
  if (score >= 2) return { label: it ? 'Neutrale' : 'Neutral', color: 'text-muted-foreground' };
  if (score >= 1) return { label: it ? 'Debole' : 'Weak', color: 'text-orange-500' };
  return { label: it ? 'Molto debole' : 'Very weak', color: 'text-red-500' };
}

// ─────────────────────────────────────────────────────────────────────────────
// KEY SIGNAL CARDS
// ─────────────────────────────────────────────────────────────────────────────

function SignalCard({ title, children, subtitle }: {
  title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3 min-h-[180px]">
      <div>
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</div>
        {subtitle && <div className="text-[10px] text-muted-foreground/60 mt-0.5">{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

function SignalRow({ label, value, valueClass }: {
  label: string; value: string; valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground truncate">{label}</span>
      <span className={`font-semibold tabular-nums ml-2 shrink-0 ${valueClass ?? ''}`}>{value}</span>
    </div>
  );
}

function KeySignalCards({ analysis, t, language }: {
  analysis: FundamentalAnalysis; t: (k: string) => string; language: string;
}) {
  const { growth, profitability, cashFlow, financialStrength, valuation } = analysis;

  // ── Card 1: Valuation expansion/contraction ───────────────────────────────
  const primaryMultiple =
    valuation.pe.value != null && valuation.pe.value > 0 && valuation.pe.value < 200
      ? { label: 'P/E', m: valuation.pe }
      : valuation.evEbitda.value != null && valuation.evEbitda.value > 0
        ? { label: 'EV/EBITDA', m: valuation.evEbitda }
        : valuation.pFcf.value != null && valuation.pFcf.value > 0
          ? { label: 'P/FCF', m: valuation.pFcf }
          : null;

  const vsHistClass = classifyPeVsHistory(primaryMultiple?.m.vsHistory3y, language);

  // ── Card 2: Valuation multiples ───────────────────────────────────────────
  // ── Card 3: Growth momentum ───────────────────────────────────────────────
  const momentum = classifyEpsGrowthMomentum(
    growth.epsYoy.isNm ? null : (growth.epsYoy.value ?? null),
    growth.revenue3yCagr.isNm ? null : (growth.revenue3yCagr.value ?? null),
    language,
  );

  // ── Card 4: Business quality ──────────────────────────────────────────────
  const quality = classifyBusinessQuality(
    profitability.operatingMarginTtm ?? null,
    profitability.fcfMarginTtm ?? null,
    profitability.roic ?? null,
    language,
  );

  // ── Card 5: Financial strength ────────────────────────────────────────────
  const dilution = valuation.dilution3y;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      {/* Card 1 — Prezzo vs Utili / Valuation change */}
      <SignalCard
        title={t('fa.card.valChange')}
        subtitle={primaryMultiple ? `${primaryMultiple.label}: ${fmtX(primaryMultiple.m.value)}` : undefined}
      >
        {primaryMultiple ? (
          <>
            <SignalRow
              label={t('fa.card.current')}
              value={fmtX(primaryMultiple.m.value)}
            />
            <SignalRow
              label={t('fa.card.hist5y')}
              value={fmtX(primaryMultiple.m.historicalMedian5y)}
            />
            <SignalRow
              label={t('fa.card.peerMedian')}
              value={fmtX(primaryMultiple.m.peerMedian)}
            />
            <div className="mt-auto pt-2 border-t border-border/40">
              <span className={`text-[11px] font-semibold ${vsHistClass.color}`}>
                {vsHistClass.label}
              </span>
            </div>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">{t('fa.nm')}</p>
        )}
      </SignalCard>

      {/* Card 2 — Valuation multiples vs peers */}
      <SignalCard title={t('fa.card.valuation')}>
        <SignalRow label="P/E" value={fmtX(valuation.pe.value)} />
        <SignalRow label="EV/EBITDA" value={fmtX(valuation.evEbitda.value)} />
        <SignalRow label="P/FCF" value={fmtX(valuation.pFcf.value)} />
        <SignalRow label="EV/Sales" value={fmtX(valuation.evRevenue.value)} />
        {primaryMultiple?.m.vsPeers != null && (
          <div className="mt-auto pt-2 border-t border-border/40">
            <span className={`text-[11px] font-semibold ${pctColor(primaryMultiple.m.vsPeers, false)}`}>
              {primaryMultiple.m.vsPeers > 0
                ? `+${primaryMultiple.m.vsPeers.toFixed(0)}% ${t('fa.card.vsPeers')}`
                : `${primaryMultiple.m.vsPeers.toFixed(0)}% ${t('fa.card.vsPeers')}`}
            </span>
          </div>
        )}
      </SignalCard>

      {/* Card 3 — Growth */}
      <SignalCard title={t('fa.card.growth')}>
        <SignalRow
          label={t('fa.metric.revenueYoy')}
          value={growth.revenueYoy.isNm ? 'N/M' : fmtPct(growth.revenueYoy.value)}
          valueClass={growth.revenueYoy.isNm ? 'text-muted-foreground' : pctColor(growth.revenueYoy.value)}
        />
        <SignalRow
          label={t('fa.metric.revenue3yCagr')}
          value={growth.revenue3yCagr.isNm ? 'N/M' : fmtPct(growth.revenue3yCagr.value)}
          valueClass={growth.revenue3yCagr.isNm ? 'text-muted-foreground' : pctColor(growth.revenue3yCagr.value)}
        />
        <SignalRow
          label={t('fa.metric.epsYoy')}
          value={growth.epsYoy.isNm ? 'N/M' : fmtPct(growth.epsYoy.value)}
          valueClass={growth.epsYoy.isNm ? 'text-muted-foreground' : pctColor(growth.epsYoy.value)}
        />
        <SignalRow
          label={t('fa.metric.fcfYoy')}
          value={growth.fcfYoy.isNm ? 'N/M' : fmtPct(growth.fcfYoy.value)}
          valueClass={growth.fcfYoy.isNm ? 'text-muted-foreground' : pctColor(growth.fcfYoy.value)}
        />
        <div className="mt-auto pt-2 border-t border-border/40">
          <span className={`text-[11px] font-semibold border rounded-full px-2 py-0.5 ${momentum.badge}`}>
            {momentum.label}
          </span>
        </div>
      </SignalCard>

      {/* Card 4 — Business Quality */}
      <SignalCard title={t('fa.card.quality')}>
        <SignalRow
          label={t('fa.metric.opMargin')}
          value={fmtPctRaw(profitability.operatingMarginTtm)}
          valueClass={pctColor(profitability.operatingMarginTtm)}
        />
        <SignalRow
          label={t('fa.metric.fcfMargin')}
          value={fmtPctRaw(profitability.fcfMarginTtm)}
          valueClass={pctColor(profitability.fcfMarginTtm)}
        />
        <SignalRow
          label={t('fa.metric.roic')}
          value={fmtPctRaw(profitability.roic)}
          valueClass={pctColor(profitability.roic)}
        />
        <SignalRow
          label={`${language === 'it' ? 'Trend 3A' : '3Y trend'}`}
          value={profitability.operatingMarginTrend === 'improving'
            ? (language === 'it' ? '↑ Espansione' : '↑ Expanding')
            : profitability.operatingMarginTrend === 'declining'
              ? (language === 'it' ? '↓ Contrazione' : '↓ Contracting')
              : (language === 'it' ? '→ Stabile' : '→ Stable')}
          valueClass={profitability.operatingMarginTrend === 'improving'
            ? 'text-emerald-600'
            : profitability.operatingMarginTrend === 'declining'
              ? 'text-red-500'
              : 'text-muted-foreground'}
        />
        <div className="mt-auto pt-2 border-t border-border/40">
          <span className={`text-[11px] font-semibold ${quality.color}`}>{quality.label}</span>
        </div>
      </SignalCard>

      {/* Card 5 — Financial Strength */}
      <SignalCard title={t('fa.card.strength')}>
        <SignalRow
          label={t('fa.metric.netDebt')}
          value={financialStrength.isNetCash ? t('fa.netCash') : fmtMoney(financialStrength.netDebt)}
          valueClass={financialStrength.isNetCash ? 'text-emerald-600' : ''}
        />
        <SignalRow
          label={t('fa.metric.ndEbitda')}
          value={financialStrength.netDebtToEbitdaIsNm ? 'N/M' : fmtN(financialStrength.netDebtToEbitda, 1)}
          valueClass={financialStrength.netDebtToEbitda != null && !financialStrength.netDebtToEbitdaIsNm && financialStrength.netDebtToEbitda > 4
            ? 'text-orange-500' : ''}
        />
        <SignalRow
          label={t('fa.metric.intCoverage')}
          value={fmtX(financialStrength.interestCoverage)}
          valueClass={financialStrength.interestCoverage != null && financialStrength.interestCoverage < 2
            ? 'text-red-500' : ''}
        />
        <SignalRow
          label={language === 'it' ? 'Diluzione 3A CAGR' : '3Y dilution CAGR'}
          value={valuation.dilution3y != null ? fmtPct(valuation.dilution3y) : '—'}
          valueClass={dilution != null && dilution > 3 ? 'text-orange-500' : ''}
        />
        <SignalRow
          label={t('fa.metric.fcfPerShare')}
          value={fmtN(cashFlow.fcfPerShareTtm, 2)}
        />
      </SignalCard>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// INDEXED BUSINESS PERFORMANCE CHART
// "Has the price followed the business?"
// ─────────────────────────────────────────────────────────────────────────────

type ChartSeries = 'eps' | 'revenue' | 'fcf' | 'netIncome';
type ChartPeriod = '3Y' | '5Y' | '10Y' | 'Max';

const SERIES_COLORS: Record<ChartSeries, string> = {
  eps: '#3b82f6',
  revenue: '#8b5cf6',
  fcf: '#10b981',
  netIncome: '#f59e0b',
};

function indexToHundred(points: HistoricalDataPoint[], periodYears: number | null): {
  data: { year: string; value: number | null }[];
  startValue: number | null;
  endValue: number | null;
  changePct: number | null;
} {
  if (!points.length) return { data: [], startValue: null, endValue: null, changePct: null };
  const filtered = periodYears != null
    ? points.slice(-Math.min(periodYears + 1, points.length))
    : points;
  if (!filtered.length) return { data: [], startValue: null, endValue: null, changePct: null };
  const base = filtered[0].value;
  if (base == null || base === 0) return { data: [], startValue: null, endValue: null, changePct: null };
  const indexed = filtered.map(p => ({
    year: p.year,
    value: p.value != null ? Math.round((p.value / base) * 100 * 10) / 10 : null,
  }));
  const end = indexed[indexed.length - 1]?.value;
  return {
    data: indexed,
    startValue: filtered[0].value ?? null,
    endValue: filtered[filtered.length - 1]?.value ?? null,
    changePct: end != null ? end - 100 : null,
  };
}

function BusinessPerformanceChart({ analysis, t, language }: {
  analysis: FundamentalAnalysis; t: (k: string) => string; language: string;
}) {
  const [period, setPeriod] = useState<ChartPeriod>('5Y');
  const [activeSeries, setActiveSeries] = useState<Set<ChartSeries>>(new Set(['eps', 'revenue']));

  const periods: ChartPeriod[] = ['3Y', '5Y', '10Y', 'Max'];
  const periodYears: Record<ChartPeriod, number | null> = { '3Y': 3, '5Y': 5, '10Y': 10, 'Max': null };

  const seriesMap: Record<ChartSeries, HistoricalDataPoint[]> = {
    eps: analysis.historical.eps,
    revenue: analysis.historical.revenue,
    fcf: analysis.historical.fcf,
    netIncome: analysis.historical.netIncome,
  };
  const seriesLabels: Record<ChartSeries, string> = {
    eps: t('fa.hist.eps'),
    revenue: t('fa.hist.revenue'),
    fcf: t('fa.hist.fcf'),
    netIncome: t('fa.hist.netIncome'),
  };

  const yrs = periodYears[period];

  const indexed = useMemo(() => {
    const result: Record<ChartSeries, ReturnType<typeof indexToHundred>> = {} as never;
    (Object.keys(seriesMap) as ChartSeries[]).forEach(k => {
      result[k] = indexToHundred(seriesMap[k], yrs);
    });
    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, analysis]);

  // Merge all series into a single chart data array
  const chartData = useMemo(() => {
    const allYears = new Set<string>();
    (Object.keys(seriesMap) as ChartSeries[]).forEach(k => {
      indexed[k].data.forEach(d => allYears.add(d.year));
    });
    return Array.from(allYears).sort().map(year => {
      const row: Record<string, string | number | null> = { year };
      (Object.keys(seriesMap) as ChartSeries[]).forEach(k => {
        const pt = indexed[k].data.find(d => d.year === year);
        row[k] = pt?.value ?? null;
      });
      return row;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indexed]);

  const toggleSeries = (s: ChartSeries) => {
    setActiveSeries(prev => {
      const next = new Set(prev);
      if (next.has(s) && next.size === 1) return prev; // keep at least one
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });
  };

  const title = language === 'it' ? 'Il prezzo ha seguito il business?' : 'Has the price followed the business?';

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-border/60 bg-muted/20 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-sm text-foreground">{title}</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {language === 'it'
              ? 'Dati indicizzati a 100 all\'inizio del periodo · Fondamentali annuali'
              : 'Annual fundamentals indexed to 100 at start of period'}
          </p>
        </div>
        {/* Period selector */}
        <div className="flex items-center gap-1">
          {periods.map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                period === p
                  ? 'bg-primary text-primary-foreground font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Series toggles */}
      <div className="px-5 pt-3 flex flex-wrap gap-2">
        {(Object.keys(seriesMap) as ChartSeries[]).map(s => (
          <button
            key={s}
            onClick={() => toggleSeries(s)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border transition-all ${
              activeSeries.has(s)
                ? 'border-transparent font-medium'
                : 'border-border text-muted-foreground'
            }`}
            style={activeSeries.has(s) ? {
              backgroundColor: SERIES_COLORS[s] + '18',
              color: SERIES_COLORS[s],
              borderColor: SERIES_COLORS[s] + '40',
            } : undefined}
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: activeSeries.has(s) ? SERIES_COLORS[s] : '#d1d5db' }}
            />
            {seriesLabels[s]}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="px-4 pt-2 pb-4">
        {chartData.length < 2 ? (
          <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
            <BarChart2 size={20} className="mr-2 opacity-40" />
            {language === 'it' ? 'Dati storici insufficienti' : 'Insufficient historical data'}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
              <XAxis dataKey="year" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}`} />
              <ReferenceLine y={100} stroke="#9ca3af" strokeDasharray="4 2" strokeWidth={1} />
              <RechartsTooltip
                contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }}
                formatter={(v: number, name: string) => {
                  const s = name as ChartSeries;
                  const series = seriesLabels[s] || name;
                  return [`${v != null ? v.toFixed(1) : '—'} (base 100)`, series];
                }}
              />
              {(Object.keys(seriesMap) as ChartSeries[])
                .filter(s => activeSeries.has(s))
                .map(s => (
                  <Line
                    key={s}
                    type="monotone"
                    dataKey={s}
                    stroke={SERIES_COLORS[s]}
                    dot={{ r: 3, strokeWidth: 0, fill: SERIES_COLORS[s] }}
                    activeDot={{ r: 5 }}
                    strokeWidth={2}
                    connectNulls={false}
                  />
                ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Summary row */}
      {chartData.length >= 2 && (
        <div className="px-5 pb-4 grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-border/40 pt-3">
          {(Object.keys(seriesMap) as ChartSeries[])
            .filter(s => activeSeries.has(s))
            .map(s => {
              const { changePct } = indexed[s];
              return (
                <div key={s} className="text-xs">
                  <div className="text-muted-foreground mb-0.5" style={{ color: SERIES_COLORS[s] + 'cc' }}>
                    {seriesLabels[s]}
                  </div>
                  <div className={`font-semibold text-sm ${pctColor(changePct)}`}>
                    {changePct != null ? fmtPct(changePct) : '—'}
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Data note */}
      <div className="px-5 pb-3 text-[10px] text-muted-foreground/60 border-t border-border/30 pt-2">
        {language === 'it'
          ? 'I dati di prezzo storico non sono inclusi nell\'analisi fondamentale. Il grafico mostra la performance dei fondamentali (dati annuali).'
          : 'Historical price data is not included in the fundamental dataset. This chart shows annual fundamental performance only.'}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VALUATION SNAPSHOT CHART
// "How expensive vs history?"
// ─────────────────────────────────────────────────────────────────────────────

type ValuationMetric = 'pe' | 'evEbitda' | 'pFcf' | 'evRevenue';

function ValuationSnapshotChart({ analysis, t, language }: {
  analysis: FundamentalAnalysis; t: (k: string) => string; language: string;
}) {
  const [metric, setMetric] = useState<ValuationMetric>('pe');
  const { valuation } = analysis;

  const metrics: { key: ValuationMetric; label: string; m: ValuationMultiple }[] = [
    { key: 'pe', label: 'P/E', m: valuation.pe },
    { key: 'evEbitda', label: 'EV/EBITDA', m: valuation.evEbitda },
    { key: 'pFcf', label: 'P/FCF', m: valuation.pFcf },
    { key: 'evRevenue', label: 'EV/Sales', m: valuation.evRevenue },
  ];

  const current = metrics.find(m => m.key === metric)!;
  const m = current.m;

  const chartData = [
    { label: language === 'it' ? 'Attuale' : 'Current', value: m.value, fill: '#3b82f6' },
    { label: language === 'it' ? 'Mediana 5A' : '5Y median', value: m.historicalMedian5y, fill: '#9ca3af' },
    { label: language === 'it' ? 'Mediana peer' : 'Peer median', value: m.peerMedian, fill: '#e5e7eb' },
  ].filter(d => d.value != null && d.value > 0 && d.value < 500);

  const percentile = m.peerPercentile;
  const vsH = m.vsHistory3y;
  const vsP = m.vsPeers;

  const title = language === 'it' ? 'Quanto è cara oggi rispetto al passato?' : 'How expensive is it versus history?';

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border/60 bg-muted/20 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-sm text-foreground">{title}</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {language === 'it' ? 'Confronto con storia e peer' : 'Current vs history and peer group'}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {metrics.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setMetric(key)}
              className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                metric === key
                  ? 'bg-primary text-primary-foreground font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Bar chart */}
        <div>
          {chartData.length >= 1 ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} layout="horizontal">
                <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}x`} />
                <RechartsTooltip
                  formatter={(v: number) => [`${v.toFixed(1)}x`, current.label]}
                  contentStyle={{ fontSize: 11 }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
              {language === 'it' ? 'Dati insufficienti' : 'Insufficient data'}
            </div>
          )}
        </div>

        {/* Metrics summary */}
        <div className="flex flex-col gap-3 justify-center">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/30 rounded-lg p-3">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                {current.label} {language === 'it' ? 'attuale' : 'current'}
              </div>
              <div className="text-xl font-bold">{fmtX(m.value)}</div>
            </div>
            <div className="bg-muted/30 rounded-lg p-3">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                {language === 'it' ? 'Mediana 5 anni' : '5Y median'}
              </div>
              <div className="text-xl font-bold">{fmtX(m.historicalMedian5y)}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/30 rounded-lg p-3">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                {language === 'it' ? 'Mediana peer' : 'Peer median'}
              </div>
              <div className="text-xl font-bold">{fmtX(m.peerMedian)}</div>
            </div>
            <div className="bg-muted/30 rounded-lg p-3">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                {language === 'it' ? 'Percentile' : 'Peer percentile'}
              </div>
              <div className="text-xl font-bold">{percentile != null ? `${percentile}°` : '—'}</div>
            </div>
          </div>
          <div className="flex gap-3 text-xs">
            {vsH != null && (
              <div>
                <span className="text-muted-foreground">vs {language === 'it' ? 'storia' : 'history'}: </span>
                <span className={`font-semibold ${pctColor(vsH, false)}`}>
                  {vsH > 0 ? '+' : ''}{vsH.toFixed(0)}%
                </span>
              </div>
            )}
            {vsP != null && (
              <div>
                <span className="text-muted-foreground">vs {language === 'it' ? 'peer' : 'peers'}: </span>
                <span className={`font-semibold ${pctColor(vsP, false)}`}>
                  {vsP > 0 ? '+' : ''}{vsP.toFixed(0)}%
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPACT AI PANEL
// ─────────────────────────────────────────────────────────────────────────────

function CompactAIPanel({ analysis, t, language }: {
  analysis: FundamentalAnalysis; t: (k: string) => string; language: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const exp = analysis.explanation;
  const coverage = analysis.dataCoverage;
  const tier = coverageTier(coverage.coveragePct);
  const lowData = tier === 'insufficient' || tier === 'limited';

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-border/60 bg-muted/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-sm">{t('fa.section.explanation')}</h3>
          <CoverageBadge tier={tier} pct={coverage.coveragePct} t={t} language={language} />
        </div>
        {!lowData && (
          <button
            onClick={() => setExpanded(v => !v)}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            {expanded
              ? (language === 'it' ? 'Riduci' : 'Collapse')
              : (language === 'it' ? 'Approfondisci l\'analisi' : 'Expand analysis')}
            {expanded ? <ChevronUp size={13} /> : <ChevronRight size={13} />}
          </button>
        )}
      </div>

      <div className="p-4">
        {lowData ? (
          <div className="flex gap-2 text-sm">
            <AlertTriangle size={16} className="text-orange-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-foreground mb-1">
                {language === 'it'
                  ? `Dati insufficienti per un'analisi fondamentale affidabile.`
                  : `Insufficient data for a reliable fundamental analysis.`}
              </p>
              <p className="text-xs text-muted-foreground">
                {language === 'it'
                  ? `Disponibili ${coverage.coveragePct.toFixed(0)}% delle metriche necessarie. I dati mancanti non vengono trattati come zero.`
                  : `${coverage.coveragePct.toFixed(0)}% of required metrics available. Missing data is not treated as zero.`}
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Headline + summary */}
            <p className="text-sm text-foreground/90 leading-relaxed mb-4">{exp.summary}</p>

            {/* Strengths & Risks side by side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2">
                  {t('fa.explain.strengths')}
                </div>
                <ul className="space-y-1.5">
                  {exp.strengths.slice(0, 3).map((s, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-foreground/80">
                      <CheckCircle2 size={12} className="text-emerald-500 shrink-0 mt-0.5" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-orange-500 mb-2">
                  {t('fa.explain.risks')}
                </div>
                <ul className="space-y-1.5">
                  {exp.risks.slice(0, 3).map((r, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-foreground/80">
                      <AlertTriangle size={12} className="text-orange-500 shrink-0 mt-0.5" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Expanded sections */}
            {expanded && (
              <div className="mt-4 pt-4 border-t border-border/40 space-y-4">
                {([
                  { key: 'growthAnalysis', label: t('fa.explain.growth') },
                  { key: 'profitabilityAnalysis', label: t('fa.explain.profitability') },
                  { key: 'cashFlowAnalysis', label: t('fa.explain.cashflow') },
                  { key: 'balanceSheetAnalysis', label: t('fa.explain.balance') },
                  { key: 'valuationAnalysis', label: t('fa.explain.valuation') },
                  { key: 'peerAnalysis', label: t('fa.explain.peers') },
                ] as const).map(({ key, label }) => (
                  exp[key as keyof typeof exp] ? (
                    <div key={key}>
                      <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{label}</div>
                      <p className="text-xs text-foreground/85 leading-relaxed">{exp[key as keyof typeof exp] as string}</p>
                    </div>
                  ) : null
                ))}
                <div>
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    {t('fa.explain.conclusion')}
                  </div>
                  <p className="text-xs text-foreground/85 leading-relaxed">{exp.conclusion}</p>
                </div>
              </div>
            )}

            <p className="mt-4 text-[10px] text-muted-foreground/60 leading-relaxed border-t border-border/30 pt-3">
              {exp.disclaimer}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Coverage badge
// ─────────────────────────────────────────────────────────────────────────────

function CoverageBadge({ tier, pct, t, language }: {
  tier: ReturnType<typeof coverageTier>; pct: number; t: (k: string) => string; language: string;
}) {
  const colors: Record<typeof tier, string> = {
    full: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20',
    partial: 'text-yellow-600 bg-yellow-500/10 border-yellow-500/20',
    limited: 'text-orange-600 bg-orange-500/10 border-orange-500/20',
    insufficient: 'text-red-600 bg-red-500/10 border-red-500/20',
  };
  const labels: Record<typeof tier, string> = {
    full: language === 'it' ? 'Dati completi' : 'Full data',
    partial: language === 'it' ? 'Dati parziali' : 'Partial data',
    limited: language === 'it' ? 'Dati limitati' : 'Limited data',
    insufficient: language === 'it' ? 'Dati insufficienti' : 'Insufficient data',
  };
  return (
    <span className={`text-[10px] font-medium border rounded-full px-2 py-0.5 ${colors[tier]}`}>
      {labels[tier]} · {pct.toFixed(0)}%
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECONDARY TABS
// ─────────────────────────────────────────────────────────────────────────────

type TabKey = 'growth' | 'profitability' | 'cashflow' | 'balance' | 'valuation' | 'competitors' | 'risks';

function SecondaryTabs({ analysis, t, language }: {
  analysis: FundamentalAnalysis; t: (k: string) => string; language: string;
}) {
  const [tab, setTab] = useState<TabKey>('growth');

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'growth', label: language === 'it' ? 'Crescita' : 'Growth' },
    { key: 'profitability', label: language === 'it' ? 'Redditività' : 'Profitability' },
    { key: 'cashflow', label: language === 'it' ? 'Flussi di cassa' : 'Cash Flow' },
    { key: 'balance', label: language === 'it' ? 'Bilancio' : 'Balance Sheet' },
    { key: 'valuation', label: language === 'it' ? 'Valutazione' : 'Valuation' },
    { key: 'competitors', label: language === 'it' ? 'Competitor' : 'Competitors' },
    { key: 'risks', label: language === 'it' ? 'Rischi' : 'Risks' },
  ];

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Tab bar */}
      <div className="flex overflow-x-auto border-b border-border/60 bg-muted/10">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-3 text-xs font-medium whitespace-nowrap transition-colors border-b-2 ${
              tab === key
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-5">
        {tab === 'growth' && <GrowthTab analysis={analysis} t={t} />}
        {tab === 'profitability' && <ProfitabilityTab analysis={analysis} t={t} />}
        {tab === 'cashflow' && <CashFlowTab analysis={analysis} t={t} language={language} />}
        {tab === 'balance' && <BalanceTab analysis={analysis} t={t} />}
        {tab === 'valuation' && <ValuationTab analysis={analysis} t={t} language={language} />}
        {tab === 'competitors' && <CompetitorsTab analysis={analysis} t={t} language={language} />}
        {tab === 'risks' && <RisksTab analysis={analysis} t={t} language={language} />}
      </div>
    </div>
  );
}

// ── Growth tab ────────────────────────────────────────────────────────────────

function GrowthTab({ analysis, t }: { analysis: FundamentalAnalysis; t: (k: string) => string }) {
  const g = analysis.growth;
  const rows: { label: string; metric: GrowthMetric; tooltip?: string }[] = [
    { label: t('fa.metric.revenueYoy'), metric: g.revenueYoy, tooltip: 'Year-over-year revenue growth rate.' },
    { label: t('fa.metric.revenue3yCagr'), metric: g.revenue3yCagr },
    { label: t('fa.metric.revenue5yCagr'), metric: g.revenue5yCagr },
    { label: t('fa.metric.revenueYoYQ'), metric: g.revenueYoYLatestQ },
    { label: t('fa.metric.epsYoy'), metric: g.epsYoy },
    { label: t('fa.metric.eps3yCagr'), metric: g.eps3yCagr },
    { label: t('fa.metric.opIncYoy'), metric: g.operatingIncomeYoy },
    { label: t('fa.metric.netIncYoy'), metric: g.netIncomeYoy },
    { label: t('fa.metric.ocfYoy'), metric: g.ocfYoy },
    { label: t('fa.metric.fcfYoy'), metric: g.fcfYoy },
    { label: t('fa.metric.fcf3yCagr'), metric: g.fcf3yCagr },
  ];
  return (
    <div>
      {g.revenueTtm != null && (
        <div className="mb-3 text-xs text-muted-foreground">
          {t('fa.metric.revenueTtm')}: <span className="font-semibold text-foreground">{fmtMoney(g.revenueTtm)}</span>
          {g.epsDilutedTtm != null && (
            <> · {t('fa.metric.epsTtm')}: <span className="font-semibold text-foreground">{fmtN(g.epsDilutedTtm, 2)}</span></>
          )}
        </div>
      )}
      <table className="w-full text-sm">
        <thead><MetricTableHeader t={t} /></thead>
        <tbody className="divide-y divide-border/40">
          {rows.map(({ label, metric, tooltip }) => (
            <MetricRow
              key={label}
              label={label}
              value={<span className={pctColor(metric.value)}>{fmtPct(metric.value)}</span>}
              peerMedian={metric.peerMedian}
              peerPercentile={metric.peerPercentile}
              trend={metric.trend}
              isNm={metric.isNm}
              tooltip={tooltip}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Profitability tab ─────────────────────────────────────────────────────────

function ProfitabilityTab({ analysis, t }: { analysis: FundamentalAnalysis; t: (k: string) => string }) {
  const p = analysis.profitability;
  return (
    <div>
      {p.roeWarning && (
        <div className="mb-3 text-[11px] text-yellow-700 dark:text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2 flex gap-2">
          <AlertTriangle size={13} className="shrink-0 mt-0.5" />
          {t(`fa.roe.warning.${p.roeWarning}`)}
        </div>
      )}
      <table className="w-full text-sm">
        <thead><MetricTableHeader t={t} /></thead>
        <tbody className="divide-y divide-border/40">
          <MetricRow label={t('fa.metric.grossMargin')} value={<span className={pctColor(p.grossMarginTtm)}>{fmtPctRaw(p.grossMarginTtm)}</span>} sub={`3Y avg: ${fmtPctRaw(p.grossMargin3yAvg)}`} peerMedian={p.peerGrossMarginMedian} trend={p.grossMarginTrend} tooltip="Gross profit as % of revenue." />
          <MetricRow label={t('fa.metric.opMargin')} value={<span className={pctColor(p.operatingMarginTtm)}>{fmtPctRaw(p.operatingMarginTtm)}</span>} sub={`3Y avg: ${fmtPctRaw(p.operatingMargin3yAvg)}`} peerMedian={p.peerOperatingMarginMedian} trend={p.operatingMarginTrend} tooltip="Operating income as % of revenue." />
          <MetricRow label={t('fa.metric.ebitdaMargin')} value={<span className={pctColor(p.ebitdaMarginTtm)}>{fmtPctRaw(p.ebitdaMarginTtm)}</span>} trend={null} />
          <MetricRow label={t('fa.metric.netMargin')} value={<span className={pctColor(p.netMarginTtm)}>{fmtPctRaw(p.netMarginTtm)}</span>} sub={`3Y avg: ${fmtPctRaw(p.netMargin3yAvg)}`} trend={p.netMarginTrend} />
          <MetricRow label={t('fa.metric.fcfMargin')} value={<span className={pctColor(p.fcfMarginTtm)}>{fmtPctRaw(p.fcfMarginTtm)}</span>} />
          <MetricRow label={t('fa.metric.roa')} value={<span className={pctColor(p.roa)}>{fmtPctRaw(p.roa)}</span>} tooltip="Net income / average total assets." />
          <MetricRow label={t('fa.metric.roe')} value={<span className={pctColor(p.roe)}>{fmtPctRaw(p.roe)}</span>} tooltip="Net income / average shareholders' equity." />
          <MetricRow label={t('fa.metric.roic')} value={<span className={pctColor(p.roic)}>{fmtPctRaw(p.roic)}</span>} peerMedian={p.peerRoicMedian} tooltip="NOPAT / average invested capital." />
        </tbody>
      </table>
    </div>
  );
}

// ── Cash flow tab ─────────────────────────────────────────────────────────────

function CashFlowTab({ analysis, t, language }: { analysis: FundamentalAnalysis; t: (k: string) => string; language: string }) {
  const cf = analysis.cashFlow;
  const eqColor: Record<string, string> = {
    high: 'text-emerald-700 bg-emerald-500/10 border-emerald-500/20',
    adequate: 'text-yellow-700 bg-yellow-500/10 border-yellow-500/20',
    weak: 'text-orange-700 bg-orange-500/10 border-orange-500/20',
    very_weak: 'text-red-700 bg-red-500/10 border-red-500/20',
  };
  return (
    <div>
      <table className="w-full text-sm mb-4">
        <thead>
          <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border/60">
            <th className="pb-1.5 pr-3 text-left font-medium">{t('fa.col.metric')}</th>
            <th className="pb-1.5 text-left font-medium">{t('fa.col.current')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {[
            { l: t('fa.metric.ocfTtm'), v: fmtMoney(cf.ocfTtm), good: cf.ocfTtm != null && cf.ocfTtm > 0 },
            { l: t('fa.metric.capex'), v: fmtMoney(cf.capexTtm), good: null },
            { l: t('fa.metric.fcfTtm'), v: fmtMoney(cf.fcfTtm), good: cf.fcfTtm != null && cf.fcfTtm > 0 },
            { l: t('fa.metric.fcfPerShare'), v: fmtN(cf.fcfPerShareTtm, 2), good: null },
            { l: t('fa.metric.fcfMargin'), v: fmtPctRaw(cf.fcfMarginTtm), good: cf.fcfMarginTtm != null && cf.fcfMarginTtm > 0 },
            { l: t('fa.metric.cashConversion'), v: fmtN(cf.cashConversionRatio, 2), good: cf.cashConversionRatio != null && cf.cashConversionRatio > 1 },
            { l: t('fa.metric.sbcRev'), v: fmtPctRaw(cf.sbcToRevenueTtm), good: cf.sbcToRevenueTtm != null && cf.sbcToRevenueTtm < 5 },
          ].map(({ l, v, good }) => (
            <tr key={l} className="hover:bg-muted/20">
              <td className="py-2.5 pr-3 text-xs text-muted-foreground">{l}</td>
              <td className={`py-2.5 text-xs font-medium ${good == null ? '' : good ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs ${eqColor[cf.earningsQuality] ?? ''}`}>
        <span className="font-semibold">{t('fa.metric.earningsQuality')}:</span>
        <span className="font-bold">{t(`fa.eq.${cf.earningsQuality}`)}</span>
      </div>
    </div>
  );
}

// ── Balance sheet tab ─────────────────────────────────────────────────────────

function BalanceTab({ analysis, t }: { analysis: FundamentalAnalysis; t: (k: string) => string }) {
  const fs = analysis.financialStrength;
  const ce = analysis.capitalEfficiency;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t('fa.section.strength')}</h4>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-border/40">
            {[
              { l: t('fa.metric.cash'), v: fmtMoney(fs.cash) },
              { l: t('fa.metric.totalDebt'), v: fmtMoney(fs.totalDebt) },
              { l: t('fa.metric.netDebt'), v: fs.isNetCash ? <span className="text-emerald-600 font-semibold">{t('fa.netCash')}</span> : fmtMoney(fs.netDebt) },
              { l: t('fa.metric.de'), v: fmtN(fs.debtToEquity, 2), warn: fs.debtToEquity != null && fs.debtToEquity > 3 },
              { l: t('fa.metric.ndEbitda'), v: fs.netDebtToEbitdaIsNm ? 'N/M' : fmtN(fs.netDebtToEbitda, 2), warn: fs.netDebtToEbitda != null && !fs.netDebtToEbitdaIsNm && fs.netDebtToEbitda > 4 },
              { l: t('fa.metric.currentRatio'), v: fmtN(fs.currentRatio, 2), warn: fs.currentRatio != null && fs.currentRatio < 1 },
              { l: t('fa.metric.quickRatio'), v: fmtN(fs.quickRatio, 2), warn: fs.quickRatio != null && fs.quickRatio < 0.7 },
              { l: t('fa.metric.intCoverage'), v: fmtX(fs.interestCoverage), warn: fs.interestCoverage != null && fs.interestCoverage > 0 && fs.interestCoverage < 2 },
              { l: t('fa.metric.goodwillAssets'), v: fmtPctRaw(fs.goodwillToAssets), warn: fs.goodwillToAssets != null && fs.goodwillToAssets > 40 },
            ].map(({ l, v, warn }) => (
              <tr key={l} className="hover:bg-muted/20">
                <td className="py-2 pr-3 text-xs text-muted-foreground">{l}</td>
                <td className={`py-2 text-xs font-medium ${warn ? 'text-orange-600 dark:text-orange-400' : ''}`}>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t('fa.section.efficiency')}</h4>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-border/40">
            {[
              { l: t('fa.metric.roic'), v: fmtPctRaw(ce.roic) },
              { l: t('fa.metric.assetTurnover'), v: fmtX(ce.assetTurnover, 2) },
              { l: t('fa.metric.dso'), v: ce.dso != null ? `${fmtN(ce.dso, 0)} days` : '—' },
              { l: t('fa.metric.dio'), v: ce.dio != null ? `${fmtN(ce.dio, 0)} days` : '—' },
              { l: t('fa.metric.dpo'), v: ce.dpo != null ? `${fmtN(ce.dpo, 0)} days` : '—' },
              { l: t('fa.metric.ccc'), v: ce.cashConversionCycle != null ? `${fmtN(ce.cashConversionCycle, 0)} days` : '—' },
            ].map(({ l, v }) => (
              <tr key={l} className="hover:bg-muted/20">
                <td className="py-2 pr-3 text-xs text-muted-foreground">{l}</td>
                <td className="py-2 text-xs font-medium">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Valuation tab ─────────────────────────────────────────────────────────────

function ValuationTab({ analysis, t, language }: { analysis: FundamentalAnalysis; t: (k: string) => string; language: string }) {
  const v = analysis.valuation;
  const mx = v.valuationMatrix;
  const quadrantColors: Record<string, string> = {
    quality_cheap: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400',
    quality_expensive: 'bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400',
    weak_cheap: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-700 dark:text-yellow-400',
    weak_expensive: 'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400',
  };
  const multiples: { label: string; m: ValuationMultiple; tooltip?: string }[] = [
    { label: t('fa.metric.pe'), m: v.pe, tooltip: 'Price / trailing twelve-month EPS.' },
    { label: t('fa.metric.forwardPe'), m: v.forwardPe, tooltip: 'Price / next twelve-month consensus EPS.' },
    { label: t('fa.metric.ps'), m: v.ps },
    { label: t('fa.metric.pb'), m: v.pb },
    { label: t('fa.metric.pFcf'), m: v.pFcf },
    { label: t('fa.metric.evRev'), m: v.evRevenue },
    { label: t('fa.metric.evEbitda'), m: v.evEbitda },
    { label: t('fa.metric.evEbit'), m: v.evEbit },
  ];
  return (
    <div>
      <div className={`mb-4 rounded-lg border px-3 py-2.5 text-xs font-medium ${quadrantColors[mx.quadrant]}`}>
        <div className="font-bold mb-0.5">{t('fa.matrix.title')}</div>
        {language === 'it' ? mx.labelIt : mx.label}
      </div>
      <table className="w-full text-sm mb-4">
        <thead>
          <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border/60">
            <th className="pb-1.5 pr-3 text-left font-medium">{t('fa.col.metric')}</th>
            <th className="pb-1.5 pr-3 text-left font-medium">{t('fa.col.current')}</th>
            <th className="pb-1.5 pr-3 text-left font-medium">{t('fa.col.peerMedian')}</th>
            <th className="pb-1.5 pr-3 text-left font-medium">{t('fa.col.vsPeers')}</th>
            <th className="pb-1.5 text-left font-medium">{t('fa.col.vsHistory')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {multiples.map(({ label, m, tooltip }) => (
            <ValMetricRow key={label} label={label} value={m.value} peerMedian={m.peerMedian} vsPeers={m.vsPeers} vsHistory3y={m.vsHistory3y} tooltip={tooltip} />
          ))}
        </tbody>
      </table>
      <div className="grid grid-cols-3 gap-2 text-xs border-t border-border/40 pt-3">
        {v.dividendYield != null && (
          <div><div className="text-muted-foreground">{t('fa.metric.divYield')}</div><div className="font-semibold">{fmtPctRaw(v.dividendYield)}</div></div>
        )}
        {v.buybackYield != null && (
          <div><div className="text-muted-foreground">{t('fa.metric.buybackYield')}</div><div className="font-semibold">{fmtPctRaw(v.buybackYield)}</div></div>
        )}
        {v.dilution1y != null && (
          <div>
            <div className="text-muted-foreground">{t('fa.metric.dilution1y')}</div>
            <div className={`font-semibold ${v.dilution1y > 3 ? 'text-orange-500' : ''}`}>{fmtPct(v.dilution1y)}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Competitors tab ───────────────────────────────────────────────────────────

function CompetitorsTab({ analysis, t, language }: { analysis: FundamentalAnalysis; t: (k: string) => string; language: string }) {
  const { peers } = analysis;
  if (!peers.peers.length) {
    return (
      <p className="text-sm text-muted-foreground">
        {language === 'it'
          ? 'Peer group insufficiente per un confronto affidabile.'
          : 'Peer group insufficient for a reliable comparison.'}
      </p>
    );
  }
  const cols: { key: keyof PeerCompanyData; label: string; fmt: (v: number | null | undefined) => string }[] = [
    { key: 'marketCap', label: t('fa.peers.mktCap'), fmt: fmtMoney },
    { key: 'revenueGrowthYoy', label: t('fa.peers.revGrowth'), fmt: (v) => fmtPct(v) },
    { key: 'grossMargin', label: t('fa.peers.grossMargin'), fmt: fmtPctRaw },
    { key: 'operatingMargin', label: t('fa.peers.opMargin'), fmt: fmtPctRaw },
    { key: 'roic', label: t('fa.peers.roic'), fmt: fmtPctRaw },
    { key: 'pe', label: t('fa.peers.pe'), fmt: fmtX },
    { key: 'evToEbitda', label: t('fa.peers.evEbitda'), fmt: fmtX },
    { key: 'evToSales', label: t('fa.peers.evSales'), fmt: fmtX },
  ];
  const subject: PeerCompanyData = {
    symbol: analysis.symbol,
    name: analysis.name,
    marketCap: analysis.marketCap,
    revenueGrowthYoy: analysis.growth.revenueYoy.isNm ? null : analysis.growth.revenueYoy.value,
    grossMargin: analysis.profitability.grossMarginTtm,
    operatingMargin: analysis.profitability.operatingMarginTtm,
    fcfMargin: analysis.profitability.fcfMarginTtm,
    roic: analysis.profitability.roic,
    netDebtToEbitda: analysis.financialStrength.netDebtToEbitda,
    pe: analysis.valuation.pe.value,
    evToEbitda: analysis.valuation.evEbitda.value,
    evToSales: analysis.valuation.evRevenue.value,
    priceToFcf: analysis.valuation.pFcf.value,
  };
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs min-w-[600px]">
        <thead>
          <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border/60">
            <th className="pb-2 pr-3 text-left font-medium">{t('fa.peers.symbol')}</th>
            {cols.map(c => (
              <th key={c.key} className="pb-2 pr-3 text-right font-medium">{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          <tr className="bg-primary/5 border-primary/20 font-medium">
            <td className="py-2 pr-3 font-mono font-bold text-primary">{analysis.symbol} ★</td>
            {cols.map(c => (
              <td key={c.key} className="py-2 pr-3 text-right text-foreground font-semibold">
                {c.fmt(subject[c.key] as number | null)}
              </td>
            ))}
          </tr>
          {peers.peers.map(peer => (
            <tr key={peer.symbol} className="hover:bg-muted/20">
              <td className="py-2 pr-3 font-mono font-semibold">{peer.symbol}</td>
              {cols.map(c => (
                <td key={c.key} className="py-2 pr-3 text-right text-muted-foreground">
                  {c.fmt(peer[c.key] as number | null)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Risks tab ─────────────────────────────────────────────────────────────────

function RisksTab({ analysis, t, language }: { analysis: FundamentalAnalysis; t: (k: string) => string; language: string }) {
  return (
    <div className="space-y-3">
      {analysis.redFlags.length === 0 && analysis.strengths.length === 0 && (
        <p className="text-sm text-muted-foreground">{t('fa.flags.none')}</p>
      )}
      {analysis.redFlags.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t('fa.section.flags')}</h4>
          {analysis.redFlags.map(flag => (
            <div key={flag.key} className={`rounded-lg border px-3 py-2.5 text-xs ${severityColor(flag.severity)}`}>
              <div className="flex items-center justify-between mb-1 gap-2">
                <span className="font-semibold">{language === 'it' ? flag.titleIt : flag.titleEn}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0">{t(`fa.flag.${flag.severity}`)}</span>
              </div>
              <div className="font-mono text-[10px] opacity-70 mb-1">{flag.dataPoint}</div>
              <div className="opacity-80 leading-relaxed">{language === 'it' ? flag.explanationIt : flag.explanationEn}</div>
            </div>
          ))}
        </div>
      )}
      {analysis.strengths.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 mb-2 mt-4">{t('fa.section.strengths')}</h4>
          {analysis.strengths.map(s => (
            <div key={s.key} className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5 text-xs text-emerald-700 dark:text-emerald-400">
              <div className="flex items-center gap-1.5 mb-1">
                <CheckCircle2 size={12} className="shrink-0" />
                <span className="font-semibold">{language === 'it' ? s.titleIt : s.titleEn}</span>
              </div>
              <div className="font-mono text-[10px] opacity-70 mb-1">{s.dataPoint}</div>
              <div className="opacity-80 leading-relaxed">{language === 'it' ? s.explanationIt : s.explanationEn}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPANY HEADER
// ─────────────────────────────────────────────────────────────────────────────

function CompanyHeader({ analysis, t, language }: {
  analysis: FundamentalAnalysis; t: (k: string) => string; language: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl px-5 py-4 flex flex-wrap items-center gap-4">
      {analysis.logoUrl && (
        <img
          src={analysis.logoUrl}
          alt={analysis.name}
          className="w-10 h-10 rounded-lg object-contain border border-border bg-background p-1 shrink-0"
          onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
        />
      )}

      {/* Name / sector */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-xl font-bold font-mono">{analysis.symbol}</span>
          <span className="text-sm text-muted-foreground truncate max-w-[280px]">{analysis.name}</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap mt-0.5">
          {analysis.sector && (
            <span className="text-[11px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{analysis.sector}</span>
          )}
          {analysis.industry && (
            <span className="text-[11px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{analysis.industry}</span>
          )}
          {analysis.country && (
            <span className="text-[11px] text-muted-foreground">{analysis.country}</span>
          )}
        </div>
      </div>

      {/* Price + metrics */}
      <div className="flex items-center gap-5 flex-wrap">
        <div>
          <div className="text-lg font-bold font-mono tabular-nums">
            {analysis.currency} {fmtN(analysis.lastPrice, 2)}
          </div>
          <div className="text-[11px] text-muted-foreground">{analysis.exchange}</div>
        </div>
        {analysis.marketCap != null && (
          <div>
            <div className="text-sm font-semibold tabular-nums">{fmtMoney(analysis.marketCap)}</div>
            <div className="text-[11px] text-muted-foreground">Market Cap</div>
          </div>
        )}
        {analysis.enterpriseValue != null && (
          <div>
            <div className="text-sm font-semibold tabular-nums">{fmtMoney(analysis.enterpriseValue)}</div>
            <div className="text-[11px] text-muted-foreground">EV</div>
          </div>
        )}
        {analysis.lastFilingDate && (
          <div>
            <div className="text-xs font-medium">{analysis.lastFilingDate.slice(0, 10)}</div>
            <div className="text-[11px] text-muted-foreground">{t('fa.lastFiling')}</div>
          </div>
        )}
        <CoverageBadge
          tier={coverageTier(analysis.dataCoverage.coveragePct)}
          pct={analysis.dataCoverage.coveragePct}
          t={t}
          language={language}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HISTORICAL MINI CHART (used in tabs only)
// ─────────────────────────────────────────────────────────────────────────────

function HistoryBarChart({ data, label, isMoney = true, isPct = false, height = 140 }: {
  data: HistoricalDataPoint[]; label: string; isMoney?: boolean; isPct?: boolean; height?: number;
}) {
  if (!data.length) return null;
  const chartData = data.map(d => ({ year: d.year, value: d.value }));
  const fmt = (v: number) => isPct ? `${v.toFixed(1)}%` : isMoney ? fmtMoney(v) : v.toFixed(2);
  return (
    <div>
      <div className="text-xs text-muted-foreground font-medium mb-1.5">{label}</div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <XAxis dataKey="year" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
          <YAxis hide />
          <RechartsTooltip formatter={(v: number) => [fmt(v), label]} contentStyle={{ fontSize: 11 }} />
          <ReferenceLine y={0} stroke="#e5e7eb" strokeWidth={1} />
          <Bar dataKey="value" radius={[2, 2, 0, 0]}>
            {chartData.map((d, i) => (
              <Cell key={i} fill={d.value == null ? '#e5e7eb' : d.value >= 0 ? '#10b981' : '#ef4444'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function FundamentalAnalysisPage() {
  const { t, language } = useTranslation();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery] = useDebounce(searchQuery, 300);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

  const { data: searchResults, isLoading: isSearching } = useSearchTickers(
    { query: debouncedQuery },
    { query: { enabled: debouncedQuery.length > 0, queryKey: getSearchTickersQueryKey({ query: debouncedQuery }) } },
  );

  const { data: analysis, isLoading: isAnalyzing, isError } = useGetFundamentalAnalysis(
    { symbol: selectedSymbol ?? '', language },
    {
      query: {
        enabled: !!selectedSymbol,
        queryKey: getGetFundamentalAnalysisQueryKey({ symbol: selectedSymbol ?? '', language }),
      },
    },
  );

  const selectSymbol = (s: string) => {
    queryClient.removeQueries({
      queryKey: getGetFundamentalAnalysisQueryKey({ symbol: s, language }),
    });
    setSelectedSymbol(s);
    setSearchQuery('');
  };

  return (
    <Layout>
      <div className="py-6 space-y-4 max-h-[calc(100vh-64px)] overflow-y-auto">

        {/* ── Search bar ──────────────────────────────────────────────────── */}
        <div className="relative z-20 w-full md:max-w-lg">
          <div className="relative flex items-center">
            <Search className="absolute left-3 text-muted-foreground w-4 h-4" />
            <input
              type="text"
              placeholder={t('fa.search.placeholder')}
              className="w-full h-11 pl-9 pr-4 bg-card border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 text-muted-foreground hover:text-foreground">
                <X size={14} />
              </button>
            )}
          </div>
          {debouncedQuery.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-lg shadow-xl overflow-hidden max-h-64 overflow-y-auto">
              {isSearching ? (
                <div className="p-4 text-center text-sm text-muted-foreground">{t('fa.search.loading')}</div>
              ) : searchResults && searchResults.length > 0 ? (
                searchResults.map(r => (
                  <button
                    key={r.symbol}
                    className="w-full text-left px-4 py-3 hover:bg-accent flex items-center justify-between border-b border-border/50 last:border-0"
                    onClick={() => selectSymbol(r.symbol)}
                  >
                    <div>
                      <span className="font-bold text-foreground text-sm">{r.symbol}</span>
                      <span className="ml-2 text-xs text-muted-foreground line-clamp-1">{r.name}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground bg-muted px-2 py-1 rounded-sm ml-2 shrink-0">{r.exchange}</span>
                  </button>
                ))
              ) : (
                <div className="p-4 text-center text-sm text-muted-foreground">{t('fa.search.empty')}</div>
              )}
            </div>
          )}
        </div>

        {/* ── Empty state ──────────────────────────────────────────────────── */}
        {!selectedSymbol && (
          <div className="flex items-center justify-center py-24">
            <div className="text-center max-w-sm">
              <div className="w-14 h-14 rounded-full bg-muted/50 mx-auto mb-4 flex items-center justify-center">
                <Search size={24} className="text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">{t('fa.noSymbol')}</p>
            </div>
          </div>
        )}

        {/* ── Loading ──────────────────────────────────────────────────────── */}
        {selectedSymbol && isAnalyzing && (
          <div className="flex items-center justify-center py-24">
            <div className="text-center max-w-md bg-card border border-border rounded-2xl p-8 shadow-sm">
              <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-5" />
              <p className="font-semibold text-foreground mb-1">
                {language === 'it' ? 'Analisi di' : 'Analysing'}{' '}
                <span className="text-primary font-mono">{selectedSymbol}</span>
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">{t('fa.loading')}</p>
              <p className="text-[11px] text-muted-foreground/50">
                {language === 'it' ? 'Circa 30–60 secondi' : 'Takes about 30–60 seconds'}
              </p>
            </div>
          </div>
        )}

        {/* ── Error ────────────────────────────────────────────────────────── */}
        {selectedSymbol && isError && (
          <div className="flex items-center justify-center py-16">
            <div className="text-center max-w-sm bg-destructive/5 border border-destructive/20 rounded-xl p-6">
              <AlertTriangle size={24} className="text-destructive mx-auto mb-3" />
              <p className="text-sm text-foreground font-medium mb-1">{t('fa.error')}</p>
            </div>
          </div>
        )}

        {/* ── Main content ─────────────────────────────────────────────────── */}
        {analysis && !isAnalyzing && (
          <div className="space-y-4">

            {/* 1. Company header */}
            <CompanyHeader analysis={analysis} t={t} language={language} />

            {/* 2. Coverage warning (insufficient only) */}
            {coverageTier(analysis.dataCoverage.coveragePct) === 'insufficient' && (
              <div className="flex items-start gap-3 rounded-xl border border-orange-500/20 bg-orange-500/5 px-4 py-3 text-sm">
                <AlertTriangle size={16} className="text-orange-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-foreground">
                    {language === 'it'
                      ? `Dati insufficienti per un'analisi fondamentale affidabile.`
                      : `Insufficient data for a reliable fundamental analysis.`}
                  </span>{' '}
                  <span className="text-muted-foreground text-xs">
                    {language === 'it'
                      ? `Disponibili ${analysis.dataCoverage.coveragePct.toFixed(0)}% delle metriche necessarie. Le analisi con classificazioni e score non sono mostrate.`
                      : `${analysis.dataCoverage.coveragePct.toFixed(0)}% of required metrics available. Scores and classifications are not shown.`}
                  </span>
                </div>
              </div>
            )}

            {/* 3. 5 Key signal cards */}
            <div>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {language === 'it' ? 'I 5 indicatori chiave' : '5 Key Fundamental Signals'}
              </h2>
              <KeySignalCards analysis={analysis} t={t} language={language} />
            </div>

            {/* 4. Business Performance chart */}
            <BusinessPerformanceChart analysis={analysis} t={t} language={language} />

            {/* 5. Valuation vs History chart */}
            <ValuationSnapshotChart analysis={analysis} t={t} language={language} />

            {/* 6. AI panel (compact) */}
            <CompactAIPanel analysis={analysis} t={t} language={language} />

            {/* 7. Secondary tabs */}
            <SecondaryTabs analysis={analysis} t={t} language={language} />

            {/* Disclaimer */}
            <p className="text-[10px] text-muted-foreground/50 leading-relaxed pb-4">
              {t('fa.disclaimer')}
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
