import { useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AlertCircle } from 'lucide-react';
import type { RippleAnalysis, RippleOpportunity } from '@/lib/ripple-types';
import { EconomicTransmission } from './EconomicTransmission';
import { OpportunitiesTable } from './OpportunitiesTable';
import { ChainView } from './ChainView';
import { RisksTable } from './RisksTable';
import { CompanyDrawer } from './CompanyDrawer';

function StatsBar({ analysis }: { analysis: RippleAnalysis }) {
  const { t } = useTranslation();
  const opps = analysis.opportunities;
  const positive = opps.filter(o => o.direction === 'positive' || o.direction === 'very_positive').length;
  const mixed = opps.filter(o => o.direction === 'mixed').length;
  const negative = opps.filter(o => o.direction === 'negative' || o.direction === 'very_negative').length;
  const isPartialAnalysis =
    analysis.dataConfidence.overallConfidence < 50 ||
    analysis.dataConfidence.relationshipEvidence === 'low' ||
    analysis.dataConfidence.fundamentalDataAvailability === 'unavailable';

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{opps.length} {t('rl.stats.companies')}</span>
        {positive > 0 && <span className="text-emerald-700 font-medium">· {positive} {t('rl.stats.positive')}</span>}
        {mixed > 0 && <span className="text-amber-600 font-medium">· {mixed} {t('rl.stats.mixed')}</span>}
        {negative > 0 && <span className="text-red-600 font-medium">· {negative} {t('rl.stats.negative')}</span>}
        <span className="text-muted-foreground">· {t('rl.stats.confidence')} {analysis.dataConfidence.overallConfidence}%</span>
      </div>
      {isPartialAnalysis && (
        <div className="flex items-center gap-1.5 text-xs text-amber-700">
          <AlertCircle size={12} />
          <span>{t('rl.stats.partial')}</span>
        </div>
      )}
    </div>
  );
}

interface Props {
  analysis: RippleAnalysis;
}

export function RippleEffect({ analysis }: Props) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<RippleOpportunity | null>(null);

  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="px-5 pt-5 pb-4 border-b border-border/50">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <h2 className="text-base font-semibold tracking-tight">{t('rl.effect.title')}</h2>
        </div>
        <StatsBar analysis={analysis} />
      </div>

      <div className="p-5">
        <EconomicTransmission analysis={analysis} />

        <Tabs defaultValue="opportunities">
          <TabsList className="mb-4">
            <TabsTrigger value="opportunities">{t('rl.tab.opportunities')}</TabsTrigger>
            <TabsTrigger value="chain">{t('rl.tab.chain')}</TabsTrigger>
            <TabsTrigger value="risks">{t('rl.tab.risks')}</TabsTrigger>
          </TabsList>

          <TabsContent value="opportunities">
            <OpportunitiesTable analysis={analysis} onSelect={setSelected} />
          </TabsContent>

          <TabsContent value="chain">
            <ChainView analysis={analysis} />
          </TabsContent>

          <TabsContent value="risks">
            <RisksTable analysis={analysis} onSelect={setSelected} />
          </TabsContent>
        </Tabs>
      </div>

      <CompanyDrawer opp={selected} analysis={analysis} onClose={() => setSelected(null)} />
    </div>
  );
}
