import React, { useState } from 'react';
import { Layout } from '@/components/layout';
import { useTranslation } from '@/lib/i18n';
import {
  useSearchTickers,
  useGetFundamentalAnalysis,
  getSearchTickersQueryKey,
  getGetFundamentalAnalysisQueryKey,
} from '@workspace/api-client-react';
import type {
  FundamentalAnalysis,
  DimensionScore,
  GrowthMetric,
  ValuationMultiple,
  RedFlag,
  FundamentalStrength,
  HistoricalDataPoint,
  PeerCompanyData,
  ScoreLabel,
  Trend,
  EarningsQuality,
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
} from 'recharts';

// ── Format helpers ────────────────────────────────────────────────────────────

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

function fmtMoney(v: number | null | undefined, currency = 'USD'): string {
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

// ── Color helpers ─────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 80) return 'text-green-600 dark:text-green-400';
  if (score >= 65) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 50) return 'text-yellow-600 dark:text-yellow-400';
  if (score >= 35) return 'text-orange-500 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
}

function scoreBg(score: number): string {
  if (score >= 80) return 'bg-green-500/10 border-green-500/30';
  if (score >= 65) return 'bg-emerald-500/10 border-emerald-500/30';
  if (score >= 50) return 'bg-yellow-500/10 border-yellow-500/30';
  if (score >= 35) return 'bg-orange-500/10 border-orange-500/30';
  return 'bg-red-500/10 border-red-500/30';
}

function scoreBar(score: number): string {
  if (score >= 80) return 'bg-green-500';
  if (score >= 65) return 'bg-emerald-500';
  if (score >= 50) return 'bg-yellow-500';
  if (score >= 35) return 'bg-orange-400';
  return 'bg-red-500';
}

function pctColor(v: number | null | undefined, higherBetter = true): string {
  if (v == null) return 'text-muted-foreground';
  const positive = higherBetter ? v > 0 : v < 0;
  if (positive) return 'text-green-600 dark:text-green-400';
  if ((!higherBetter && v > 0) || (higherBetter && v < 0)) return 'text-red-600 dark:text-red-400';
  return 'text-muted-foreground';
}

function severityColor(s: string): string {
  if (s === 'high') return 'text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/30';
  if (s === 'medium') return 'text-orange-600 dark:text-orange-400 bg-orange-500/10 border-orange-500/30';
  return 'text-yellow-600 dark:text-yellow-500 bg-yellow-500/10 border-yellow-500/30';
}

// ── Small shared components ───────────────────────────────────────────────────

function TrendIcon({ trend }: { trend: Trend | null | undefined }) {
  if (!trend) return <Minus size={12} className="text-muted-foreground" />;
  if (trend === 'improving') return <TrendingUp size={12} className="text-green-500" />;
  if (trend === 'declining') return <TrendingDown size={12} className="text-red-500" />;
  return <Minus size={12} className="text-muted-foreground" />;
}

function NmBadge({ isNm, children }: { isNm: boolean; children: React.ReactNode }) {
  if (isNm) {
    return <span className="text-xs text-muted-foreground italic">N/M</span>;
  }
  return <>{children}</>;
}

function SectionCard({
  title,
  children,
  id,
}: {
  title: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <div id={id} className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border/60 bg-muted/30">
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
  label,
  value,
  sub,
  peerMedian,
  peerPercentile,
  trend,
  isNm,
  higherBetter = true,
  tooltip,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  peerMedian?: number | null;
  peerPercentile?: number | null;
  trend?: Trend | null;
  isNm?: boolean;
  higherBetter?: boolean;
  tooltip?: string;
}) {
  return (
    <tr className="hover:bg-muted/20 transition-colors">
      <td className="py-2.5 pr-3 text-muted-foreground text-xs w-[38%]">
        <div className="flex items-center gap-1">
          {label}
          {tooltip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Info size={11} className="cursor-help opacity-50 hover:opacity-100" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[260px] text-xs">{tooltip}</TooltipContent>
            </Tooltip>
          )}
        </div>
        {sub && <div className="text-[10px] text-muted-foreground/60 mt-0.5">{sub}</div>}
      </td>
      <td className="py-2.5 pr-3 font-medium text-xs">
        {isNm ? <span className="text-muted-foreground italic text-[11px]">N/M</span> : value}
      </td>
      <td className="py-2.5 pr-3 text-xs text-muted-foreground">
        {peerMedian != null ? fmtPctRaw(peerMedian) : '—'}
      </td>
      <td className="py-2.5 pr-2 text-xs">
        {peerPercentile != null ? (
          <span className={pctColor(peerPercentile - 50, higherBetter)}>
            {peerPercentile}th
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className="py-2.5 text-xs">
        <TrendIcon trend={trend} />
      </td>
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

// Valuation-specific row with vs-peers and vs-history instead of peer-pct + trend
function ValMetricRow({
  label,
  value,
  peerMedian,
  vsPeers,
  vsHistory3y,
  tooltip,
}: {
  label: string;
  value: number | null | undefined;
  peerMedian?: number | null;
  vsPeers?: number | null;
  vsHistory3y?: number | null;
  tooltip?: string;
}) {
  const fmt = (v: number | null | undefined) => {
    if (v == null) return '—';
    if (Math.abs(v) >= 100) return fmtX(v, 0);
    return fmtX(v, 1);
  };
  return (
    <tr className="hover:bg-muted/20 transition-colors">
      <td className="py-2.5 pr-3 text-muted-foreground text-xs w-[32%]">
        <div className="flex items-center gap-1">
          {label}
          {tooltip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Info size={11} className="cursor-help opacity-50 hover:opacity-100" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[260px] text-xs">{tooltip}</TooltipContent>
            </Tooltip>
          )}
        </div>
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

// ── Dimension score card ──────────────────────────────────────────────────────

function DimScoreCard({
  label,
  score,
  labelText,
  keyDrivers,
}: {
  label: string;
  score: number;
  labelText: string;
  keyDrivers: string[];
}) {
  return (
    <div className={`rounded-lg border p-3 ${scoreBg(score)}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-foreground/80">{label}</span>
        <span className={`text-sm font-bold ${scoreColor(score)}`}>{score}</span>
      </div>
      <div className="w-full bg-background/60 rounded-full h-1.5 mb-2">
        <div
          className={`h-1.5 rounded-full ${scoreBar(score)}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <div className={`text-[10px] font-semibold ${scoreColor(score)}`}>{labelText}</div>
      {keyDrivers.length > 0 && (
        <div className="mt-1.5 space-y-0.5">
          {keyDrivers.map((d, i) => (
            <div key={i} className="text-[10px] text-muted-foreground">· {d}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Mini history chart ────────────────────────────────────────────────────────

function HistoryBarChart({
  data,
  label,
  isMoney = true,
  isPct = false,
  height = 160,
}: {
  data: HistoricalDataPoint[];
  label: string;
  isMoney?: boolean;
  isPct?: boolean;
  height?: number;
}) {
  if (!data.length) return null;
  const chartData = data.map((d) => ({ year: d.year, value: d.value }));
  const fmt = (v: number) =>
    isPct ? `${v.toFixed(1)}%` : isMoney ? fmtMoney(v) : v.toFixed(2);
  return (
    <div>
      <div className="text-xs text-muted-foreground font-medium mb-1.5">{label}</div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <XAxis dataKey="year" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
          <YAxis hide />
          <RechartsTooltip
            formatter={(v: number) => [fmt(v), label]}
            contentStyle={{ fontSize: 11 }}
          />
          <ReferenceLine y={0} stroke="#e5e7eb" strokeWidth={1} />
          <Bar dataKey="value" radius={[2, 2, 0, 0]}>
            {chartData.map((d, i) => (
              <Cell
                key={i}
                fill={d.value == null ? '#e5e7eb' : d.value >= 0 ? '#22c55e' : '#ef4444'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function HistoryLineChart({
  series,
  height = 160,
  colors,
}: {
  series: { data: HistoricalDataPoint[]; label: string }[];
  height?: number;
  colors?: string[];
}) {
  if (!series.length || !series[0].data.length) return null;
  const years = series[0].data.map((d) => d.year);
  const chartData = years.map((y) => {
    const row: Record<string, string | number | null> = { year: y };
    series.forEach((s) => {
      const point = s.data.find((d) => d.year === y);
      row[s.label] = point?.value ?? null;
    });
    return row;
  });
  const palette = colors ?? ['#3b82f6', '#22c55e', '#f59e0b', '#ec4899'];
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <XAxis dataKey="year" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
        <YAxis hide />
        <RechartsTooltip contentStyle={{ fontSize: 11 }} />
        <ReferenceLine y={0} stroke="#e5e7eb" strokeWidth={1} />
        {series.map((s, i) => (
          <Line
            key={s.label}
            type="monotone"
            dataKey={s.label}
            stroke={palette[i % palette.length]}
            dot={false}
            strokeWidth={2}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── Explanation panel ─────────────────────────────────────────────────────────

function ExplanationPanel({
  explanation,
  t,
}: {
  explanation: FundamentalAnalysis['explanation'];
  t: (k: string) => string;
}) {
  type ExpKey =
    | 'summary'
    | 'growthAnalysis'
    | 'profitabilityAnalysis'
    | 'cashFlowAnalysis'
    | 'balanceSheetAnalysis'
    | 'valuationAnalysis'
    | 'peerAnalysis';

  const sections: { key: ExpKey; label: string }[] = [
    { key: 'summary', label: t('fa.explain.summary') },
    { key: 'growthAnalysis', label: t('fa.explain.growth') },
    { key: 'profitabilityAnalysis', label: t('fa.explain.profitability') },
    { key: 'cashFlowAnalysis', label: t('fa.explain.cashflow') },
    { key: 'balanceSheetAnalysis', label: t('fa.explain.balance') },
    { key: 'valuationAnalysis', label: t('fa.explain.valuation') },
    { key: 'peerAnalysis', label: t('fa.explain.peers') },
  ];

  const [open, setOpen] = useState<Set<string>>(new Set(['summary']));
  const toggle = (key: string) => {
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-1 pr-1">
        {sections.map(({ key, label }) => (
          <div key={key} className="border border-border/60 rounded-lg overflow-hidden">
            <button
              onClick={() => toggle(key)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium hover:bg-muted/30 transition-colors text-left"
            >
              <span>{label}</span>
              {open.has(key) ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {open.has(key) && (
              <div className="px-3 pb-3 text-xs text-foreground/90 leading-relaxed border-t border-border/40 pt-2.5">
                {explanation[key]}
              </div>
            )}
          </div>
        ))}

        {/* Strengths */}
        <div className="border border-border/60 rounded-lg overflow-hidden">
          <button
            onClick={() => toggle('strengths')}
            className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium hover:bg-muted/30 transition-colors text-left"
          >
            <span>{t('fa.explain.strengths')}</span>
            {open.has('strengths') ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {open.has('strengths') && (
            <div className="px-3 pb-3 border-t border-border/40 pt-2">
              <ul className="space-y-1">
                {explanation.strengths.map((s, i) => (
                  <li key={i} className="text-xs text-green-700 dark:text-green-400 flex gap-1.5">
                    <CheckCircle2 size={12} className="shrink-0 mt-0.5" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Risks */}
        <div className="border border-border/60 rounded-lg overflow-hidden">
          <button
            onClick={() => toggle('risks')}
            className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium hover:bg-muted/30 transition-colors text-left"
          >
            <span>{t('fa.explain.risks')}</span>
            {open.has('risks') ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {open.has('risks') && (
            <div className="px-3 pb-3 border-t border-border/40 pt-2">
              <ul className="space-y-1">
                {explanation.risks.map((r, i) => (
                  <li key={i} className="text-xs text-red-700 dark:text-red-400 flex gap-1.5">
                    <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Conclusion */}
        <div className="border border-border/60 rounded-lg overflow-hidden">
          <button
            onClick={() => toggle('conclusion')}
            className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium hover:bg-muted/30 transition-colors text-left"
          >
            <span>{t('fa.explain.conclusion')}</span>
            {open.has('conclusion') ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {open.has('conclusion') && (
            <div className="px-3 pb-3 text-xs text-foreground/90 leading-relaxed border-t border-border/40 pt-2.5">
              {explanation.conclusion}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-border/40 text-[10px] text-muted-foreground leading-relaxed">
        {explanation.disclaimer}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function FundamentalAnalysisPage() {
  const { t, language } = useTranslation();

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery] = useDebounce(searchQuery, 300);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

  const { data: searchResults, isLoading: isSearching } = useSearchTickers(
    { query: debouncedQuery },
    {
      query: {
        enabled: debouncedQuery.length > 0,
        queryKey: getSearchTickersQueryKey({ query: debouncedQuery }),
      },
    },
  );

  const {
    data: analysis,
    isLoading: isAnalyzing,
    isError,
  } = useGetFundamentalAnalysis(
    { symbol: selectedSymbol ?? '', language },
    {
      query: {
        enabled: !!selectedSymbol,
        queryKey: getGetFundamentalAnalysisQueryKey({
          symbol: selectedSymbol ?? '',
          language,
        }),
      },
    },
  );

  const selectSymbol = (s: string) => {
    setSelectedSymbol(s);
    setSearchQuery('');
  };

  return (
    <Layout>
      <div className="py-6 flex flex-col gap-6 max-h-[calc(100vh-64px)]">

        {/* ── Top bar ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card p-4 rounded-xl border border-border shadow-sm">
          <div className="relative w-full md:max-w-md z-20">
            <div className="relative flex items-center">
              <Search className="absolute left-3 text-muted-foreground w-5 h-5" />
              <input
                type="text"
                placeholder={t('fa.search.placeholder')}
                className="w-full h-12 pl-10 pr-4 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground font-medium"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {debouncedQuery.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-lg shadow-xl overflow-hidden max-h-64 overflow-y-auto">
                {isSearching ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">{t('fa.search.loading')}</div>
                ) : searchResults && searchResults.length > 0 ? (
                  searchResults.map((r) => (
                    <button
                      key={r.symbol}
                      className="w-full text-left px-4 py-3 hover:bg-accent flex items-center justify-between border-b border-border/50 last:border-0"
                      onClick={() => selectSymbol(r.symbol)}
                    >
                      <div>
                        <span className="font-bold text-foreground">{r.symbol}</span>
                        <span className="ml-2 text-sm text-muted-foreground line-clamp-1">{r.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-sm">{r.exchange}</span>
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">{t('fa.search.empty')}</div>
                )}
              </div>
            )}
          </div>

          {selectedSymbol && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-mono font-bold text-foreground">{selectedSymbol}</span>
              {analysis && (
                <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                  {analysis.sector ?? analysis.exchange}
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Empty state ──────────────────────────────────────────────────── */}
        {!selectedSymbol && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-sm">
              <div className="w-16 h-16 rounded-full bg-muted/50 mx-auto mb-4 flex items-center justify-center">
                <Search size={28} className="text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">{t('fa.noSymbol')}</p>
            </div>
          </div>
        )}

        {/* ── Loading ──────────────────────────────────────────────────────── */}
        {selectedSymbol && isAnalyzing && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-sm">
              <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-muted-foreground leading-relaxed">{t('fa.loading')}</p>
            </div>
          </div>
        )}

        {/* ── Error ────────────────────────────────────────────────────────── */}
        {selectedSymbol && isError && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-sm bg-destructive/5 border border-destructive/20 rounded-xl p-6">
              <AlertTriangle size={28} className="text-destructive mx-auto mb-3" />
              <p className="text-sm text-foreground font-medium mb-1">{t('fa.error')}</p>
            </div>
          </div>
        )}

        {/* ── Main content ─────────────────────────────────────────────────── */}
        {analysis && !isAnalyzing && (
          <div className="flex-1 overflow-hidden flex flex-col gap-4 min-h-0">

            {/* Stock header */}
            <StockHeader analysis={analysis} t={t} language={language} />

            {/* Main two-column layout */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0 overflow-hidden">

              {/* Sections (left, scrollable) */}
              <div className="lg:col-span-2 flex flex-col gap-4 overflow-y-auto pr-1">
                <ScoresSection analysis={analysis} t={t} />
                <GrowthSection_ analysis={analysis} t={t} />
                <ProfitabilitySection_ analysis={analysis} t={t} />
                <CashFlowSection_ analysis={analysis} t={t} language={language} />
                <FinancialStrengthSection_ analysis={analysis} t={t} />
                <CapitalEfficiencySection_ analysis={analysis} t={t} />
                <ValuationSection_ analysis={analysis} t={t} language={language} />
                <PeerSection analysis={analysis} t={t} />
                <HistoricalSection_ analysis={analysis} t={t} />
                <FlagsAndStrengths analysis={analysis} t={t} language={language} />
              </div>

              {/* AI Explanation panel (right, sticky) */}
              <div className="lg:col-span-1 flex flex-col min-h-0">
                <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col h-full max-h-[calc(100vh-200px)]">
                  <div className="px-4 py-3 border-b border-border/60 bg-muted/30 shrink-0">
                    <h3 className="font-semibold text-sm">{t('fa.section.explanation')}</h3>
                    <ConfidenceBadge
                      level={analysis.dataCoverage.confidenceLevel}
                      pct={analysis.dataCoverage.coveragePct}
                      t={t}
                    />
                  </div>
                  <div className="flex-1 overflow-hidden p-3">
                    <ExplanationPanel explanation={analysis.explanation} t={t} />
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </Layout>
  );
}

// ── ConfidenceBadge ───────────────────────────────────────────────────────────

function ConfidenceBadge({
  level,
  pct,
  t,
}: {
  level: string;
  pct: number;
  t: (k: string) => string;
}) {
  const color =
    level === 'high'
      ? 'text-green-600'
      : level === 'medium'
      ? 'text-yellow-600'
      : 'text-red-600';
  return (
    <div className={`text-[10px] mt-0.5 ${color}`}>
      {t(`fa.confidence.${level}`)} · {t('fa.coverage')}: {pct}%
    </div>
  );
}

// ── Stock header ──────────────────────────────────────────────────────────────

function StockHeader({
  analysis,
  t,
  language,
}: {
  analysis: FundamentalAnalysis;
  t: (k: string) => string;
  language: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap items-center gap-4">
      {analysis.logoUrl && (
        <img
          src={analysis.logoUrl}
          alt={analysis.name}
          className="w-12 h-12 rounded-lg object-contain border border-border bg-background p-1"
          onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
        />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-2xl font-bold font-mono">{analysis.symbol}</span>
          <span className="text-sm text-muted-foreground truncate">{analysis.name}</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap mt-0.5">
          {analysis.sector && (
            <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
              {analysis.sector}
            </span>
          )}
          {analysis.industry && (
            <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
              {analysis.industry}
            </span>
          )}
          {analysis.country && (
            <span className="text-xs text-muted-foreground">{analysis.country}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-6 flex-wrap">
        <div className="text-right">
          <div className="text-xl font-bold font-mono">
            {analysis.currency} {fmtN(analysis.lastPrice, 2)}
          </div>
          <div className="text-xs text-muted-foreground">{analysis.exchange}</div>
        </div>
        {analysis.marketCap != null && (
          <div className="text-right">
            <div className="text-sm font-semibold">{fmtMoney(analysis.marketCap)}</div>
            <div className="text-xs text-muted-foreground">Market Cap</div>
          </div>
        )}
        {analysis.enterpriseValue != null && (
          <div className="text-right">
            <div className="text-sm font-semibold">{fmtMoney(analysis.enterpriseValue)}</div>
            <div className="text-xs text-muted-foreground">Enterprise Value</div>
          </div>
        )}
        {analysis.lastFilingDate && (
          <div className="text-right">
            <div className="text-xs font-medium">{analysis.lastFilingDate.slice(0, 10)}</div>
            <div className="text-[10px] text-muted-foreground">{t('fa.lastFiling')}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Scores section ────────────────────────────────────────────────────────────

function ScoresSection({
  analysis,
  t,
}: {
  analysis: FundamentalAnalysis;
  t: (k: string) => string;
}) {
  const { scores } = analysis;
  const dims = [
    { key: 'growth', dim: scores.growth },
    { key: 'profitability', dim: scores.profitability },
    { key: 'cashFlow', dim: scores.cashFlow },
    { key: 'financialStrength', dim: scores.financialStrength },
    { key: 'capitalEfficiency', dim: scores.capitalEfficiency },
    { key: 'valuation', dim: scores.valuation },
  ];

  return (
    <SectionCard title={t('fa.section.scores')}>
      {/* Overall score */}
      <div className={`flex items-center justify-between rounded-xl border p-4 mb-4 ${scoreBg(scores.overall)}`}>
        <div>
          <div className="text-xs text-muted-foreground font-medium mb-0.5">{t('fa.score.overall')}</div>
          <div className={`text-3xl font-bold ${scoreColor(scores.overall)}`}>{scores.overall}</div>
          <div className={`text-sm font-semibold ${scoreColor(scores.overall)}`}>
            {scores.overallLabelEn}
          </div>
        </div>
        <div className="w-24 h-24">
          <ScoreGauge score={scores.overall} />
        </div>
      </div>

      {/* Dimension grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {dims.map(({ key, dim }) => (
          <DimScoreCard
            key={key}
            label={t(`fa.dim.${key}`)}
            score={dim.score}
            labelText={dim.labelEn}
            keyDrivers={dim.keyDrivers}
          />
        ))}
      </div>
    </SectionCard>
  );
}

function ScoreGauge({ score }: { score: number }) {
  const r = 34;
  const cx = 48;
  const cy = 48;
  const circumference = Math.PI * r; // half circle
  const fill = (score / 100) * circumference;
  const color =
    score >= 80 ? '#22c55e' : score >= 65 ? '#10b981' : score >= 50 ? '#eab308' : score >= 35 ? '#f97316' : '#ef4444';

  return (
    <svg viewBox="0 0 96 56" className="w-full h-full">
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={`${fill} ${circumference}`}
      />
    </svg>
  );
}

// ── Growth section ────────────────────────────────────────────────────────────

function GrowthSection_({
  analysis,
  t,
}: {
  analysis: FundamentalAnalysis;
  t: (k: string) => string;
}) {
  const g = analysis.growth;

  const rows: { label: string; metric: GrowthMetric; tooltip?: string }[] = [
    { label: t('fa.metric.revenueYoy'), metric: g.revenueYoy, tooltip: 'Year-over-year revenue growth rate.' },
    { label: t('fa.metric.revenue3yCagr'), metric: g.revenue3yCagr, tooltip: '3-year compound annual growth rate of revenue.' },
    { label: t('fa.metric.revenue5yCagr'), metric: g.revenue5yCagr },
    { label: t('fa.metric.revenueYoYQ'), metric: g.revenueYoYLatestQ },
    { label: t('fa.metric.epsYoy'), metric: g.epsYoy, tooltip: 'Year-over-year change in diluted EPS.' },
    { label: t('fa.metric.eps3yCagr'), metric: g.eps3yCagr },
    { label: t('fa.metric.opIncYoy'), metric: g.operatingIncomeYoy },
    { label: t('fa.metric.netIncYoy'), metric: g.netIncomeYoy },
    { label: t('fa.metric.ocfYoy'), metric: g.ocfYoy },
    { label: t('fa.metric.fcfYoy'), metric: g.fcfYoy },
    { label: t('fa.metric.fcf3yCagr'), metric: g.fcf3yCagr },
  ];

  return (
    <SectionCard title={t('fa.section.growth')}>
      {g.revenueTtm != null && (
        <div className="mb-3 text-xs text-muted-foreground">
          {t('fa.metric.revenueTtm')}: <span className="font-semibold text-foreground">{fmtMoney(g.revenueTtm)}</span>
          {g.epsDilutedTtm != null && (
            <> · {t('fa.metric.epsTtm')}: <span className="font-semibold text-foreground">{fmtN(g.epsDilutedTtm, 2)}</span></>
          )}
        </div>
      )}
      <table className="w-full text-sm">
        <thead>
          <MetricTableHeader t={t} />
        </thead>
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
    </SectionCard>
  );
}

// ── Profitability section ─────────────────────────────────────────────────────

function ProfitabilitySection_({
  analysis,
  t,
}: {
  analysis: FundamentalAnalysis;
  t: (k: string) => string;
}) {
  const p = analysis.profitability;

  return (
    <SectionCard title={t('fa.section.profitability')}>
      {p.roeWarning && (
        <div className="mb-3 text-[11px] text-yellow-700 dark:text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2 flex gap-2">
          <AlertTriangle size={13} className="shrink-0 mt-0.5" />
          {t(`fa.roe.warning.${p.roeWarning}`)}
        </div>
      )}
      <table className="w-full text-sm">
        <thead>
          <MetricTableHeader t={t} />
        </thead>
        <tbody className="divide-y divide-border/40">
          <MetricRow
            label={t('fa.metric.grossMargin')}
            value={<span className={pctColor(p.grossMarginTtm)}>{fmtPctRaw(p.grossMarginTtm)}</span>}
            sub={`3Y avg: ${fmtPctRaw(p.grossMargin3yAvg)}`}
            peerMedian={p.peerGrossMarginMedian}
            trend={p.grossMarginTrend}
            tooltip="Gross profit as % of revenue."
          />
          <MetricRow
            label={t('fa.metric.opMargin')}
            value={<span className={pctColor(p.operatingMarginTtm)}>{fmtPctRaw(p.operatingMarginTtm)}</span>}
            sub={`3Y avg: ${fmtPctRaw(p.operatingMargin3yAvg)}`}
            peerMedian={p.peerOperatingMarginMedian}
            peerPercentile={p.operatingMarginTtm != null && p.peerOperatingMarginMedian != null
              ? undefined : undefined}
            trend={p.operatingMarginTrend}
            tooltip="Operating income as % of revenue."
          />
          <MetricRow
            label={t('fa.metric.ebitdaMargin')}
            value={<span className={pctColor(p.ebitdaMarginTtm)}>{fmtPctRaw(p.ebitdaMarginTtm)}</span>}
            trend={null}
          />
          <MetricRow
            label={t('fa.metric.netMargin')}
            value={<span className={pctColor(p.netMarginTtm)}>{fmtPctRaw(p.netMarginTtm)}</span>}
            sub={`3Y avg: ${fmtPctRaw(p.netMargin3yAvg)}`}
            trend={p.netMarginTrend}
          />
          <MetricRow
            label={t('fa.metric.fcfMargin')}
            value={<span className={pctColor(p.fcfMarginTtm)}>{fmtPctRaw(p.fcfMarginTtm)}</span>}
          />
          <MetricRow
            label={t('fa.metric.roa')}
            value={<span className={pctColor(p.roa)}>{fmtPctRaw(p.roa)}</span>}
            tooltip="Net income / average total assets."
          />
          <MetricRow
            label={t('fa.metric.roe')}
            value={<span className={pctColor(p.roe)}>{fmtPctRaw(p.roe)}</span>}
            tooltip="Net income / average shareholders' equity."
          />
          <MetricRow
            label={t('fa.metric.roic')}
            value={<span className={pctColor(p.roic)}>{fmtPctRaw(p.roic)}</span>}
            peerMedian={p.peerRoicMedian}
            tooltip="NOPAT / average invested capital. Measures how efficiently the company uses capital."
          />
        </tbody>
      </table>
    </SectionCard>
  );
}

// ── Cash flow section ─────────────────────────────────────────────────────────

function CashFlowSection_({
  analysis,
  t,
  language,
}: {
  analysis: FundamentalAnalysis;
  t: (k: string) => string;
  language: string;
}) {
  const cf = analysis.cashFlow;
  const eqColor: Record<string, string> = {
    high: 'text-green-600 bg-green-500/10 border-green-500/20',
    adequate: 'text-yellow-600 bg-yellow-500/10 border-yellow-500/20',
    weak: 'text-orange-600 bg-orange-500/10 border-orange-500/20',
    very_weak: 'text-red-600 bg-red-500/10 border-red-500/20',
  };

  return (
    <SectionCard title={t('fa.section.cashflow')}>
      <table className="w-full text-sm">
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
              <td className={`py-2.5 text-xs font-medium ${good == null ? '' : good ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {v}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className={`mt-4 flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs ${eqColor[cf.earningsQuality] ?? ''}`}>
        <span className="font-semibold">{t('fa.metric.earningsQuality')}:</span>
        <span className="font-bold">{t(`fa.eq.${cf.earningsQuality}`)}</span>
        {cf.earningsQualitySignals.length > 0 && (
          <span className="text-muted-foreground ml-auto">
            {cf.earningsQualitySignals.length} signal{cf.earningsQualitySignals.length > 1 ? 's' : ''}
          </span>
        )}
      </div>
    </SectionCard>
  );
}

// ── Financial strength section ────────────────────────────────────────────────

function FinancialStrengthSection_({
  analysis,
  t,
}: {
  analysis: FundamentalAnalysis;
  t: (k: string) => string;
}) {
  const fs = analysis.financialStrength;

  return (
    <SectionCard title={t('fa.section.strength')}>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border/60">
            <th className="pb-1.5 pr-3 text-left font-medium">{t('fa.col.metric')}</th>
            <th className="pb-1.5 text-left font-medium">{t('fa.col.current')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {[
            { l: t('fa.metric.cash'), v: fmtMoney(fs.cash), warn: false },
            { l: t('fa.metric.totalDebt'), v: fmtMoney(fs.totalDebt), warn: false },
            {
              l: t('fa.metric.netDebt'),
              v: fs.isNetCash ? <span className="text-green-600 dark:text-green-400 font-semibold">{t('fa.netCash')}</span> : fmtMoney(fs.netDebt),
              warn: false,
            },
            { l: t('fa.metric.de'), v: fmtN(fs.debtToEquity, 2), warn: fs.debtToEquity != null && fs.debtToEquity > 3 },
            { l: t('fa.metric.ndEbitda'), v: fs.netDebtToEbitdaIsNm ? <span className="text-muted-foreground italic text-xs">N/M</span> : fmtN(fs.netDebtToEbitda, 2), warn: fs.netDebtToEbitda != null && !fs.netDebtToEbitdaIsNm && fs.netDebtToEbitda > 4 },
            { l: t('fa.metric.currentRatio'), v: fmtN(fs.currentRatio, 2), warn: fs.currentRatio != null && fs.currentRatio < 1 },
            { l: t('fa.metric.quickRatio'), v: fmtN(fs.quickRatio, 2), warn: fs.quickRatio != null && fs.quickRatio < 0.7 },
            { l: t('fa.metric.intCoverage'), v: fmtX(fs.interestCoverage), warn: fs.interestCoverage != null && fs.interestCoverage > 0 && fs.interestCoverage < 2 },
            { l: t('fa.metric.goodwillAssets'), v: fmtPctRaw(fs.goodwillToAssets), warn: fs.goodwillToAssets != null && fs.goodwillToAssets > 40 },
          ].map(({ l, v, warn }) => (
            <tr key={l} className="hover:bg-muted/20">
              <td className="py-2.5 pr-3 text-xs text-muted-foreground">{l}</td>
              <td className={`py-2.5 text-xs font-medium ${warn ? 'text-orange-600 dark:text-orange-400' : ''}`}>
                {v}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </SectionCard>
  );
}

// ── Capital efficiency section ────────────────────────────────────────────────

function CapitalEfficiencySection_({
  analysis,
  t,
}: {
  analysis: FundamentalAnalysis;
  t: (k: string) => string;
}) {
  const ce = analysis.capitalEfficiency;

  return (
    <SectionCard title={t('fa.section.efficiency')}>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border/60">
            <th className="pb-1.5 pr-3 text-left font-medium">{t('fa.col.metric')}</th>
            <th className="pb-1.5 text-left font-medium">{t('fa.col.current')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {[
            { l: t('fa.metric.roic'), v: fmtPctRaw(ce.roic), tooltip: 'NOPAT / average invested capital.' },
            { l: t('fa.metric.assetTurnover'), v: fmtX(ce.assetTurnover, 2), tooltip: 'Revenue / total assets. Higher = more efficient.' },
            { l: t('fa.metric.dso'), v: ce.dso != null ? `${fmtN(ce.dso, 0)} days` : '—', tooltip: 'Days of revenue tied up in receivables.' },
            { l: t('fa.metric.dio'), v: ce.dio != null ? `${fmtN(ce.dio, 0)} days` : '—', tooltip: 'Days of COGS tied up in inventory.' },
            { l: t('fa.metric.dpo'), v: ce.dpo != null ? `${fmtN(ce.dpo, 0)} days` : '—', tooltip: 'Days to pay suppliers.' },
            { l: t('fa.metric.ccc'), v: ce.cashConversionCycle != null ? `${fmtN(ce.cashConversionCycle, 0)} days` : '—', tooltip: 'DSO + DIO - DPO. Lower = better cash cycle.' },
          ].map(({ l, v, tooltip }) => (
            <tr key={l} className="hover:bg-muted/20">
              <td className="py-2.5 pr-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  {l}
                  {tooltip && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info size={11} className="cursor-help opacity-50 hover:opacity-100" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[240px] text-xs">{tooltip}</TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </td>
              <td className="py-2.5 text-xs font-medium">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </SectionCard>
  );
}

// ── Valuation section ─────────────────────────────────────────────────────────

function ValuationSection_({
  analysis,
  t,
  language,
}: {
  analysis: FundamentalAnalysis;
  t: (k: string) => string;
  language: string;
}) {
  const v = analysis.valuation;
  const mx = v.valuationMatrix;

  const multiples: { label: string; m: ValuationMultiple; tooltip?: string }[] = [
    { label: t('fa.metric.pe'), m: v.pe, tooltip: 'Price divided by trailing twelve-month earnings per share.' },
    { label: t('fa.metric.forwardPe'), m: v.forwardPe, tooltip: 'Price divided by next twelve-month consensus EPS estimate.' },
    { label: t('fa.metric.ps'), m: v.ps, tooltip: 'Market cap / revenue. Useful when earnings are negative.' },
    { label: t('fa.metric.pb'), m: v.pb, tooltip: 'Market cap / book value of equity.' },
    { label: t('fa.metric.pFcf'), m: v.pFcf, tooltip: 'Market cap / free cash flow.' },
    { label: t('fa.metric.evRev'), m: v.evRevenue },
    { label: t('fa.metric.evEbitda'), m: v.evEbitda, tooltip: 'Enterprise value / EBITDA. Capital-structure-neutral multiple.' },
    { label: t('fa.metric.evEbit'), m: v.evEbit },
  ];

  const quadrantColors: Record<string, string> = {
    quality_cheap: 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400',
    quality_expensive: 'bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400',
    weak_cheap: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-700 dark:text-yellow-400',
    weak_expensive: 'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400',
  };

  return (
    <SectionCard title={t('fa.section.valuation')}>
      {/* Valuation matrix badge */}
      <div className={`mb-4 rounded-lg border px-3 py-2.5 text-xs font-medium ${quadrantColors[mx.quadrant]}`}>
        <div className="font-bold mb-0.5">{t('fa.matrix.title')}</div>
        {language === 'it' ? mx.labelIt : mx.label}
      </div>

      <table className="w-full text-sm mb-3">
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
            <ValMetricRow
              key={label}
              label={label}
              value={m.value}
              peerMedian={m.peerMedian}
              vsPeers={m.vsPeers}
              vsHistory3y={m.vsHistory3y}
              tooltip={tooltip}
            />
          ))}
        </tbody>
      </table>

      <div className="grid grid-cols-3 gap-2 text-xs border-t border-border/40 pt-3">
        {v.dividendYield != null && (
          <div>
            <div className="text-muted-foreground">{t('fa.metric.divYield')}</div>
            <div className="font-semibold">{fmtPctRaw(v.dividendYield)}</div>
          </div>
        )}
        {v.buybackYield != null && (
          <div>
            <div className="text-muted-foreground">{t('fa.metric.buybackYield')}</div>
            <div className="font-semibold">{fmtPctRaw(v.buybackYield)}</div>
          </div>
        )}
        {v.dilution1y != null && (
          <div>
            <div className="text-muted-foreground">{t('fa.metric.dilution1y')}</div>
            <div className={`font-semibold ${v.dilution1y > 3 ? 'text-orange-500' : ''}`}>
              {fmtPct(v.dilution1y)}
            </div>
          </div>
        )}
      </div>
    </SectionCard>
  );
}

// ── Peer comparison ───────────────────────────────────────────────────────────

function PeerSection({
  analysis,
  t,
}: {
  analysis: FundamentalAnalysis;
  t: (k: string) => string;
}) {
  const { peers } = analysis;

  if (!peers.peers.length) {
    return (
      <SectionCard title={t('fa.section.peers')}>
        <p className="text-sm text-muted-foreground">{t('fa.peers.noPeers')}</p>
      </SectionCard>
    );
  }

  const cols: { key: keyof PeerCompanyData; label: string; fmt: (v: number | null | undefined) => string }[] = [
    { key: 'marketCap', label: t('fa.peers.mktCap'), fmt: fmtMoney },
    { key: 'revenueGrowthYoy', label: t('fa.peers.revGrowth'), fmt: (v) => fmtPct(v) },
    { key: 'grossMargin', label: t('fa.peers.grossMargin'), fmt: fmtPctRaw },
    { key: 'operatingMargin', label: t('fa.peers.opMargin'), fmt: fmtPctRaw },
    { key: 'roic', label: t('fa.peers.roic'), fmt: fmtPctRaw },
    { key: 'pe', label: t('fa.peers.pe'), fmt: (v) => fmtX(v) },
    { key: 'evToEbitda', label: t('fa.peers.evEbitda'), fmt: (v) => fmtX(v) },
    { key: 'evToSales', label: t('fa.peers.evSales'), fmt: (v) => fmtX(v) },
  ];

  // Highlight subject company row
  const subjectSymbol = analysis.symbol;

  return (
    <SectionCard title={t('fa.section.peers')}>
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[600px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border/60">
              <th className="pb-2 pr-3 text-left font-medium">{t('fa.peers.symbol')}</th>
              {cols.map((c) => (
                <th key={c.key} className="pb-2 pr-3 text-right font-medium">{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {/* Subject company row */}
            <SubjectRow analysis={analysis} cols={cols} t={t} />
            {/* Peers */}
            {peers.peers.map((peer) => (
              <tr key={peer.symbol} className="hover:bg-muted/20">
                <td className="py-2 pr-3 font-mono font-semibold text-foreground">
                  {peer.symbol}
                </td>
                {cols.map((c) => (
                  <td key={c.key} className="py-2 pr-3 text-right text-muted-foreground">
                    {c.fmt(peer[c.key] as number | null)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

function SubjectRow({
  analysis,
  cols,
  t,
}: {
  analysis: FundamentalAnalysis;
  cols: { key: keyof PeerCompanyData; label: string; fmt: (v: number | null | undefined) => string }[];
  t: (k: string) => string;
}) {
  // Build a PeerCompanyData-like object from the analysis
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
    <tr className="bg-primary/5 border-primary/20 font-medium">
      <td className="py-2 pr-3 font-mono font-bold text-primary">
        {analysis.symbol} ★
      </td>
      {cols.map((c) => (
        <td key={c.key} className="py-2 pr-3 text-right text-foreground font-semibold">
          {c.fmt(subject[c.key] as number | null)}
        </td>
      ))}
    </tr>
  );
}

// ── Historical section ────────────────────────────────────────────────────────

function HistoricalSection_({
  analysis,
  t,
}: {
  analysis: FundamentalAnalysis;
  t: (k: string) => string;
}) {
  const h = analysis.historical;

  return (
    <SectionCard title={t('fa.section.historical')}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <HistoryBarChart data={h.revenue} label={t('fa.hist.revenue')} />
        <HistoryBarChart data={h.netIncome} label={t('fa.hist.netIncome')} />
        <HistoryBarChart data={h.fcf} label={t('fa.hist.fcf')} />
        <HistoryBarChart data={h.eps} label={t('fa.hist.eps')} isMoney={false} />
        <HistoryLineChart
          series={[
            { data: h.grossMargin, label: 'Gross Margin' },
            { data: h.operatingMargin, label: 'Op Margin' },
            { data: h.netMargin, label: 'Net Margin' },
          ]}
        />
        <HistoryBarChart data={h.netDebt} label={t('fa.hist.netDebt')} />
      </div>
    </SectionCard>
  );
}

// ── Flags & Strengths ─────────────────────────────────────────────────────────

function FlagsAndStrengths({
  analysis,
  t,
  language,
}: {
  analysis: FundamentalAnalysis;
  t: (k: string) => string;
  language: string;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Red flags */}
      <SectionCard title={t('fa.section.flags')}>
        {analysis.redFlags.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('fa.flags.none')}</p>
        ) : (
          <div className="space-y-2">
            {analysis.redFlags.map((flag) => (
              <div
                key={flag.key}
                className={`rounded-lg border px-3 py-2.5 text-xs ${severityColor(flag.severity)}`}
              >
                <div className="flex items-center justify-between mb-1 gap-2">
                  <span className="font-semibold">
                    {language === 'it' ? flag.titleIt : flag.titleEn}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-current/10 border border-current/20 shrink-0">
                    {t(`fa.flag.${flag.severity}`)}
                  </span>
                </div>
                <div className="font-mono text-[10px] opacity-70 mb-1">{flag.dataPoint}</div>
                <div className="opacity-80 leading-relaxed">
                  {language === 'it' ? flag.explanationIt : flag.explanationEn}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Strengths */}
      <SectionCard title={t('fa.section.strengths')}>
        {analysis.strengths.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('fa.strengths.none')}</p>
        ) : (
          <div className="space-y-2">
            {analysis.strengths.map((s) => (
              <div
                key={s.key}
                className="rounded-lg border border-green-500/20 bg-green-500/5 px-3 py-2.5 text-xs text-green-700 dark:text-green-400"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <CheckCircle2 size={12} className="shrink-0" />
                  <span className="font-semibold">
                    {language === 'it' ? s.titleIt : s.titleEn}
                  </span>
                </div>
                <div className="font-mono text-[10px] opacity-70 mb-1">{s.dataPoint}</div>
                <div className="opacity-80 leading-relaxed">
                  {language === 'it' ? s.explanationIt : s.explanationEn}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
