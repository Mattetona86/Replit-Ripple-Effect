import { useTranslation } from '@/lib/i18n';
import type { RippleAnalysis } from '@/lib/ripple-types';

const IMPORTANCE_CONFIG = {
  STRUCTURAL_SHIFT: { label: 'Structural Shift', color: 'bg-violet-100 text-violet-800 border-violet-200' },
  THEME_BOOSTER: { label: 'Theme Booster', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  TACTICAL_CATALYST: { label: 'Tactical Catalyst', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  NOISE: { label: 'Noise', color: 'bg-gray-100 text-gray-600 border-gray-200' },
};

const DIRECTION_CONFIG: Record<string, { label: string; color: string }> = {
  very_positive: { label: '↑↑ Very Positive', color: 'text-emerald-700' },
  positive: { label: '↑ Positive', color: 'text-emerald-600' },
  neutral: { label: '→ Neutral', color: 'text-blue-600' },
  mixed: { label: '↕ Mixed', color: 'text-amber-600' },
  negative: { label: '↓ Negative', color: 'text-orange-600' },
  very_negative: { label: '↓↓ Very Negative', color: 'text-red-700' },
};

const HORIZON_LABELS: Record<string, string> = {
  immediate: 'Immediate (hours/days)',
  short_term: 'Short-term (1–8 weeks)',
  medium_term: 'Medium-term (2–12 months)',
  long_term: 'Long-term (12+ months)',
};

interface Props {
  analysis: RippleAnalysis;
}

export function EventSummary({ analysis }: Props) {
  const { t } = useTranslation();
  const { event, classification, news } = analysis;
  const imp = IMPORTANCE_CONFIG[classification.importance];
  const dir = DIRECTION_CONFIG[classification.direction];

  return (
    <div className="space-y-4">
      {/* News header */}
      <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              {news.source || 'News'}{news.publishedAt ? ` · ${news.publishedAt}` : ''}
            </p>
            <h2 className="text-base font-semibold leading-snug">{news.headline}</h2>
            {news.primaryTickers.length > 0 && (
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {news.primaryTickers.map(t => (
                  <span key={t} className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-mono font-semibold">{t}</span>
                ))}
              </div>
            )}
          </div>
          {news.url && (
            <a href={news.url} target="_blank" rel="noopener noreferrer"
               className="shrink-0 text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">
              Source ↗
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* What happened */}
        <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t('rl.section.whatHappened')}</p>
          <p className="text-sm leading-relaxed text-foreground">{event.eventSummary}</p>
          <div className="mt-3 pt-3 border-t border-border/60 space-y-1">
            <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">{t('rl.label.fact')}:</span> {event.factualStatement.replace(/^FACT:\s*/i, '')}</p>
            <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">{t('rl.label.inference')}:</span> {event.interpretation.replace(/^INFERENCE:\s*/i, '')}</p>
          </div>
        </div>

        {/* Why it matters */}
        <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t('rl.section.whyMatters')}</p>
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${imp.color}`}>{imp.label}</span>
              <span className={`text-sm font-medium ${dir.color}`}>{dir.label}</span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">{t('rl.label.horizon')}</p>
                <p className="font-medium text-xs">{HORIZON_LABELS[classification.timeHorizon]}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('rl.label.confidence')}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${classification.confidence}%` }} />
                  </div>
                  <span className="text-xs font-semibold">{classification.confidence}%</span>
                </div>
              </div>
            </div>
            {classification.themes.length > 0 && (
              <div className="flex gap-1.5 flex-wrap">
                {classification.themes.map(theme => (
                  <span key={theme} className="px-2 py-0.5 rounded-full text-xs bg-violet-50 text-violet-700 border border-violet-200">{theme}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Economic drivers */}
      {analysis.economicDrivers.length > 0 && (
        <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t('rl.section.drivers')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {analysis.economicDrivers.map((d, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${d.magnitude === 'high' ? 'bg-primary' : d.magnitude === 'medium' ? 'bg-amber-500' : 'bg-muted-foreground'}`} />
                <div>
                  <p className="text-sm font-medium">{d.driver}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{d.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
