import { useTranslation } from '@/lib/i18n';
import type { RippleAnalysis, RippleChainNode } from '@/lib/ripple-types';
import { Building2, Layers, Tag, Zap, ChevronRight } from 'lucide-react';

const DIRECTION_DOT: Record<string, string> = {
  very_positive: 'bg-emerald-500',
  positive: 'bg-emerald-400',
  neutral: 'bg-blue-400',
  mixed: 'bg-amber-400',
  negative: 'bg-orange-400',
  very_negative: 'bg-red-500',
};

const DIRECTION_BADGE: Record<string, string> = {
  very_positive: 'text-emerald-700',
  positive: 'text-emerald-600',
  neutral: 'text-blue-600',
  mixed: 'text-amber-600',
  negative: 'text-orange-600',
  very_negative: 'text-red-700',
};

const DIRECTION_ARROW: Record<string, string> = {
  very_positive: '↑↑',
  positive: '↑',
  neutral: '→',
  mixed: '↕',
  negative: '↓',
  very_negative: '↓↓',
};

const REL_BADGE: Record<string, { label: string; color: string }> = {
  confirmed: { label: 'Confirmed', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  strongly_supported: { label: 'Supported', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  plausible: { label: 'Plausible', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  speculative: { label: 'Speculative', color: 'bg-gray-50 text-gray-600 border-gray-200' },
};

const TYPE_ICON = {
  company: Building2,
  industry: Layers,
  theme: Tag,
  economic_driver: Zap,
};

function NodeCard({ node }: { node: RippleChainNode }) {
  const dot = DIRECTION_DOT[node.direction] ?? 'bg-gray-400';
  const arrow = DIRECTION_ARROW[node.direction] ?? '';
  const dirColor = DIRECTION_BADGE[node.direction] ?? 'text-gray-600';
  const rel = REL_BADGE[node.relationship] ?? REL_BADGE.plausible;
  const Icon = TYPE_ICON[node.type] ?? Building2;

  return (
    <div className="bg-white border border-border rounded-xl p-3.5 shadow-sm hover:shadow-md transition-shadow w-[200px] shrink-0">
      <div className="flex items-start justify-between gap-1 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Icon size={13} className="text-muted-foreground shrink-0 mt-0.5" />
          <span className="text-xs text-muted-foreground capitalize truncate">{node.type.replace('_', ' ')}</span>
        </div>
        <div className={`w-2 h-2 rounded-full shrink-0 mt-1 ${dot}`} />
      </div>
      <p className="text-sm font-semibold leading-snug mb-1">{node.label}</p>
      {node.ticker && (
        <span className="text-xs font-mono font-bold text-primary">{node.ticker}</span>
      )}
      <p className={`text-xs font-medium mt-1.5 ${dirColor}`}>{arrow} {node.direction.replace('_', ' ')}</p>
      <p className="text-xs text-muted-foreground mt-1.5 leading-snug line-clamp-2">{node.mechanism}</p>
      <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${rel.color}`}>{rel.label}</span>
        <span className="text-[10px] text-muted-foreground">{node.confidence}%</span>
      </div>
    </div>
  );
}

interface Props {
  analysis: RippleAnalysis;
}

export function RippleChain({ analysis }: Props) {
  const { t } = useTranslation();
  const { rippleChain } = analysis;

  const level0 = rippleChain.filter(n => n.level === 0);
  const level1 = rippleChain.filter(n => n.level === 1);
  const level2 = rippleChain.filter(n => n.level === 2);

  const columns = [
    { label: t('rl.chain.direct'), nodes: level0, levelKey: 'L0' },
    { label: t('rl.chain.first'), nodes: level1, levelKey: 'L1' },
    { label: t('rl.chain.second'), nodes: level2, levelKey: 'L2' },
  ].filter(c => c.nodes.length > 0);

  if (rippleChain.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">{t('rl.section.rippleChain')}</p>
      <div className="overflow-x-auto pb-2">
        <div className="flex items-start gap-3 min-w-max">
          {columns.map((col, ci) => (
            <div key={col.levelKey} className="flex items-start gap-3">
              <div className="flex flex-col gap-2">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-1">{col.label}</p>
                {col.nodes.map(node => (
                  <NodeCard key={node.id} node={node} />
                ))}
              </div>
              {ci < columns.length - 1 && (
                <div className="flex items-center self-center mt-6 text-muted-foreground/50">
                  <ChevronRight size={20} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
