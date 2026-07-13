import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { useTranslation } from '@/lib/i18n';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import type { RippleAnalysis, RippleOpportunity, RippleChainNode } from '@/lib/ripple-types';
import {
  ChevronUp, ChevronDown, ExternalLink, ArrowRight,
  TrendingUp, AlertTriangle, Minus, Activity,
} from 'lucide-react';

// ─── Palette helpers ──────────────────────────────────────────────────────────

const DIR_COLOR: Record<string, { text: string; bg: string; dot: string; label: string }> = {
  very_positive: { text: 'text-emerald-700', bg: 'bg-emerald-50',  dot: 'bg-emerald-500', label: 'Positive' },
  positive:      { text: 'text-emerald-600', bg: 'bg-emerald-50',  dot: 'bg-emerald-400', label: 'Positive' },
  neutral:       { text: 'text-blue-600',    bg: 'bg-blue-50',     dot: 'bg-blue-400',    label: 'Neutral'  },
  mixed:         { text: 'text-amber-600',   bg: 'bg-amber-50',    dot: 'bg-amber-400',   label: 'Mixed'    },
  negative:      { text: 'text-red-600',     bg: 'bg-red-50',      dot: 'bg-red-400',     label: 'Negative' },
  very_negative: { text: 'text-red-700',     bg: 'bg-red-50',      dot: 'bg-red-500',     label: 'Negative' },
};

const REL_LABEL: Record<string, { label: string; color: string; dash: string }> = {
  confirmed:         { label: 'Confirmed', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dash: 'border-solid' },
  strongly_supported:{ label: 'Supported', color: 'bg-blue-50 text-blue-700 border-blue-200',         dash: 'border-dashed' },
  plausible:         { label: 'Plausible', color: 'bg-amber-50 text-amber-700 border-amber-200',       dash: 'border-dotted' },
  speculative:       { label: 'Speculative', color: 'bg-gray-50 text-gray-500 border-gray-200',        dash: 'border-dotted' },
};

const HORIZON_LABEL: Record<string, string> = {
  immediate:   'Immediate',
  short_term:  'Short-term',
  medium_term: 'Medium-term',
  long_term:   'Long-term',
};

const LEVEL_LABEL: Record<number, { label: string; color: string }> = {
  0: { label: 'L0 Primary', color: 'bg-violet-50 text-violet-700' },
  1: { label: 'L1 Direct',  color: 'bg-blue-50 text-blue-700'     },
  2: { label: 'L2 Indirect',color: 'bg-slate-50 text-slate-600'   },
};

function fundamentalFit(score: number | null): { label: string; color: string } {
  if (score === null) return { label: 'Unavailable', color: 'text-muted-foreground' };
  if (score >= 80) return { label: 'Strong',   color: 'text-emerald-700' };
  if (score >= 65) return { label: 'Good',     color: 'text-blue-700'   };
  if (score >= 45) return { label: 'Neutral',  color: 'text-slate-600'  };
  return               { label: 'Weak',     color: 'text-red-600'    };
}

function scoreColor(s: number) {
  if (s >= 70) return 'text-emerald-700';
  if (s >= 50) return 'text-amber-700';
  return 'text-red-600';
}

function truncateMechanism(m: string, maxWords = 12) {
  const words = m.split(' ');
  if (words.length <= maxWords) return m;
  return words.slice(0, maxWords).join(' ') + '…';
}

// ─── Economic Transmission ───────────────────────────────────────────────────

interface TransmissionProps { analysis: RippleAnalysis }

function EconomicTransmission({ analysis }: TransmissionProps) {
  const drivers = analysis.economicDrivers.slice(0, 5);
  if (drivers.length === 0) return null;

  const MAG: Record<string, string> = {
    high:   'text-red-600',
    medium: 'text-amber-600',
    low:    'text-slate-500',
  };

  return (
    <div className="border border-border/70 rounded-xl bg-slate-50/60 px-4 py-3 mb-4">
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
        Economic transmission
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        {drivers.map((d, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="flex flex-col">
              <span className="text-xs font-medium leading-snug">{d.driver}</span>
              <span className={`text-[10px] ${MAG[d.magnitude] ?? 'text-slate-500'}`}>{d.magnitude} impact</span>
            </div>
            {i < drivers.length - 1 && <ArrowRight size={12} className="text-muted-foreground/50 shrink-0" />}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Opportunities Table ─────────────────────────────────────────────────────

type SortKey = 'rippleOpportunityScore' | 'confidence' | 'rippleLevel' | 'timeHorizon';

const TIME_RANK: Record<string, number> = {
  immediate: 0, short_term: 1, medium_term: 2, long_term: 3,
};

function sortOpps(opps: RippleOpportunity[], key: SortKey, dir: 'asc' | 'desc') {
  const mul = dir === 'asc' ? 1 : -1;
  return [...opps].sort((a, b) => {
    if (key === 'rippleOpportunityScore') return (a.rippleOpportunityScore - b.rippleOpportunityScore) * mul;
    if (key === 'confidence') return (a.confidence - b.confidence) * mul;
    if (key === 'rippleLevel') return (a.rippleLevel - b.rippleLevel) * mul;
    if (key === 'timeHorizon') return ((TIME_RANK[a.timeHorizon] ?? 2) - (TIME_RANK[b.timeHorizon] ?? 2)) * mul;
    return 0;
  });
}

interface TableProps {
  opps: RippleOpportunity[];
  onSelect: (o: RippleOpportunity) => void;
}

function OpportunitiesTable({ opps, onSelect }: TableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('rippleOpportunityScore');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const sorted = useMemo(() => sortOpps(opps, sortKey, sortDir), [opps, sortKey, sortDir]);

  function toggle(k: SortKey) {
    if (k === sortKey) { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }
    else { setSortKey(k); setSortDir('desc'); }
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (k !== sortKey) return <ChevronUp size={11} className="text-muted-foreground/30" />;
    return sortDir === 'asc'
      ? <ChevronUp size={11} className="text-primary" />
      : <ChevronDown size={11} className="text-primary" />;
  }

  function Th({ label, k, right }: { label: string; k?: SortKey; right?: boolean }) {
    return (
      <th
        className={`py-2.5 px-3 text-left text-[11px] font-semibold text-muted-foreground whitespace-nowrap select-none ${k ? 'cursor-pointer hover:text-foreground' : ''} ${right ? 'text-right' : ''}`}
        onClick={k ? () => toggle(k) : undefined}
      >
        <span className="inline-flex items-center gap-0.5">{label}{k && <SortIcon k={k} />}</span>
      </th>
    );
  }

  if (opps.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No companies identified.</p>;
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-muted/40 border-b border-border">
            <tr>
              <Th label="#" />
              <Th label="Company" />
              <Th label="Level" k="rippleLevel" />
              <Th label="Direction" />
              <Th label="Economic link" />
              <Th label="Horizon" k="timeHorizon" />
              <Th label="Confidence" k="confidence" />
              <Th label="Fundamental fit" />
              <Th label="Score" k="rippleOpportunityScore" right />
            </tr>
          </thead>
          <tbody>
            {sorted.map((opp, i) => {
              const dir = DIR_COLOR[opp.direction] ?? DIR_COLOR.neutral;
              const lvl = LEVEL_LABEL[opp.rippleLevel] ?? LEVEL_LABEL[1];
              const rel = REL_LABEL[opp.confidence >= 75 ? 'confirmed' : opp.confidence >= 55 ? 'strongly_supported' : 'plausible'];
              const fit = fundamentalFit(opp.fundamentalScore);
              const isPartial = opp.fundamentalScore === null || opp.valuationScore === null;

              return (
                <tr
                  key={opp.ticker}
                  className="border-b border-border/50 hover:bg-muted/20 cursor-pointer transition-colors"
                  style={{ height: '68px' }}
                  onClick={() => onSelect(opp)}
                >
                  {/* Rank */}
                  <td className="px-3 text-muted-foreground font-semibold text-xs">
                    {i + 1}
                  </td>
                  {/* Company */}
                  <td className="px-3">
                    <div className="font-semibold text-sm">{opp.companyName}</div>
                    <div className="text-xs text-muted-foreground font-mono">{opp.ticker}</div>
                  </td>
                  {/* Level */}
                  <td className="px-3">
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${lvl.color}`}>{lvl.label}</span>
                  </td>
                  {/* Direction */}
                  <td className="px-3">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${dir.dot}`} />
                      <span className={`text-xs font-medium ${dir.text}`}>{dir.label}</span>
                    </div>
                  </td>
                  {/* Economic link */}
                  <td className="px-3 max-w-[160px]">
                    <span className="text-xs text-foreground leading-snug line-clamp-2">{truncateMechanism(opp.mechanism)}</span>
                  </td>
                  {/* Horizon */}
                  <td className="px-3">
                    <span className="text-xs text-muted-foreground">{HORIZON_LABEL[opp.timeHorizon]}</span>
                  </td>
                  {/* Confidence */}
                  <td className="px-3">
                    <div className="text-xs font-medium mb-0.5">{opp.confidence}%</div>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${rel.color}`}>{rel.label}</span>
                  </td>
                  {/* Fundamental fit */}
                  <td className="px-3">
                    <span className={`text-xs font-medium ${fit.color}`}>{fit.label}</span>
                  </td>
                  {/* Score */}
                  <td className="px-3 text-right">
                    <div className="inline-flex flex-col items-end">
                      <span className={`text-base font-bold tabular-nums ${scoreColor(opp.rippleOpportunityScore)}`}>
                        {Math.round(opp.rippleOpportunityScore)}
                      </span>
                      <div className="w-14 h-1 rounded-full bg-muted overflow-hidden mt-0.5">
                        <div
                          className={`h-full rounded-full ${opp.rippleOpportunityScore >= 70 ? 'bg-emerald-500' : opp.rippleOpportunityScore >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                          style={{ width: `${opp.rippleOpportunityScore}%` }}
                        />
                      </div>
                      {isPartial && <span className="text-[9px] text-muted-foreground mt-0.5">partial</span>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {sorted.map((opp, i) => {
          const dir = DIR_COLOR[opp.direction] ?? DIR_COLOR.neutral;
          const lvl = LEVEL_LABEL[opp.rippleLevel] ?? LEVEL_LABEL[1];
          const isPartial = opp.fundamentalScore === null || opp.valuationScore === null;
          return (
            <div
              key={opp.ticker}
              className="bg-white border border-border rounded-xl p-3.5 flex items-center gap-3 cursor-pointer active:bg-muted/20"
              onClick={() => onSelect(opp)}
            >
              <div className="text-sm font-bold text-muted-foreground w-5 shrink-0">{i + 1}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="font-semibold text-sm">{opp.companyName}</span>
                  <span className="text-xs font-mono text-muted-foreground">{opp.ticker}</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${lvl.color}`}>{lvl.label}</span>
                  <span className={`text-[10px] font-medium ${dir.text}`}>{dir.label}</span>
                  <span className="text-[10px] text-muted-foreground">{HORIZON_LABEL[opp.timeHorizon]}</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">{truncateMechanism(opp.mechanism, 10)}</p>
              </div>
              <div className="flex flex-col items-center shrink-0">
                <span className={`text-lg font-bold tabular-nums ${scoreColor(opp.rippleOpportunityScore)}`}>
                  {Math.round(opp.rippleOpportunityScore)}
                </span>
                {isPartial && <span className="text-[9px] text-muted-foreground">partial</span>}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─── Chain View ───────────────────────────────────────────────────────────────

interface ChainViewProps { analysis: RippleAnalysis }

function ChainNodePill({ node }: { node: RippleChainNode }) {
  const dir = DIR_COLOR[node.direction] ?? DIR_COLOR.neutral;
  const rel = REL_LABEL[node.relationship] ?? REL_LABEL.plausible;
  return (
    <div className={`rounded-lg border bg-white px-3 py-2 text-xs shadow-sm ${rel.dash === 'border-solid' ? 'border-border' : rel.dash === 'border-dashed' ? 'border-dashed border-border' : 'border-dotted border-border/60'}`}>
      <div className="font-semibold leading-tight">{node.label}</div>
      {node.ticker && <div className="text-[10px] font-mono text-primary">{node.ticker}</div>}
      <div className="flex items-center gap-1.5 mt-1">
        <div className={`w-1.5 h-1.5 rounded-full ${dir.dot}`} />
        <span className={`text-[10px] font-medium ${dir.text}`}>{dir.label}</span>
        <span className="text-[10px] text-muted-foreground">{node.confidence}%</span>
      </div>
    </div>
  );
}

function ChainView({ analysis }: ChainViewProps) {
  const [showMoreL1, setShowMoreL1] = useState(false);
  const [showMoreL2, setShowMoreL2] = useState(false);

  const drivers = analysis.rippleChain.filter(n => n.level === 0).slice(0, 3);
  const l1All = analysis.rippleChain.filter(n => n.level === 1);
  const l2All = analysis.rippleChain.filter(n => n.level === 2);
  const l1 = showMoreL1 ? l1All : l1All.slice(0, 5);
  const l2 = showMoreL2 ? l2All : l2All.slice(0, 5);

  const columns = [
    { label: 'L0 Primary', nodes: drivers, hasMore: false, showMore: false, onMore: () => {} },
    { label: 'L1 Direct',  nodes: l1, hasMore: l1All.length > 5, showMore: showMoreL1, onMore: () => setShowMoreL1(v => !v) },
    { label: 'L2 Indirect',nodes: l2, hasMore: l2All.length > 5, showMore: showMoreL2, onMore: () => setShowMoreL2(v => !v) },
  ].filter(c => c.nodes.length > 0);

  if (columns.length === 0) return <p className="text-sm text-muted-foreground text-center py-8">No chain data.</p>;

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex gap-4 min-w-max items-start">
        {/* News node */}
        <div className="flex flex-col items-center gap-2">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Event</div>
          <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs max-w-[140px]">
            <div className="font-semibold text-primary leading-snug line-clamp-3">
              {analysis.news.headline}
            </div>
          </div>
        </div>

        {columns.map((col, ci) => (
          <div key={col.label} className="flex items-start gap-4">
            {/* Arrow */}
            <div className="flex items-center self-center mt-6 text-muted-foreground/40">
              <ArrowRight size={16} />
            </div>
            {/* Column */}
            <div className="flex flex-col gap-2">
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{col.label}</div>
              {col.nodes.map(node => <ChainNodePill key={node.id} node={node} />)}
              {col.hasMore && (
                <button
                  className="text-[11px] text-primary hover:underline text-left mt-0.5"
                  onClick={col.onMore}
                >
                  {col.showMore ? 'Show less' : `+${(col.label.includes('L1') ? l1All : l2All).length - 5} more`}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Risks Table ──────────────────────────────────────────────────────────────

interface RisksProps {
  opps: RippleOpportunity[];
  onSelect: (o: RippleOpportunity) => void;
}

function RisksTable({ opps, onSelect }: RisksProps) {
  const atRisk = opps.filter(o =>
    o.direction === 'negative' || o.direction === 'very_negative' || o.direction === 'mixed'
  );

  if (atRisk.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="inline-flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 px-4 py-2 rounded-full border border-emerald-200">
          <Activity size={14} />
          No negative or mixed-impact companies identified.
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Desktop */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-muted/40 border-b border-border">
            <tr>
              {['Company', 'Negative mechanism', 'Horizon', 'Confidence', 'Main risk'].map(h => (
                <th key={h} className="py-2.5 px-3 text-left text-[11px] font-semibold text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {atRisk.map(opp => {
              const dir = DIR_COLOR[opp.direction] ?? DIR_COLOR.mixed;
              const rel = REL_LABEL[opp.confidence >= 75 ? 'confirmed' : opp.confidence >= 55 ? 'strongly_supported' : 'plausible'];
              return (
                <tr
                  key={opp.ticker}
                  className="border-b border-border/50 hover:bg-muted/20 cursor-pointer transition-colors"
                  style={{ height: '68px' }}
                  onClick={() => onSelect(opp)}
                >
                  <td className="px-3">
                    <div className="font-semibold text-sm">{opp.companyName}</div>
                    <div className="text-xs font-mono text-muted-foreground">{opp.ticker}</div>
                  </td>
                  <td className="px-3 max-w-[180px]">
                    <p className="text-xs leading-snug line-clamp-2">{truncateMechanism(opp.mechanism)}</p>
                  </td>
                  <td className="px-3">
                    <span className="text-xs text-muted-foreground">{HORIZON_LABEL[opp.timeHorizon]}</span>
                  </td>
                  <td className="px-3">
                    <div className="text-xs font-medium mb-0.5">{opp.confidence}%</div>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${rel.color}`}>{rel.label}</span>
                  </td>
                  <td className="px-3 max-w-[200px]">
                    <p className="text-xs text-muted-foreground leading-snug line-clamp-2">{opp.mainRisk}</p>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="md:hidden space-y-2">
        {atRisk.map(opp => {
          const dir = DIR_COLOR[opp.direction] ?? DIR_COLOR.mixed;
          return (
            <div
              key={opp.ticker}
              className="bg-white border border-border rounded-xl p-3.5 cursor-pointer"
              onClick={() => onSelect(opp)}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{opp.companyName}</span>
                  <span className="text-xs font-mono text-muted-foreground">{opp.ticker}</span>
                </div>
                <div className={`flex items-center gap-1`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${dir.dot}`} />
                  <span className={`text-xs font-medium ${dir.text}`}>{dir.label}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{opp.mainRisk}</p>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─── Company Drawer ───────────────────────────────────────────────────────────

interface DrawerProps {
  opp: RippleOpportunity | null;
  analysis: RippleAnalysis;
  onClose: () => void;
}

function ScoreRow({ label, value, partial }: { label: string; value: number | null; partial?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      {value === null
        ? <span className="text-xs text-muted-foreground/60 italic">N/A</span>
        : (
          <div className="flex items-center gap-2">
            <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary/60 rounded-full" style={{ width: `${value}%` }} />
            </div>
            <span className="text-xs font-semibold w-6 text-right">{value}</span>
          </div>
        )
      }
    </div>
  );
}

function CompanyDrawer({ opp, analysis, onClose }: DrawerProps) {
  const [, setLocation] = useLocation();
  if (!opp) return null;

  const dir = DIR_COLOR[opp.direction] ?? DIR_COLOR.neutral;
  const lvl = LEVEL_LABEL[opp.rippleLevel] ?? LEVEL_LABEL[1];
  const fit = fundamentalFit(opp.fundamentalScore);
  const isPartial = opp.fundamentalScore === null || opp.valuationScore === null;

  return (
    <Sheet open={!!opp} onOpenChange={open => { if (!open) onClose(); }}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto" side="right">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-start justify-between gap-2 pr-8">
            <div>
              <div className="text-lg font-bold">{opp.companyName}</div>
              <div className="text-sm font-mono text-muted-foreground">{opp.ticker}</div>
            </div>
            <div className="flex flex-col items-end shrink-0">
              <span className={`text-2xl font-bold tabular-nums ${scoreColor(opp.rippleOpportunityScore)}`}>
                {Math.round(opp.rippleOpportunityScore)}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {isPartial ? 'Partial Ripple Score' : 'Ripple Score'}
              </span>
            </div>
          </SheetTitle>
        </SheetHeader>

        {/* Meta badges */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${lvl.color}`}>{lvl.label}</span>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${dir.bg} ${dir.text}`}>{dir.label}</span>
          <span className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground">{opp.confidence}% confidence</span>
          <span className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground">{HORIZON_LABEL[opp.timeHorizon]}</span>
        </div>

        {/* Causal path */}
        <div className="mb-4 bg-slate-50 rounded-xl p-3">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Causal path</p>
          <div className="flex flex-wrap items-center gap-1 text-xs">
            <span className="font-medium text-primary">News</span>
            <ArrowRight size={11} className="text-muted-foreground/50" />
            {analysis.economicDrivers.slice(0, 2).map((d, i) => (
              <span key={i} className="flex items-center gap-1">
                <span className="text-muted-foreground">{d.driver}</span>
                <ArrowRight size={11} className="text-muted-foreground/50" />
              </span>
            ))}
            <span className="font-semibold">{opp.companyName}</span>
          </div>
        </div>

        {/* Why this company */}
        <div className="mb-4">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Why this company</p>
          <p className="text-sm leading-relaxed">{opp.whyItMatters}</p>
        </div>

        {/* Economic mechanism */}
        <div className="mb-4">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Economic mechanism</p>
          <p className="text-sm leading-relaxed text-muted-foreground">{opp.mechanism}</p>
        </div>

        {/* Score breakdown */}
        <div className="mb-4 border border-border rounded-xl p-3.5">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Score breakdown</p>
          <ScoreRow label="Exposure (30%)" value={opp.exposureScore} />
          <ScoreRow label="Causality (20%)" value={opp.causalityScore} />
          <ScoreRow label="Timing (10%)" value={opp.timingScore} />
          <ScoreRow label="Fundamental fit (15%)" value={opp.fundamentalScore} partial />
          <ScoreRow label="Valuation (10%)" value={opp.valuationScore} partial />
          <ScoreRow label="Confirmation (10%)" value={opp.confirmationScore} />
          <div className="flex items-center justify-between py-1.5">
            <span className="text-xs text-muted-foreground">Risk adj. (5%)</span>
            <span className="text-xs font-semibold">{100 - opp.riskScore} pts</span>
          </div>
          {isPartial && (
            <p className="text-[10px] text-amber-600 mt-2 border-t border-amber-100 pt-2">
              Partial score — fundamentals or valuation unavailable.
            </p>
          )}
        </div>

        {/* Fundamental & Valuation */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-muted/30 rounded-lg p-2.5">
            <p className="text-[10px] text-muted-foreground mb-0.5">Fundamental fit</p>
            <p className={`text-sm font-semibold ${fit.color}`}>{fit.label}</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-2.5">
            <p className="text-[10px] text-muted-foreground mb-0.5">Valuation</p>
            <p className="text-sm font-semibold">{opp.valuationScore !== null ? `${opp.valuationScore}/100` : 'Unavailable'}</p>
          </div>
        </div>

        {/* Metrics to monitor */}
        {opp.metricsToMonitor.length > 0 && (
          <div className="mb-4">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Metrics to monitor</p>
            <div className="flex flex-wrap gap-1.5">
              {opp.metricsToMonitor.map(m => (
                <span key={m} className="text-[11px] px-2 py-0.5 rounded-full bg-muted font-medium">{m}</span>
              ))}
            </div>
          </div>
        )}

        {/* Main risk */}
        <div className="mb-4 flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
          <AlertTriangle size={13} className="text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-[10px] font-semibold text-red-700 uppercase tracking-wider mb-0.5">Main risk</p>
            <p className="text-xs text-red-800 leading-snug">{opp.mainRisk}</p>
          </div>
        </div>

        {/* Confirmation signals */}
        {analysis.confirmationSignals.length > 0 && (
          <div className="mb-4">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              <span className="text-emerald-700">✓</span> Confirmation signals
            </p>
            <div className="space-y-1.5">
              {analysis.confirmationSignals.slice(0, 3).map((s, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                  <p className="text-xs text-muted-foreground">{s.signal}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Invalidation signals */}
        {analysis.invalidationSignals.length > 0 && (
          <div className="mb-4">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              <span className="text-red-600">✗</span> Invalidation signals
            </p>
            <div className="space-y-1.5">
              {analysis.invalidationSignals.slice(0, 3).map((s, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                  <p className="text-xs text-muted-foreground">{s.signal}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Evidence */}
        {opp.evidence.length > 0 && (
          <div className="mb-5">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Evidence basis</p>
            <div className="space-y-1">
              {opp.evidence.map((e, i) => (
                <p key={i} className="text-xs text-muted-foreground leading-snug">• {e}</p>
              ))}
            </div>
          </div>
        )}

        {/* CTAs */}
        <div className="flex flex-col gap-2 pt-2 border-t border-border">
          <Button
            className="w-full gap-1.5 text-sm"
            onClick={() => { setLocation(`/products/fundamental-analysis?symbol=${opp.ticker}`); onClose(); }}
          >
            <TrendingUp size={14} />
            Open Fundamental Analysis
          </Button>
          <Button
            variant="outline"
            className="w-full gap-1.5 text-sm"
            onClick={() => { setLocation(`/products/technical-analysis?symbol=${opp.ticker}`); onClose(); }}
          >
            <ExternalLink size={14} />
            Open Technical Analysis
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────

function StatsBar({ analysis }: { analysis: RippleAnalysis }) {
  const opps = analysis.opportunities;
  const positive = opps.filter(o => o.direction === 'positive' || o.direction === 'very_positive').length;
  const mixed    = opps.filter(o => o.direction === 'mixed').length;
  const negative = opps.filter(o => o.direction === 'negative' || o.direction === 'very_negative').length;
  const avgConf  = opps.length > 0
    ? Math.round(opps.reduce((a, b) => a + b.confidence, 0) / opps.length)
    : analysis.classification.confidence;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
      <span className="font-medium text-foreground">{opps.length} companies identified</span>
      {positive > 0 && <span className="text-emerald-700 font-medium">· {positive} positive</span>}
      {mixed > 0    && <span className="text-amber-600 font-medium">· {mixed} mixed</span>}
      {negative > 0 && <span className="text-red-600 font-medium">· {negative} negative</span>}
      <span className="text-muted-foreground">· Overall confidence {avgConf}%</span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props { analysis: RippleAnalysis }

export function RippleEffect({ analysis }: Props) {
  const [selected, setSelected] = useState<RippleOpportunity | null>(null);

  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-border/50">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <h2 className="text-base font-semibold tracking-tight">Ripple Effect</h2>
        </div>
        <StatsBar analysis={analysis} />
      </div>

      {/* Content */}
      <div className="p-5">
        <EconomicTransmission analysis={analysis} />

        <Tabs defaultValue="opportunities">
          <TabsList className="mb-4">
            <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
            <TabsTrigger value="chain">Chain</TabsTrigger>
            <TabsTrigger value="risks">Risks</TabsTrigger>
          </TabsList>

          <TabsContent value="opportunities">
            <OpportunitiesTable opps={analysis.opportunities} onSelect={setSelected} />
          </TabsContent>

          <TabsContent value="chain">
            <ChainView analysis={analysis} />
          </TabsContent>

          <TabsContent value="risks">
            <RisksTable opps={analysis.opportunities} onSelect={setSelected} />
          </TabsContent>
        </Tabs>
      </div>

      <CompanyDrawer opp={selected} analysis={analysis} onClose={() => setSelected(null)} />
    </div>
  );
}
