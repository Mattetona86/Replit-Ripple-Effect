import { useTranslation } from '@/lib/i18n';
import { TrendingUp, AlertTriangle } from 'lucide-react';
import type { RippleAnalysis } from '@/lib/ripple-types';

const SEVERITY_COLOR: Record<string, string> = {
  high: 'border-red-200 bg-red-50/50',
  medium: 'border-amber-200 bg-amber-50/50',
  low: 'border-blue-200 bg-blue-50/50',
};
const SEVERITY_DOT: Record<string, string> = {
  high: 'bg-red-500',
  medium: 'bg-amber-500',
  low: 'bg-blue-400',
};

interface Props {
  analysis: RippleAnalysis;
}

export function CatalystRiskPanel({ analysis }: Props) {
  const { t } = useTranslation();

  const confirmSignals = analysis.confirmationSignals.slice(0, 4);
  const risks = analysis.risks.slice(0, 4);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Catalysts / Confirmation Signals */}
      <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={15} className="text-emerald-600" />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('rl.section.catalysts')}</p>
        </div>
        {confirmSignals.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('rl.none')}</p>
        ) : (
          <div className="space-y-3">
            {confirmSignals.map((s, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">{s.signal}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
                  <span className="text-[10px] text-muted-foreground/60 uppercase">{s.type}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Risks */}
      <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle size={15} className="text-orange-500" />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('rl.section.risks')}</p>
        </div>
        {risks.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('rl.none')}</p>
        ) : (
          <div className="space-y-3">
            {risks.map((r, i) => (
              <div key={i} className={`rounded-lg border p-3 ${SEVERITY_COLOR[r.severity] ?? 'border-border'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${SEVERITY_DOT[r.severity] ?? 'bg-gray-400'}`} />
                  <p className="text-sm font-semibold">{r.title}</p>
                </div>
                <p className="text-xs text-muted-foreground">{r.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
