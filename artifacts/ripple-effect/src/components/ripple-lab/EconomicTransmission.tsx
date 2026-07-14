import { useTranslation } from '@/lib/i18n';
import { ArrowRight } from 'lucide-react';
import type { RippleAnalysis } from '@/lib/ripple-types';

const MAGNITUDE_COLOR: Record<string, string> = {
  high: 'text-red-600',
  medium: 'text-amber-600',
  low: 'text-slate-500',
};

interface Props {
  analysis: RippleAnalysis;
}

/**
 * Compact path: Article event -> Economic driver(s) -> Industry effect ->
 * Companies affected. Each stage is a visibly distinct category — drivers
 * and industries are never rendered as if they were companies.
 */
export function EconomicTransmission({ analysis }: Props) {
  const { t } = useTranslation();
  const drivers = analysis.economicDrivers.slice(0, 3);
  const industries = analysis.industries.slice(0, 2);
  const companyCount = analysis.opportunities.length;

  if (drivers.length === 0 && industries.length === 0) return null;

  return (
    <div className="border border-border/70 rounded-xl bg-slate-50/60 px-4 py-3 mb-4">
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
        {t('rl.transmission.title')}
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        {/* Article event */}
        <div className="flex items-center gap-1.5">
          <div className="flex flex-col max-w-[160px]">
            <span className="text-[9px] font-semibold text-primary uppercase tracking-wider">
              {t('rl.transmission.event')}
            </span>
            <span className="text-xs font-medium leading-snug line-clamp-1">{analysis.event.eventTitle}</span>
          </div>
          {(drivers.length > 0 || industries.length > 0) && (
            <ArrowRight size={12} className="text-muted-foreground/50 shrink-0" />
          )}
        </div>

        {/* Economic drivers */}
        {drivers.map((d, i) => (
          <div key={`driver-${i}`} className="flex items-center gap-1.5">
            <div className="flex flex-col">
              <span className="text-xs font-medium leading-snug">{d.driver}</span>
              <span className={`text-[10px] ${MAGNITUDE_COLOR[d.magnitude] ?? 'text-slate-500'}`}>
                {d.magnitude} {t('rl.transmission.impact')}
              </span>
            </div>
            {(i < drivers.length - 1 || industries.length > 0) && (
              <ArrowRight size={12} className="text-muted-foreground/50 shrink-0" />
            )}
          </div>
        ))}

        {/* Industry effect */}
        {industries.map((ind, i) => (
          <div key={`industry-${i}`} className="flex items-center gap-1.5">
            <div className="flex flex-col">
              <span className="text-[9px] font-semibold text-violet-600 uppercase tracking-wider">
                {t('rl.transmission.industry')}
              </span>
              <span className="text-xs font-medium leading-snug">{ind.name}</span>
            </div>
            <ArrowRight size={12} className="text-muted-foreground/50 shrink-0" />
          </div>
        ))}

        {/* Companies affected */}
        {companyCount > 0 && (
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-foreground">{companyCount}</span>
            <span className="text-[10px] text-muted-foreground">{t('rl.transmission.companies')}</span>
          </div>
        )}
      </div>
    </div>
  );
}
