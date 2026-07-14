import { useTranslation } from '@/lib/i18n';
import type { RippleAnalysis, RippleOpportunity } from '@/lib/ripple-types';
import {
  DIR_COLOR,
  DIR_I18N_KEY,
  REL_CONFIDENCE_COLOR,
  findRelationshipConfidence,
  fundamentalTier,
  scoreColorClass,
  isPartialScore,
  truncateWords,
} from './ripple-effect-shared';

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

/**
 * One row per public company (analysis.opportunities), sorted by
 * rippleOpportunityScore descending — never by confidence. Direction,
 * relationship confidence, and the Ripple Opportunity Score are always
 * rendered as three distinct columns/values.
 */
export function OpportunitiesTable({ analysis, onSelect }: Props) {
  const { t } = useTranslation();
  const opps = analysis.opportunities;
  const sorted = [...opps].sort((a, b) => b.rippleOpportunityScore - a.rippleOpportunityScore);

  if (sorted.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">{t('rl.table.empty')}</p>;
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-muted/40 border-b border-border">
            <tr>
              {[
                t('rl.table.rank'),
                t('rl.table.company'),
                t('rl.table.level'),
                t('rl.table.direction'),
                t('rl.table.economicLink'),
                t('rl.table.horizon'),
                t('rl.table.relConfidence'),
                t('rl.table.fundamentalStatus'),
              ].map(h => (
                <th key={h} className="py-2.5 px-3 text-left text-[11px] font-semibold text-muted-foreground whitespace-nowrap">
                  {h}
                </th>
              ))}
              <th className="py-2.5 px-3 text-right text-[11px] font-semibold text-muted-foreground whitespace-nowrap">
                {t('rl.table.score')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((opp, i) => {
              const dir = DIR_COLOR[opp.direction];
              const relConfidence = findRelationshipConfidence(analysis.rippleChain, opp.ticker);
              const fit = fundamentalTier(opp.fundamentalScore);
              const partial = isPartialScore(opp);

              return (
                <tr
                  key={opp.ticker}
                  className="border-b border-border/50 hover:bg-muted/20 cursor-pointer transition-colors"
                  style={{ height: '68px' }}
                  onClick={() => onSelect(opp)}
                >
                  <td className="px-3 text-muted-foreground font-semibold text-xs">{i + 1}</td>
                  <td className="px-3">
                    <div className="font-semibold text-sm">{opp.companyName}</div>
                    <div className="text-xs text-muted-foreground font-mono">{opp.ticker}</div>
                  </td>
                  <td className="px-3">
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                      {opp.rippleLevel === 1 ? t('rl.level.direct') : t('rl.level.secondOrder')}
                    </span>
                  </td>
                  <td className="px-3">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${dir.dot}`} />
                      <span className={`text-xs font-medium ${dir.text}`}>{t(`rl.direction.${DIR_I18N_KEY[opp.direction]}`)}</span>
                    </div>
                  </td>
                  <td className="px-3 max-w-[160px]">
                    <span className="text-xs text-foreground leading-snug line-clamp-2">{truncateWords(opp.mechanism)}</span>
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
                  <td className="px-3">
                    <span className="text-xs font-medium">{t(`rl.fundamental.${fit}`)}</span>
                  </td>
                  <td className="px-3 text-right">
                    <div className="inline-flex flex-col items-end">
                      <span className={`text-base font-bold tabular-nums ${scoreColorClass(opp.rippleOpportunityScore)}`}>
                        {Math.round(opp.rippleOpportunityScore)}
                      </span>
                      <div className="w-14 h-1 rounded-full bg-muted overflow-hidden mt-0.5">
                        <div
                          className={`h-full rounded-full ${opp.rippleOpportunityScore >= 70 ? 'bg-emerald-500' : opp.rippleOpportunityScore >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                          style={{ width: `${opp.rippleOpportunityScore}%` }}
                        />
                      </div>
                      {partial && <span className="text-[9px] text-muted-foreground mt-0.5">{t('rl.table.partial')}</span>}
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
          const dir = DIR_COLOR[opp.direction];
          const partial = isPartialScore(opp);
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
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700">
                    {opp.rippleLevel === 1 ? t('rl.level.direct') : t('rl.level.secondOrder')}
                  </span>
                  <span className={`text-[10px] font-medium ${dir.text}`}>{t(`rl.direction.${DIR_I18N_KEY[opp.direction]}`)}</span>
                  <span className="text-[10px] text-muted-foreground">{t(`rl.horizon.${HORIZON_I18N_KEY[opp.timeHorizon]}`)}</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">{truncateWords(opp.mechanism, 10)}</p>
              </div>
              <div className="flex flex-col items-center shrink-0">
                <span className={`text-lg font-bold tabular-nums ${scoreColorClass(opp.rippleOpportunityScore)}`}>
                  {Math.round(opp.rippleOpportunityScore)}
                </span>
                {partial && <span className="text-[9px] text-muted-foreground">{t('rl.table.partial')}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
