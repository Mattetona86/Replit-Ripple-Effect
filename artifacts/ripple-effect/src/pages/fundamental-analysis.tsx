/**
 * Analisi Fondamentale — Full redesign
 *
 * Layout:
 * 1. Search bar
 * 2. Company header with per-category data confidence matrix
 * 3. "Our Take" AI verdict block (headline + 80-word summary + catalysts/risks)
 * 4. 4 Investment snapshot cards
 * 5. Price vs Business chart (real price + EPS/RevPerShare/FCFPerShare, indexed 100)
 * 6. Valuation vs History chart
 * 7. News Momentum section (or "unavailable")
 * 8. Catalysts & Risks two columns (AI output)
 * 9. Financial detail tabs (Growth / Profitability / CF / Balance / Valuation)
 * 10. Methodology disclaimer
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
  Info,
  BarChart2,
  X,
  Newspaper,
  ExternalLink,
} from 'lucide-react';
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

function fmtTimeAgo(iso: string, language: string): string {
  try {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const h = Math.floor(diff / 3600000);
    if (h < 24) return language === 'it' ? `${h}h fa` : `${h}h ago`;
    const days = Math.floor(h / 24);
    if (days < 7) return language === 'it' ? `${days}g fa` : `${days}d ago`;
    return d.toLocaleDateString(language === 'it' ? 'it-IT' : 'en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Color helpers
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

function SignalCard({ title, children, subtitle }: {
  title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-2.5 min-h-[170px]">
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

// ─────────────────────────────────────────────────────────────────────────────
// Data confidence matrix (per-category dots)
// ─────────────────────────────────────────────────────────────────────────────

type ConfidenceLevel = 'high' | 'medium' | 'low' | 'unavailable';

function confidenceDotClass(level: ConfidenceLevel): string {
  if (level === 'high') return 'bg-emerald-500';
  if (level === 'medium') return 'bg-yellow-500';
  if (level === 'low') return 'bg-orange-500';
  return 'bg-muted-foreground/30';
}

function DataConfidenceMatrixBadges({ analysis, language }: {
  analysis: FundamentalAnalysis; language: string;
}) {
  const dcm = analysis.dataConfidenceMatrix;
  if (!dcm) return null;

  const it = language === 'it';
  const categories: { id: string; label: string; level: ConfidenceLevel }[] = [
    { id: 'financialStatements', label: it ? 'Bilanci' : 'Financials', level: dcm.financialStatements as ConfidenceLevel },
    { id: 'historicalPrices', label: it ? 'Prezzi' : 'Prices', level: dcm.historicalPrices as ConfidenceLevel },
    { id: 'historicalValuation', label: it ? 'Val. storica' : 'Val. history', level: dcm.historicalValuation as ConfidenceLevel },
    { id: 'peerData', label: it ? 'Peer' : 'Peers', level: dcm.peerData as ConfidenceLevel },
    { id: 'newsData', label: it ? 'News' : 'News', level: dcm.newsData as ConfidenceLevel },
  ];

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider shrink-0">
        {it ? 'Dati' : 'Data'}
      </span>
      {categories.map(({ id, label, level }) => (
        <Tooltip key={id}>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 cursor-default">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${confidenceDotClass(level)}`} />
              <span className="text-[10px] text-muted-foreground">{label}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent className="text-xs capitalize">
            {level === 'unavailable' ? (it ? 'Non disponibile' : 'Unavailable') : level}
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPANY HEADER
// ─────────────────────────────────────────────────────────────────────────────

function CompanyHeader({ analysis, language }: {
  analysis: FundamentalAnalysis; language: string;
}) {
  const pvb = analysis.priceVsBusiness;
  return (
    <div className="bg-card border border-border rounded-xl px-5 py-4 space-y-3">
      <div className="flex flex-wrap items-center gap-4">
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
            {pvb?.priceChange1y != null && (
              <div className={`text-[11px] font-medium ${pctColor(pvb.priceChange1y)}`}>
                {fmtPct(pvb.priceChange1y)} {language === 'it' ? '(1A)' : '(1Y)'}
              </div>
            )}
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
              <div className="text-[11px] text-muted-foreground">{language === 'it' ? 'Ultima filing' : 'Last filing'}</div>
            </div>
          )}
        </div>
      </div>

      {/* Data confidence matrix */}
      {analysis.dataConfidenceMatrix && (
        <DataConfidenceMatrixBadges analysis={analysis} language={language} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OUR TAKE block — AI verdict
// ─────────────────────────────────────────────────────────────────────────────

function OurTakeBlock({ analysis, language }: {
  analysis: FundamentalAnalysis; language: string;
}) {
  const exp = analysis.explanation;
  const it = language === 'it';

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      {/* Headline */}
      <p className="text-base font-bold text-foreground leading-snug">{exp.headline}</p>

      {/* Our Take paragraph */}
      <p className="text-sm text-foreground/85 leading-relaxed">{exp.ourTake}</p>

      {/* 4 one-liners */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {[
          { icon: '📈', label: it ? 'Business' : 'Business', text: exp.businessLine, neutral: true },
          { icon: '🔢', label: it ? 'Valutazione' : 'Valuation', text: exp.valuationLine, neutral: true },
          { icon: '⚡', label: it ? 'Momentum' : 'Momentum', text: exp.momentumLine, neutral: true },
          { icon: '⚠️', label: it ? 'Rischio principale' : 'Main risk', text: exp.mainRisk, risk: true },
        ].map(({ icon, label, text, risk }) => (
          <div key={label} className={`flex items-start gap-2.5 rounded-lg px-3 py-2 border ${risk ? 'border-orange-500/20 bg-orange-500/5' : 'border-border bg-muted/20'}`}>
            <span className="text-base shrink-0 mt-px">{icon}</span>
            <div className="min-w-0">
              <div className={`text-[10px] font-semibold uppercase tracking-wider mb-0.5 ${risk ? 'text-orange-600 dark:text-orange-400' : 'text-muted-foreground'}`}>
                {label}
              </div>
              <p className="text-xs text-foreground/85 leading-snug">{text}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Metrics to watch */}
      {exp.metricsToWatch?.length > 0 && (
        <div className="border-t border-border/40 pt-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            {it ? 'Metriche da monitorare' : 'Metrics to Watch'}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {exp.metricsToWatch.map((m, i) => (
              <span key={i} className="text-xs px-2.5 py-0.5 bg-muted rounded-full text-muted-foreground border border-border">
                {m}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-[10px] text-muted-foreground/50 leading-relaxed border-t border-border/30 pt-3">
        {exp.disclaimer}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4 INVESTMENT SNAPSHOT CARDS
// ─────────────────────────────────────────────────────────────────────────────

function KeySignalCards({ analysis, language }: {
  analysis: FundamentalAnalysis; language: string;
}) {
  const { growth, profitability, valuation, financialStrength } = analysis;
  const pvb = analysis.priceVsBusiness;
  const news = analysis.newsMomentum;
  const it = language === 'it';

  // Business Trend verdict
  function businessTrendLabel(): { label: string; color: string } {
    const ry = growth.revenueYoy.isNm ? null : growth.revenueYoy.value;
    const ey = growth.epsYoy.isNm ? null : growth.epsYoy.value;
    const fy = growth.fcfYoy.isNm ? null : growth.fcfYoy.value;
    const pos = [ry, ey, fy].filter(v => v != null && v > 0).length;
    const neg = [ry, ey, fy].filter(v => v != null && v < 0).length;
    if (pos >= 2 && ry != null && ry > 15) return { label: it ? 'Accelerazione' : 'Accelerating', color: 'text-emerald-600' };
    if (pos >= 2) return { label: it ? 'Crescita' : 'Growing', color: 'text-emerald-500' };
    if (neg >= 2) return { label: it ? 'Contrazione' : 'Contracting', color: 'text-red-500' };
    if (pos >= 1) return { label: it ? 'Misto' : 'Mixed', color: 'text-muted-foreground' };
    return { label: it ? 'Dati insufficienti' : 'Insufficient data', color: 'text-muted-foreground' };
  }

  // Primary valuation multiple
  const primaryMultiple =
    valuation.pe.value != null && valuation.pe.value > 0 && valuation.pe.value < 200
      ? { label: 'P/E', m: valuation.pe }
      : valuation.evEbitda.value != null && valuation.evEbitda.value > 0
        ? { label: 'EV/EBITDA', m: valuation.evEbitda }
        : valuation.pFcf.value != null && valuation.pFcf.value > 0
          ? { label: 'P/FCF', m: valuation.pFcf }
          : null;

  const bt = businessTrendLabel();

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {/* Card 1 — Business Trend */}
      <SignalCard title={it ? 'Trend Business' : 'Business Trend'}>
        <SignalRow
          label={it ? 'Ricavi YoY' : 'Revenue YoY'}
          value={growth.revenueYoy.isNm ? 'N/M' : fmtPct(growth.revenueYoy.value)}
          valueClass={growth.revenueYoy.isNm ? 'text-muted-foreground' : pctColor(growth.revenueYoy.value)}
        />
        <SignalRow
          label={it ? 'EPS YoY' : 'EPS YoY'}
          value={growth.epsYoy.isNm ? 'N/M' : fmtPct(growth.epsYoy.value)}
          valueClass={growth.epsYoy.isNm ? 'text-muted-foreground' : pctColor(growth.epsYoy.value)}
        />
        <SignalRow
          label={it ? 'Margine op.' : 'Op. margin'}
          value={fmtPctRaw(profitability.operatingMarginTtm)}
        />
        <SignalRow
          label={it ? 'FCF YoY' : 'FCF YoY'}
          value={growth.fcfYoy.isNm ? 'N/M' : fmtPct(growth.fcfYoy.value)}
          valueClass={growth.fcfYoy.isNm ? 'text-muted-foreground' : pctColor(growth.fcfYoy.value)}
        />
        <div className="mt-auto pt-2 border-t border-border/40">
          <span className={`text-[11px] font-semibold ${bt.color}`}>{bt.label}</span>
        </div>
      </SignalCard>

      {/* Card 2 — Price vs Business */}
      <SignalCard title={it ? 'Prezzo vs Business' : 'Price vs Business'}>
        {pvb?.available ? (
          <>
            <SignalRow
              label={it ? 'Prezzo 1A' : 'Price 1Y'}
              value={fmtPct(pvb.priceChange1y)}
              valueClass={pctColor(pvb.priceChange1y)}
            />
            <SignalRow
              label={it ? 'Prezzo 3A' : 'Price 3Y'}
              value={fmtPct(pvb.priceChange3y)}
              valueClass={pctColor(pvb.priceChange3y)}
            />
            <SignalRow
              label={it ? 'Prezzo 5A' : 'Price 5Y'}
              value={fmtPct(pvb.priceChange5y)}
              valueClass={pctColor(pvb.priceChange5y)}
            />
            <SignalRow
              label={it ? 'Ricavi 3A CAGR' : 'Revenue 3Y CAGR'}
              value={growth.revenue3yCagr.isNm ? 'N/M' : fmtPct(growth.revenue3yCagr.value)}
              valueClass={growth.revenue3yCagr.isNm ? 'text-muted-foreground' : pctColor(growth.revenue3yCagr.value)}
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-1.5 py-2">
            <BarChart2 size={18} className="text-muted-foreground opacity-30" />
            <p className="text-[10px] text-muted-foreground text-center">
              {it ? 'Prezzi storici non disponibili' : 'Historical prices unavailable'}
            </p>
          </div>
        )}
      </SignalCard>

      {/* Card 3 — Valuation */}
      <SignalCard title={it ? 'Valutazione' : 'Valuation'}
        subtitle={primaryMultiple ? primaryMultiple.label : undefined}>
        {primaryMultiple ? (
          <>
            <SignalRow label={it ? 'Attuale' : 'Current'} value={fmtX(primaryMultiple.m.value)} />
            <SignalRow label={it ? 'Mediana 5A' : '5Y median'} value={fmtX(primaryMultiple.m.historicalMedian5y)} />
            <SignalRow label="P/E" value={fmtX(valuation.pe.value)} />
            <SignalRow label="EV/EBITDA" value={fmtX(valuation.evEbitda.value)} />
            {primaryMultiple.m.vsHistory3y != null && (
              <div className="mt-auto pt-2 border-t border-border/40">
                <span className={`text-[11px] font-semibold ${pctColor(primaryMultiple.m.vsHistory3y, false)}`}>
                  {primaryMultiple.m.vsHistory3y > 0 ? '+' : ''}{primaryMultiple.m.vsHistory3y.toFixed(0)}% {it ? 'vs storia 3A' : 'vs 3Y history'}
                </span>
              </div>
            )}
          </>
        ) : (
          <p className="text-xs text-muted-foreground">{it ? 'N/D' : 'N/A'}</p>
        )}
      </SignalCard>

      {/* Card 4 — News Momentum */}
      <SignalCard title={it ? 'Momentum News' : 'News Momentum'}>
        {news?.available && news.items.length > 0 ? (
          <>
            <div className="flex items-center gap-1.5 mb-1">
              <Newspaper size={13} className="text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{news.items.length} {it ? 'articoli recenti' : 'recent articles'}</span>
            </div>
            {news.items.slice(0, 3).map((item, i) => (
              <div key={i} className="text-[10px] text-muted-foreground border-t border-border/30 pt-1.5 mt-1">
                <div className="line-clamp-2 leading-snug">{item.title}</div>
                <div className="text-muted-foreground/60 mt-0.5">{item.publisher}</div>
              </div>
            ))}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-1.5 py-2">
            <Newspaper size={18} className="text-muted-foreground opacity-30" />
            <p className="text-[10px] text-muted-foreground text-center">
              {it ? 'News non disponibili' : 'News unavailable'}
            </p>
          </div>
        )}
        <div className="mt-auto pt-2 border-t border-border/40">
          <SignalRow
            label={it ? 'Forza finanziaria' : 'Fin. strength'}
            value={financialStrength.isNetCash ? (it ? 'Cassa netta' : 'Net cash') : fmtX(financialStrength.netDebtToEbitdaIsNm ? null : financialStrength.netDebtToEbitda) + ' ND/EBITDA'}
            valueClass={financialStrength.isNetCash ? 'text-emerald-600' : ''}
          />
        </div>
      </SignalCard>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PRICE vs BUSINESS CHART (real price + per-share fundamentals, indexed to 100)
// ─────────────────────────────────────────────────────────────────────────────

type PvBSeries = 'price' | 'eps' | 'revPerShare' | 'fcfPerShare';
type PvBPeriod = '1Y' | '3Y' | '5Y' | 'Max';

const PVB_COLORS: Record<PvBSeries, string> = {
  price: '#3b82f6',
  eps: '#10b981',
  revPerShare: '#8b5cf6',
  fcfPerShare: '#f59e0b',
};

function PriceVsBusinessChart({ analysis, language }: {
  analysis: FundamentalAnalysis; language: string;
}) {
  const pvb = analysis.priceVsBusiness;
  const it = language === 'it';

  if (!pvb?.available || pvb.points.length < 2) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 text-center">
        <BarChart2 size={24} className="text-muted-foreground mx-auto mb-2 opacity-40" />
        <p className="text-sm font-semibold text-foreground mb-1">
          {it ? 'Dati di prezzo non disponibili' : 'Price history unavailable'}
        </p>
        <p className="text-xs text-muted-foreground">
          {it
            ? 'Sono necessari almeno 12 mesi di dati storici sui prezzi per costruire questo grafico.'
            : 'At least 12 months of historical price data are required to build this chart.'}
        </p>
      </div>
    );
  }

  const [period, setPeriod] = useState<PvBPeriod>('5Y');
  const [activeSeries, setActiveSeries] = useState<Set<PvBSeries>>(new Set(['price', 'eps']));

  const periods: PvBPeriod[] = ['1Y', '3Y', '5Y', 'Max'];

  const seriesLabels: Record<PvBSeries, string> = {
    price: it ? 'Prezzo' : 'Stock Price',
    eps: 'EPS',
    revPerShare: it ? 'Ricavi/Az.' : 'Revenue/Share',
    fcfPerShare: 'FCF/Share',
  };

  // Filter points by period
  const filteredPoints = useMemo(() => {
    if (!pvb?.points) return [];
    if (period === 'Max') return pvb.points;
    const yearsBack = period === '1Y' ? 1 : period === '3Y' ? 3 : 5;
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - yearsBack);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    // Always include at least 2 points
    const filtered = pvb.points.filter(p => p.date >= cutoffStr);
    return filtered.length >= 2 ? filtered : pvb.points.slice(-Math.max(2, yearsBack + 1));
  }, [pvb?.points, period]);

  // Index all series to 100 at first non-null point per series
  const chartData = useMemo(() => {
    const bases: Partial<Record<PvBSeries, number>> = {};
    for (const pt of filteredPoints) {
      if (!('price' in bases) && pt.price != null && pt.price > 0) bases.price = pt.price;
      if (!('eps' in bases) && pt.epsTtm != null && pt.epsTtm > 0) bases.eps = pt.epsTtm;
      if (!('revPerShare' in bases) && pt.revenuePerShare != null && pt.revenuePerShare > 0) bases.revPerShare = pt.revenuePerShare;
      if (!('fcfPerShare' in bases) && pt.fcfPerShare != null && Math.abs(pt.fcfPerShare) > 0.1) bases.fcfPerShare = pt.fcfPerShare;
    }
    return filteredPoints.map(pt => ({
      label: pt.label,
      price: bases.price && pt.price != null ? Math.round((pt.price / bases.price) * 1000) / 10 : null,
      eps: bases.eps && pt.epsTtm != null && pt.epsTtm > 0 ? Math.round((pt.epsTtm / bases.eps) * 1000) / 10 : null,
      revPerShare: bases.revPerShare && pt.revenuePerShare != null ? Math.round((pt.revenuePerShare / bases.revPerShare) * 1000) / 10 : null,
      fcfPerShare: bases.fcfPerShare && pt.fcfPerShare != null ? Math.round((pt.fcfPerShare / bases.fcfPerShare) * 1000) / 10 : null,
    }));
  }, [filteredPoints]);

  const toggleSeries = (s: PvBSeries) => {
    setActiveSeries(prev => {
      const next = new Set(prev);
      if (next.has(s) && next.size === 1) return prev;
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });
  };

  const title = it ? 'Il prezzo ha seguito il business?' : 'Has the price followed the business?';

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border/60 bg-muted/20 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-sm text-foreground">{title}</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {it
              ? 'Prezzo reale + fondamentali per azione, indicizzati a 100 all\'inizio del periodo'
              : 'Real price + per-share fundamentals, indexed to 100 at start of period'}
          </p>
        </div>
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
        {(Object.keys(PVB_COLORS) as PvBSeries[]).map(s => (
          <button
            key={s}
            onClick={() => toggleSeries(s)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border transition-all ${
              activeSeries.has(s)
                ? 'border-transparent font-medium'
                : 'border-border text-muted-foreground'
            }`}
            style={activeSeries.has(s) ? {
              backgroundColor: PVB_COLORS[s] + '18',
              color: PVB_COLORS[s],
              borderColor: PVB_COLORS[s] + '40',
            } : undefined}
          >
            <span className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: activeSeries.has(s) ? PVB_COLORS[s] : '#d1d5db' }} />
            {seriesLabels[s]}
          </button>
        ))}
      </div>

      <div className="px-4 pt-2 pb-4">
        {chartData.length < 2 ? (
          <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
            {it ? 'Dati insufficienti per il periodo selezionato' : 'Insufficient data for selected period'}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <ReferenceLine y={100} stroke="#9ca3af" strokeDasharray="4 2" strokeWidth={1} />
              <RechartsTooltip
                contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }}
                formatter={(v: number, name: string) => [`${v != null ? v.toFixed(1) : '—'} (base 100)`, seriesLabels[name as PvBSeries] || name]}
              />
              {(Object.keys(PVB_COLORS) as PvBSeries[])
                .filter(s => activeSeries.has(s))
                .map(s => (
                  <Line
                    key={s}
                    type="monotone"
                    dataKey={s}
                    stroke={PVB_COLORS[s]}
                    strokeWidth={s === 'price' ? 2.5 : 1.5}
                    strokeDasharray={s === 'price' ? undefined : '4 2'}
                    dot={{ r: 3, strokeWidth: 0, fill: PVB_COLORS[s] }}
                    activeDot={{ r: 5 }}
                    connectNulls={false}
                  />
                ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Price change summary */}
      {pvb && (
        <div className="px-5 pb-4 grid grid-cols-3 gap-3 border-t border-border/40 pt-3">
          {[
            { label: it ? 'Prezzo 1A' : 'Price 1Y', v: pvb.priceChange1y },
            { label: it ? 'Prezzo 3A' : 'Price 3Y', v: pvb.priceChange3y },
            { label: it ? 'Prezzo 5A' : 'Price 5Y', v: pvb.priceChange5y },
          ].map(({ label, v }) => (
            <div key={label} className="text-xs">
              <div className="text-muted-foreground mb-0.5">{label}</div>
              <div className={`font-semibold text-sm ${pctColor(v)}`}>
                {v != null ? fmtPct(v) : '—'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VALUATION vs HISTORY chart
// ─────────────────────────────────────────────────────────────────────────────

type ValuationMetric = 'pe' | 'evEbitda' | 'pFcf' | 'evRevenue';

function ValuationSnapshotChart({ analysis, language }: {
  analysis: FundamentalAnalysis; language: string;
}) {
  const [metric, setMetric] = useState<ValuationMetric>('pe');
  const { valuation } = analysis;
  const it = language === 'it';

  const metrics: { key: ValuationMetric; label: string; m: ValuationMultiple }[] = [
    { key: 'pe', label: 'P/E', m: valuation.pe },
    { key: 'evEbitda', label: 'EV/EBITDA', m: valuation.evEbitda },
    { key: 'pFcf', label: 'P/FCF', m: valuation.pFcf },
    { key: 'evRevenue', label: 'EV/Sales', m: valuation.evRevenue },
  ];

  const current = metrics.find(m => m.key === metric)!;
  const m = current.m;

  const chartData = [
    { label: it ? 'Attuale' : 'Current', value: m.value, fill: '#3b82f6' },
    { label: it ? 'Mediana 5A' : '5Y Median', value: m.historicalMedian5y, fill: '#9ca3af' },
  ].filter(d => d.value != null && d.value > 0 && d.value < 500);

  const title = it ? 'Quanto è cara rispetto alla propria storia?' : 'How expensive versus own history?';
  const hasHistory = m.historicalMedian5y != null;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border/60 bg-muted/20 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-sm text-foreground">{title}</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {it
              ? (hasHistory ? 'Multipli calcolati da prezzi storici e utili annuali' : 'Confronto con mediana peer (dati storici di valutazione limitati)')
              : (hasHistory ? 'Multiples computed from historical prices and annual EPS' : 'Peer comparison only (historical valuation data limited)')}
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
        <div>
          {chartData.length >= 1 ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
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
              {it ? 'Dati storici insufficienti' : 'Insufficient historical data'}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 justify-center">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/30 rounded-lg p-3">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                {current.label} {it ? 'attuale' : 'current'}
              </div>
              <div className="text-xl font-bold">{fmtX(m.value)}</div>
            </div>
            <div className="bg-muted/30 rounded-lg p-3">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                {it ? 'Mediana 5 anni' : '5Y median'}
              </div>
              <div className="text-xl font-bold">{fmtX(m.historicalMedian5y)}</div>
            </div>
          </div>
          <div className="flex gap-3 text-xs">
            {m.vsHistory3y != null && (
              <div>
                <span className="text-muted-foreground">vs {it ? 'storia 3A' : '3Y history'}: </span>
                <span className={`font-semibold ${pctColor(m.vsHistory3y, false)}`}>
                  {m.vsHistory3y > 0 ? '+' : ''}{m.vsHistory3y.toFixed(0)}%
                </span>
              </div>
            )}
            {m.vsPeers != null && (
              <div>
                <span className="text-muted-foreground">vs {it ? 'peer' : 'peers'}: </span>
                <span className={`font-semibold ${pctColor(m.vsPeers, false)}`}>
                  {m.vsPeers > 0 ? '+' : ''}{m.vsPeers.toFixed(0)}%
                </span>
              </div>
            )}
          </div>
          {!hasHistory && (
            <p className="text-[10px] text-muted-foreground/60 bg-muted/30 rounded px-2 py-1">
              {it
                ? 'Mediana storica non disponibile: dati di prezzo e utili annuali insufficienti.'
                : 'Historical median unavailable: requires at least 1 year of price and earnings data.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NEWS MOMENTUM SECTION
// ─────────────────────────────────────────────────────────────────────────────

function NewsMomentumSection({ analysis, language }: {
  analysis: FundamentalAnalysis; language: string;
}) {
  const news = analysis.newsMomentum;
  const it = language === 'it';

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-border/60 bg-muted/20">
        <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
          <Newspaper size={14} className="text-muted-foreground" />
          {it ? 'News Recenti' : 'News & Momentum'}
        </h3>
      </div>

      {!news?.available || news.items.length === 0 ? (
        <div className="p-6 text-center">
          <Newspaper size={24} className="text-muted-foreground mx-auto mb-2 opacity-30" />
          <p className="text-sm font-medium text-foreground mb-1">
            {it ? 'Nessuna news disponibile' : 'News data unavailable'}
          </p>
          <p className="text-xs text-muted-foreground">
            {it
              ? 'Non sono state trovate news recenti per questo titolo.'
              : 'No recent news articles were found for this ticker.'}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border/40">
          {news.items.map((item, i) => (
            <a
              key={i}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 px-5 py-3 hover:bg-muted/20 transition-colors group"
            >
              {item.thumbnail && (
                <img
                  src={item.thumbnail}
                  alt=""
                  className="w-14 h-14 rounded-md object-cover border border-border shrink-0"
                  onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2">
                  {item.title}
                </p>
                <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                  <span className="font-medium">{item.publisher}</span>
                  <span>·</span>
                  <span>{fmtTimeAgo(item.publishedAt, language)}</span>
                </div>
              </div>
              <ExternalLink size={12} className="text-muted-foreground/40 shrink-0 mt-1 group-hover:text-muted-foreground transition-colors" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CATALYSTS & RISKS (AI output)
// ─────────────────────────────────────────────────────────────────────────────

function CatalystsRisksSection({ analysis, language }: {
  analysis: FundamentalAnalysis; language: string;
}) {
  const exp = analysis.explanation;
  const catalysts = exp.catalysts ?? [];
  const risks = exp.aiRisks ?? [];
  const it = language === 'it';

  if (!catalysts.length && !risks.length) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Catalysts */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          {it ? '🚀 Catalizzatori' : '🚀 Key Catalysts'}
        </h3>
        <div className="space-y-3">
          {catalysts.map((c, i) => (
            <div key={i} className="border border-blue-500/20 bg-blue-500/5 rounded-lg p-3">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <span className="text-xs font-semibold text-foreground">{c.title}</span>
                <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/15 text-blue-600 dark:text-blue-400 rounded-full shrink-0 border border-blue-500/20 whitespace-nowrap">
                  {c.timeHorizon}
                </span>
              </div>
              <p className="text-xs text-foreground/80 leading-relaxed">{c.explanation}</p>
              {c.supportingData && (
                <div className="text-[10px] font-mono text-muted-foreground mt-1.5 bg-muted/50 px-2 py-1 rounded">
                  {c.supportingData}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Risks */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          {it ? '⚠️ Rischi Principali' : '⚠️ Key Risks'}
        </h3>
        <div className="space-y-3">
          {risks.map((r, i) => (
            <div key={i} className={`rounded-lg p-3 border ${severityColor(r.severity)}`}>
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <span className="text-xs font-semibold">{r.title}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 border capitalize ${
                  r.severity === 'high' ? 'bg-red-500/15 border-red-500/30' :
                  r.severity === 'medium' ? 'bg-orange-500/15 border-orange-500/30' :
                  'bg-yellow-500/15 border-yellow-500/30'
                }`}>
                  {r.severity}
                </span>
              </div>
              <p className="text-xs leading-relaxed opacity-85">{r.explanation}</p>
              {r.metricToMonitor && (
                <div className="text-[10px] font-mono opacity-70 mt-1.5 bg-black/5 dark:bg-white/5 px-2 py-1 rounded">
                  ⚑ {r.metricToMonitor}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECONDARY TABS (financial details)
// ─────────────────────────────────────────────────────────────────────────────

type TabKey = 'growth' | 'profitability' | 'cashflow' | 'balance' | 'valuation' | 'risks';

function SecondaryTabs({ analysis, t, language }: {
  analysis: FundamentalAnalysis; t: (k: string) => string; language: string;
}) {
  const [tab, setTab] = useState<TabKey>('growth');
  const it = language === 'it';

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'growth', label: it ? 'Crescita' : 'Growth' },
    { key: 'profitability', label: it ? 'Redditività' : 'Profitability' },
    { key: 'cashflow', label: it ? 'Flussi di cassa' : 'Cash Flow' },
    { key: 'balance', label: it ? 'Bilancio' : 'Balance Sheet' },
    { key: 'valuation', label: it ? 'Valutazione' : 'Valuation' },
    { key: 'risks', label: it ? 'Rischi' : 'Risks' },
  ];

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
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
      <div className="p-5">
        {tab === 'growth' && <GrowthTab analysis={analysis} t={t} />}
        {tab === 'profitability' && <ProfitabilityTab analysis={analysis} t={t} />}
        {tab === 'cashflow' && <CashFlowTab analysis={analysis} t={t} />}
        {tab === 'balance' && <BalanceTab analysis={analysis} t={t} language={language} />}
        {tab === 'valuation' && <ValuationTab analysis={analysis} t={t} language={language} />}
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

function CashFlowTab({ analysis, t }: { analysis: FundamentalAnalysis; t: (k: string) => string }) {
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
            { l: t('fa.metric.ocfTtm'), v: fmtMoney(cf.ocfTtm) },
            { l: t('fa.metric.capex'), v: fmtMoney(cf.capexTtm) },
            { l: t('fa.metric.fcfTtm'), v: fmtMoney(cf.fcfTtm) },
            { l: t('fa.metric.fcfPerShare'), v: fmtN(cf.fcfPerShareTtm, 2) },
            { l: t('fa.metric.fcfMargin'), v: fmtPctRaw(cf.fcfMarginTtm) },
            { l: t('fa.metric.cashConversion'), v: fmtN(cf.cashConversionRatio, 2) },
            { l: t('fa.metric.sbcRev'), v: fmtPctRaw(cf.sbcToRevenueTtm) },
          ].map(({ l, v }) => (
            <tr key={l} className="hover:bg-muted/20">
              <td className="py-2.5 pr-3 text-xs text-muted-foreground">{l}</td>
              <td className="py-2.5 text-xs font-medium">{v}</td>
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

function BalanceTab({ analysis, t, language }: { analysis: FundamentalAnalysis; t: (k: string) => string; language: string }) {
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
              <tr key={String(l)} className="hover:bg-muted/20">
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
              { l: t('fa.metric.dso'), v: ce.dso != null ? `${fmtN(ce.dso, 0)} ${language === 'it' ? 'gg' : 'days'}` : '—' },
              { l: t('fa.metric.dio'), v: ce.dio != null ? `${fmtN(ce.dio, 0)} ${language === 'it' ? 'gg' : 'days'}` : '—' },
              { l: t('fa.metric.dpo'), v: ce.dpo != null ? `${fmtN(ce.dpo, 0)} ${language === 'it' ? 'gg' : 'days'}` : '—' },
              { l: t('fa.metric.ccc'), v: ce.cashConversionCycle != null ? `${fmtN(ce.cashConversionCycle, 0)} ${language === 'it' ? 'gg' : 'days'}` : '—' },
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
          {analysis.redFlags.map((flag: RedFlag) => (
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
          {analysis.strengths.map((s: FundamentalStrength) => (
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
          <div className="space-y-5">

            {/* 1. Company header with data confidence matrix */}
            <CompanyHeader analysis={analysis} language={language} />

            {/* 2. "Our Take" AI verdict */}
            <OurTakeBlock analysis={analysis} language={language} />

            {/* 3. 4 Investment snapshot cards */}
            <div>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {language === 'it' ? 'Indicatori chiave' : 'Key Fundamental Signals'}
              </h2>
              <KeySignalCards analysis={analysis} language={language} />
            </div>

            {/* 4. Price vs Business chart */}
            <PriceVsBusinessChart analysis={analysis} language={language} />

            {/* 5. Valuation vs History */}
            <ValuationSnapshotChart analysis={analysis} language={language} />

            {/* 6. News Momentum */}
            <NewsMomentumSection analysis={analysis} language={language} />

            {/* 7. Catalysts & Risks */}
            <div>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {language === 'it' ? 'Catalizzatori & Rischi (AI)' : 'Catalysts & Risks (AI)'}
              </h2>
              <CatalystsRisksSection analysis={analysis} language={language} />
            </div>

            {/* 8. Financial detail tabs */}
            <div>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {language === 'it' ? 'Dettagli finanziari' : 'Financial Details'}
              </h2>
              <SecondaryTabs analysis={analysis} t={t} language={language} />
            </div>

            {/* Methodology + disclaimer */}
            <div className="bg-muted/30 rounded-lg px-4 py-3 text-[10px] text-muted-foreground/60 leading-relaxed">
              <span className="font-semibold text-muted-foreground/80 block mb-1">
                {language === 'it' ? 'Fonti & Metodologia' : 'Sources & Methodology'}
              </span>
              {language === 'it'
                ? 'Dati: Yahoo Finance (quoteSummary, fundamentalsTimeSeries, chart). Fondamentali annuali e trimestrali; TTM calcolato come somma degli ultimi 4 trimestri. P/E storico calcolato da prezzo di fine anno / EPS diluito annuale. Peer data non disponibile tramite Yahoo Finance.'
                : 'Data: Yahoo Finance (quoteSummary, fundamentalsTimeSeries, chart). Annual and quarterly fundamentals; TTM computed as sum of last 4 quarters. Historical P/E calculated from year-end price ÷ annual diluted EPS. Peer data not available via Yahoo Finance.'}
              <br /><br />
              {t('fa.disclaimer')}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

