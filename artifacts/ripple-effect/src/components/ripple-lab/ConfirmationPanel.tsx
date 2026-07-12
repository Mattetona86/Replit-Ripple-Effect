import { useTranslation } from '@/lib/i18n';
import { CheckCircle2, XCircle } from 'lucide-react';
import type { RippleAnalysis } from '@/lib/ripple-types';

interface Props {
  analysis: RippleAnalysis;
}

export function ConfirmationPanel({ analysis }: Props) {
  const { t } = useTranslation();

  const confirmations = analysis.confirmationSignals.slice(0, 4);
  const invalidations = analysis.invalidationSignals.slice(0, 4);

  return (
    <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">{t('rl.section.confirmInvalidate')}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Confirmation */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 size={14} className="text-emerald-600" />
            <p className="text-sm font-semibold text-emerald-700">{t('rl.label.confirm')}</p>
          </div>
          <div className="space-y-2.5">
            {confirmations.map((s, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">{s.signal}</p>
                  <p className="text-xs text-muted-foreground">{s.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Invalidation */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <XCircle size={14} className="text-orange-500" />
            <p className="text-sm font-semibold text-orange-700">{t('rl.label.invalidate')}</p>
          </div>
          <div className="space-y-2.5">
            {invalidations.map((s, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">{s.signal}</p>
                  <p className="text-xs text-muted-foreground">{s.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
