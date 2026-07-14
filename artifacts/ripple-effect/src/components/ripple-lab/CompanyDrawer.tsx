import { useLocation } from 'wouter';
import { useTranslation } from '@/lib/i18n';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ArrowRight, ExternalLink, TrendingUp, AlertTriangle, Bookmark } from 'lucide-react';
import type { RippleAnalysis, RippleOpportunity } from '@/lib/ripple-types';
import {
  DIR_COLOR,
  DIR_I18N_KEY,
  REL_CONFIDENCE_COLOR,
  findRelationshipConfidence,
  fundamentalTier,
  valuationTier,
  scoreColorClass,
  isPartialScore,
} from './ripple-effect-shared';

const HORIZON_I18N_KEY: Record<string, string> = {
  immediate: 'immediate',
  short_term: 'short_term',
  medium_term: 'medium_term',
  long_term: 'long_term',
};

function ScoreRow({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      {value === null ? (
        <span className="text-xs text-muted-foreground/60 italic">N/A</span>
      ) : (
        <div className="flex items-center gap-2">
          <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary/60 rounded-full" style={{ width: `${value}%` }} />
          </div>
          <span className="text-xs font-semibold w-6 text-right">{value}</span>
        </div>
      )}
    </div>
  );
}

interface Props {
  opp: RippleOpportunity | null;
  analysis: RippleAnalysis;
  onClose: () => void;
}

export function CompanyDrawer({ opp, analysis, onClose }: Props) {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  if (!opp) return null;

  const dir = DIR_COLOR[opp.direction];
  const relConfidence = findRelationshipConfidence(analysis.rippleChain, opp.ticker);
  const fundamentalFit = fundamentalTier(opp.fundamentalScore);
  const valuationFit = valuationTier(opp.valuationScore);
  const partial = isPartialScore(opp);
  const missingComponents = [
    opp.fundamentalScore === null && t('rl.drawer.fundamentalQuality'),
    opp.valuationScore === null && t('rl.drawer.valuationAttractiveness'),
  ].filter((v): v is string => Boolean(v));

  // Best-effort industry step for the causal path — industries[] isn't
  // linked to specific companies in the data model, so this shows the
  // top industry rather than fabricating a direct company->industry edge.
  const industry = analysis.industries[0];

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
              <span className={`text-2xl font-bold tabular-nums ${scoreColorClass(opp.rippleOpportunityScore)}`}>
                {Math.round(opp.rippleOpportunityScore)}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {partial ? t('rl.drawer.partialScore') : t('rl.drawer.score')}
              </span>
            </div>
          </SheetTitle>
        </SheetHeader>

        {/* Meta badges: direction, relationship confidence, and score are always shown separately */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-blue-50 text-blue-700">
            {opp.rippleLevel === 1 ? t('rl.level.direct') : t('rl.level.secondOrder')}
          </span>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${dir.bg} ${dir.text}`}>
            {t(`rl.direction.${DIR_I18N_KEY[opp.direction]}`)}
          </span>
          {relConfidence ? (
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${REL_CONFIDENCE_COLOR[relConfidence]}`}>
              {t(`rl.relConfidence.${relConfidence}`)}
            </span>
          ) : (
            <span className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground">{t('rl.relConfidence.unavailable')}</span>
          )}
          <span className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground">{t(`rl.horizon.${HORIZON_I18N_KEY[opp.timeHorizon]}`)}</span>
        </div>

        {/* Causal path: Article -> Driver -> Industry -> Company */}
        <div className="mb-4 bg-slate-50 rounded-xl p-3">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t('rl.drawer.causalPath')}</p>
          <div className="flex flex-wrap items-center gap-1 text-xs">
            <span className="font-medium text-primary">{analysis.event.eventTitle}</span>
            <ArrowRight size={11} className="text-muted-foreground/50" />
            {analysis.economicDrivers.slice(0, 2).map((d, i) => (
              <span key={i} className="flex items-center gap-1">
                <span className="text-muted-foreground">{d.driver}</span>
                <ArrowRight size={11} className="text-muted-foreground/50" />
              </span>
            ))}
            {industry && (
              <span className="flex items-center gap-1">
                <span className="text-violet-600">{industry.name}</span>
                <ArrowRight size={11} className="text-muted-foreground/50" />
              </span>
            )}
            <span className="font-semibold">{opp.companyName}</span>
          </div>
        </div>

        {/* Why this company */}
        <div className="mb-4">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{t('rl.drawer.why')}</p>
          <p className="text-sm leading-relaxed">{opp.whyItMatters}</p>
        </div>

        {/* Economic mechanism */}
        <div className="mb-4">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{t('rl.drawer.mechanism')}</p>
          <p className="text-sm leading-relaxed text-muted-foreground">{opp.mechanism}</p>
        </div>

        {/* Score breakdown */}
        <div className="mb-4 border border-border rounded-xl p-3.5">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t('rl.drawer.breakdown')}</p>
          <ScoreRow label={t('rl.drawer.exposure')} value={opp.exposureScore} />
          <ScoreRow label={t('rl.drawer.causality')} value={opp.causalityScore} />
          <ScoreRow label={t('rl.drawer.timing')} value={opp.timingScore} />
          <ScoreRow label={t('rl.drawer.fundamentalQuality')} value={opp.fundamentalScore} />
          <ScoreRow label={t('rl.drawer.valuationAttractiveness')} value={opp.valuationScore} />
          <ScoreRow label={t('rl.drawer.confirmation')} value={opp.confirmationScore} />
          <div className="flex items-center justify-between py-1.5">
            <span className="text-xs text-muted-foreground">{t('rl.drawer.riskAdj')}</span>
            <span className="text-xs font-semibold">{100 - opp.riskScore} pts</span>
          </div>
          {partial && (
            <p className="text-[10px] text-amber-600 mt-2 border-t border-amber-100 pt-2">
              {t('rl.drawer.partialNote')} {missingComponents.join(', ')}
            </p>
          )}
        </div>

        {/* Fundamental & valuation status */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-muted/30 rounded-lg p-2.5">
            <p className="text-[10px] text-muted-foreground mb-0.5">{t('rl.drawer.fundamentalStatus')}</p>
            <p className="text-sm font-semibold">{t(`rl.fundamental.${fundamentalFit}`)}</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-2.5">
            <p className="text-[10px] text-muted-foreground mb-0.5">{t('rl.drawer.valuationStatus')}</p>
            <p className="text-sm font-semibold">{t(`rl.valuation.${valuationFit}`)}</p>
          </div>
        </div>

        {/* Metrics to monitor */}
        {opp.metricsToMonitor.length > 0 && (
          <div className="mb-4">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{t('rl.drawer.metrics')}</p>
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
            <p className="text-[10px] font-semibold text-red-700 uppercase tracking-wider mb-0.5">{t('rl.drawer.mainRisk')}</p>
            <p className="text-xs text-red-800 leading-snug">{opp.mainRisk}</p>
          </div>
        </div>

        {/* Confirmation signals (analysis-level — not yet scoped per company) */}
        {analysis.confirmationSignals.length > 0 && (
          <div className="mb-4">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              <span className="text-emerald-700">✓</span> {t('rl.drawer.confirmationSignals')}
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

        {/* Invalidation signals (analysis-level) */}
        {analysis.invalidationSignals.length > 0 && (
          <div className="mb-4">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              <span className="text-red-600">✗</span> {t('rl.drawer.invalidationSignals')}
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

        {/* Source evidence (per-company) */}
        {opp.evidence.length > 0 && (
          <div className="mb-5">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{t('rl.drawer.evidence')}</p>
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
            {t('rl.drawer.openFundamental')}
          </Button>
          <Button
            variant="outline"
            className="w-full gap-1.5 text-sm"
            onClick={() => { setLocation(`/products/technical-analysis?symbol=${opp.ticker}`); onClose(); }}
          >
            <ExternalLink size={14} />
            {t('rl.drawer.openTechnical')}
          </Button>
          <Button variant="outline" className="w-full gap-1.5 text-sm" disabled title={t('rl.drawer.comingSoon')}>
            <Bookmark size={14} />
            {t('rl.drawer.watchlist')}
            <span className="text-[10px] text-muted-foreground ml-1">({t('rl.drawer.comingSoon')})</span>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
