import { useTranslation } from '@/lib/i18n';
import type { RippleAnalysis } from '@/lib/ripple-types';
import { Info } from 'lucide-react';

const SOURCE_TYPE_CONFIG = {
  fact: { label: 'FACT', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  inference: { label: 'INFERENCE', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  speculation: { label: 'SPECULATION', color: 'bg-amber-50 text-amber-700 border-amber-200' },
};

interface Props {
  analysis: RippleAnalysis;
}

export function SourceEvidenceList({ analysis }: Props) {
  const { t } = useTranslation();
  const { sources, classification } = analysis;

  return (
    <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">{t('rl.section.sources')}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sources */}
        <div>
          <p className="text-sm font-semibold mb-3">{t('rl.label.claimsAndEvidence')}</p>
          <div className="space-y-2.5">
            {sources.slice(0, 6).map((s, i) => {
              const cfg = SOURCE_TYPE_CONFIG[s.type] ?? SOURCE_TYPE_CONFIG.inference;
              return (
                <div key={i} className="flex items-start gap-2">
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 mt-0.5 ${cfg.color}`}>{cfg.label}</span>
                  <div>
                    <p className="text-xs font-medium">{s.claim}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{s.basis}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Methodology */}
        <div>
          <p className="text-sm font-semibold mb-3">{t('rl.label.methodology')}</p>
          <div className="space-y-3 text-xs text-muted-foreground">
            <div className="flex items-start gap-2">
              <Info size={12} className="mt-0.5 shrink-0 text-blue-500" />
              <p><span className="font-medium text-foreground">Ripple Score</span> = 0.30 × Exposure + 0.20 × Causality + 0.10 × Timing + 0.15 × Fundamentals + 0.10 × Valuation + 0.10 × Confirmation + 0.05 × (100 − Risk)</p>
            </div>
            <div className="flex items-start gap-2">
              <Info size={12} className="mt-0.5 shrink-0 text-blue-500" />
              <p><span className="font-medium text-foreground">Data confidence</span>: {classification.confidence}% — derived from source quality, economic link clarity, and confirmation count.</p>
            </div>
            <div className="flex items-start gap-2">
              <Info size={12} className="mt-0.5 shrink-0 text-blue-500" />
              <p><span className="font-medium text-foreground">Relationships</span>: only confirmed, strongly-supported, and high-confidence plausible connections are shown. Speculative links are hidden.</p>
            </div>
            <div className="pt-1 border-t border-border/60">
              <p className="text-[11px] italic">{t('rl.disclaimer')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
