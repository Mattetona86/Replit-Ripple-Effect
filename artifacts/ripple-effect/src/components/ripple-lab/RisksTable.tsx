import { useTranslation } from '@/lib/i18n';
import { Activity, CheckCircle2, XCircle } from 'lucide-react';
import type { RippleAnalysis, RippleOpportunity } from '@/lib/ripple-types';
import { DIR_COLOR, DIR_I18N_KEY, REL_CONFIDENCE_COLOR, findRelationshipConfidence, truncateWords } from './ripple-effect-shared';

const HORIZON_I18N_KEY: Record<string, string> = {
  immediate: 'immediate',
  short_term: 'short_term',
  medium_term: 'medium_term',
  long_term: 'long_term',
};

interface Props {
  analysis: RippleAnalysis;
  onSelect: (opp: RippleOpportunity) => void;
}

export function RisksTable({ analysis, onSelect }: Props) {
  const { t } = useTranslation();
  const atRisk = analysis.opportunities.filter(
    o => o.direction === 'negative' || o.direction === 'very_negative' || o.direction === 'mixed',
  );

  return (
    <div className="space-y-5">
      {atRisk.length === 0 ? (
        <div className="text-center py-8">
          <div className="inline-flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 px-4 py-2 rounded-full border border-emerald-200">
            <Activity size={14} />
            {t('rl.risks.empty')}
          </div>
        </div>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-muted/40 border-b border-border">
                <tr>
                  {[t('rl.table.company'), t('rl.risks.mechanism'), t('rl.table.horizon'), t('rl.table.relConfidence'), t('rl.risks.mainRisk')].map(h => (
                    <th key={h} className="py-2.5 px-3 text-left text-[11px] font-semibold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {atRisk.map(opp => {
                  const dir = DIR_COLOR[opp.direction];
                  const relConfidence = findRelationshipConfidence(analysis.rippleChain, opp.ticker);
                  return (
                    <tr
                      key={opp.ticker}
                      className="border-b border-border/50 hover:bg-muted/20 cursor-pointer transition-colors"
                      style={{ height: '68px' }}
                      onClick={() => onSelect(opp)}
                    >
                      <td className="px-3">
                        <div className="flex items-center gap-1.5">
                          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${dir.dot}`} />
                          <div>
                            <div className="font-semibold text-sm">{opp.companyName}</div>
                            <div className="text-xs font-mono text-muted-foreground">{opp.ticker}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 max-w-[180px]">
                        <p className="text-xs leading-snug line-clamp-2">{truncateWords(opp.mechanism)}</p>
                      </td>
                      <td className="px-3">
                        <span className="text-xs text-muted-foreground">{t(`rl.horizon.${HORIZON_I18N_KEY[opp.timeHorizon]}`)}</span>
                      </td>
                      <td className="px-3">
                        {relConfidence ? (
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${REL_CONFIDENCE_COLOR[relConfidence]}`}>
                            {t(`rl.relConfidence.${relConfidence}`)}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground/60">{t('rl.relConfidence.unavailable')}</span>
                        )}
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
              const dir = DIR_COLOR[opp.direction];
              return (
                <div key={opp.ticker} className="bg-white border border-border rounded-xl p-3.5 cursor-pointer" onClick={() => onSelect(opp)}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{opp.companyName}</span>
                      <span className="text-xs font-mono text-muted-foreground">{opp.ticker}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${dir.dot}`} />
                      <span className={`text-xs font-medium ${dir.text}`}>{t(`rl.direction.${DIR_I18N_KEY[opp.direction]}`)}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{opp.mainRisk}</p>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Global confirmation / invalidation signals */}
      {(analysis.confirmationSignals.length > 0 || analysis.invalidationSignals.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {analysis.confirmationSignals.length > 0 && (
            <div className="border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 size={14} className="text-emerald-600" />
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{t('rl.drawer.confirmationSignals')}</p>
              </div>
              <div className="space-y-2.5">
                {analysis.confirmationSignals.map((s, i) => (
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
          )}
          {analysis.invalidationSignals.length > 0 && (
            <div className="border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <XCircle size={14} className="text-orange-500" />
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{t('rl.risks.invalidation')}</p>
              </div>
              <div className="space-y-2.5">
                {analysis.invalidationSignals.map((s, i) => (
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
          )}
        </div>
      )}
    </div>
  );
}
