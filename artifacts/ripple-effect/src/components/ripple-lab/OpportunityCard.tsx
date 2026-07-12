import { useTranslation } from '@/lib/i18n';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import type { RippleOpportunity } from '@/lib/ripple-types';
import { ExternalLink, TrendingUp, AlertTriangle } from 'lucide-react';

const DIRECTION_COLOR: Record<string, string> = {
  very_positive: 'text-emerald-700',
  positive: 'text-emerald-600',
  neutral: 'text-blue-600',
  mixed: 'text-amber-600',
  negative: 'text-orange-600',
  very_negative: 'text-red-700',
};

const HORIZON_SHORT: Record<string, string> = {
  immediate: 'Immediate',
  short_term: 'Short-term',
  medium_term: 'Medium-term',
  long_term: 'Long-term',
};

function ScoreBar({ value, label }: { value: number | null; label: string }) {
  if (value === null) return (
    <div>
      <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
      <p className="text-[10px] font-medium text-muted-foreground/60">N/A</p>
    </div>
  );
  return (
    <div>
      <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
      <div className="flex items-center gap-1.5">
        <div className="w-12 h-1 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-primary/70 rounded-full" style={{ width: `${value}%` }} />
        </div>
        <span className="text-[10px] font-semibold">{value}</span>
      </div>
    </div>
  );
}

interface Props {
  opp: RippleOpportunity;
  rank: number;
}

export function OpportunityCard({ opp, rank }: Props) {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();

  const dirColor = DIRECTION_COLOR[opp.direction] ?? 'text-gray-600';
  const scoreColor = opp.rippleOpportunityScore >= 70 ? 'text-emerald-700' : opp.rippleOpportunityScore >= 50 ? 'text-amber-700' : 'text-orange-700';
  const scoreRing = opp.rippleOpportunityScore >= 70 ? 'ring-emerald-200' : opp.rippleOpportunityScore >= 50 ? 'ring-amber-200' : 'ring-orange-200';

  return (
    <div className="bg-white rounded-2xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground shrink-0">
            {rank}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight">{opp.ticker}</span>
              <span className="text-xs text-muted-foreground">{opp.companyName}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-md ${opp.rippleLevel === 1 ? 'bg-blue-50 text-blue-700' : 'bg-violet-50 text-violet-700'}`}>
                {opp.rippleLevel === 1 ? 'Direct' : 'Second-order'}
              </span>
              <span className="text-xs text-muted-foreground">{opp.relationshipType.replace('_', ' ')}</span>
            </div>
          </div>
        </div>
        {/* Ripple Score */}
        <div className={`flex flex-col items-center shrink-0 ring-2 rounded-xl px-3 py-2 ${scoreRing}`}>
          <span className={`text-xl font-bold ${scoreColor}`}>{Math.round(opp.rippleOpportunityScore)}</span>
          <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Ripple</span>
        </div>
      </div>

      {/* Why this company */}
      <div className="bg-muted/30 rounded-lg px-3 py-2 mb-3">
        <p className="text-xs font-medium text-muted-foreground mb-0.5 flex items-center gap-1">
          <TrendingUp size={10} /> {t('rl.opp.why')}
        </p>
        <p className="text-sm leading-snug">{opp.whyItMatters}</p>
      </div>

      {/* Direction + horizon */}
      <div className="flex items-center gap-3 mb-3">
        <span className={`text-xs font-semibold ${dirColor}`}>{opp.direction.replace('_', ' ')}</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-xs text-muted-foreground">{HORIZON_SHORT[opp.timeHorizon]}</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-xs text-muted-foreground">{opp.confidence}% confidence</span>
      </div>

      {/* Scores */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <ScoreBar value={opp.exposureScore} label="Exposure" />
        <ScoreBar value={opp.fundamentalScore} label="Fundamentals" />
        <ScoreBar value={opp.valuationScore} label="Valuation" />
      </div>

      {/* Metrics to monitor */}
      {opp.metricsToMonitor.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">{t('rl.opp.metrics')}</p>
          <div className="flex gap-1.5 flex-wrap">
            {opp.metricsToMonitor.map(m => (
              <span key={m} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-foreground font-medium">{m}</span>
            ))}
          </div>
        </div>
      )}

      {/* Main risk */}
      <div className="flex items-start gap-1.5 bg-orange-50/50 border border-orange-100 rounded-lg px-2.5 py-2 mb-3">
        <AlertTriangle size={11} className="text-orange-500 mt-0.5 shrink-0" />
        <p className="text-[11px] text-orange-800 leading-snug">{opp.mainRisk}</p>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-full gap-1.5 text-xs"
        onClick={() => setLocation(`/products/fundamental-analysis?symbol=${opp.ticker}`)}
      >
        <ExternalLink size={12} />
        {t('rl.opp.openAnalysis')}
      </Button>
    </div>
  );
}
