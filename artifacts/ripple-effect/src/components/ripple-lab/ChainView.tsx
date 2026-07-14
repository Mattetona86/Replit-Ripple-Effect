import { useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { ArrowRight, Building2, Layers, Tag, Zap } from 'lucide-react';
import type { RippleAnalysis, RippleChainNode } from '@/lib/ripple-types';
import { DIR_COLOR, DIR_I18N_KEY, REL_CONFIDENCE_COLOR } from './ripple-effect-shared';

const TYPE_ICON = {
  company: Building2,
  industry: Layers,
  theme: Tag,
  economic_driver: Zap,
};

const TYPE_I18N_KEY: Record<RippleChainNode['type'], string> = {
  company: 'company',
  industry: 'industry',
  theme: 'theme',
  economic_driver: 'economic_driver',
};

interface NodeCardProps {
  node: RippleChainNode;
}

/**
 * Every node shows its kind (icon + label) explicitly — a company and an
 * economic driver must never look the same, even though both can appear as
 * "L1"/"L2" chain nodes.
 */
function NodeCard({ node }: NodeCardProps) {
  const { t } = useTranslation();
  const dir = DIR_COLOR[node.direction];
  const relColor = REL_CONFIDENCE_COLOR[node.relationship];
  const Icon = TYPE_ICON[node.type] ?? Building2;

  return (
    <div className="rounded-lg border bg-white px-3 py-2 text-xs shadow-sm border-border w-[160px] shrink-0">
      <div className="flex items-center gap-1 mb-1">
        <Icon size={11} className="text-muted-foreground shrink-0" />
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{t(`rl.chain.kind.${TYPE_I18N_KEY[node.type]}`)}</span>
      </div>
      <div className="font-semibold leading-tight line-clamp-2">{node.label}</div>
      {node.ticker && <div className="text-[10px] font-mono text-primary mt-0.5">{node.ticker}</div>}
      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
        <div className="flex items-center gap-1">
          <div className={`w-1.5 h-1.5 rounded-full ${dir.dot}`} />
          <span className={`text-[10px] font-medium ${dir.text}`}>{t(`rl.direction.${DIR_I18N_KEY[node.direction]}`)}</span>
        </div>
        <span className={`text-[9px] font-medium px-1 py-0.5 rounded border ${relColor}`}>{t(`rl.relConfidence.${node.relationship}`)}</span>
      </div>
    </div>
  );
}

interface Props {
  analysis: RippleAnalysis;
}

const INITIAL_VISIBLE = 5;

export function ChainView({ analysis }: Props) {
  const { t } = useTranslation();
  const [showMoreL1, setShowMoreL1] = useState(false);
  const [showMoreL2, setShowMoreL2] = useState(false);

  const l0 = analysis.rippleChain.filter(n => n.level === 0);
  const l1All = analysis.rippleChain.filter(n => n.level === 1);
  const l2All = analysis.rippleChain.filter(n => n.level === 2);
  const l1 = showMoreL1 ? l1All : l1All.slice(0, INITIAL_VISIBLE);
  const l2 = showMoreL2 ? l2All : l2All.slice(0, INITIAL_VISIBLE);

  const columns = [
    { key: 'l0', label: t('rl.chain.direct'), nodes: l0, hasMore: false, showMore: false, onMore: () => {} },
    { key: 'l1', label: t('rl.chain.first'), nodes: l1, hasMore: l1All.length > INITIAL_VISIBLE, showMore: showMoreL1, onMore: () => setShowMoreL1(v => !v), total: l1All.length },
    { key: 'l2', label: t('rl.chain.second'), nodes: l2, hasMore: l2All.length > INITIAL_VISIBLE, showMore: showMoreL2, onMore: () => setShowMoreL2(v => !v), total: l2All.length },
  ].filter(c => c.nodes.length > 0);

  if (columns.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">{t('rl.chain.empty')}</p>;
  }

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex gap-4 min-w-max items-start">
        <div className="flex flex-col items-center gap-2">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{t('rl.chain.event')}</div>
          <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs max-w-[140px]">
            <div className="font-semibold text-primary leading-snug line-clamp-3">{analysis.news.headline}</div>
          </div>
        </div>

        {columns.map(col => (
          <div key={col.key} className="flex items-start gap-4">
            <div className="flex items-center self-center mt-6 text-muted-foreground/40">
              <ArrowRight size={16} />
            </div>
            <div className="flex flex-col gap-2">
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{col.label}</div>
              {col.nodes.map(node => <NodeCard key={node.id} node={node} />)}
              {col.hasMore && (
                <button className="text-[11px] text-primary hover:underline text-left mt-0.5" onClick={col.onMore}>
                  {col.showMore ? t('rl.chain.showLess') : `${t('rl.chain.showMore')} (+${(col.total ?? 0) - INITIAL_VISIBLE})`}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
