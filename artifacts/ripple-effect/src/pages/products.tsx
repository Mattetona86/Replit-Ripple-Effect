import { Layout } from '@/components/layout';
import { useTranslation } from '@/lib/i18n';
import { Link } from 'wouter';
import { LineChart, BarChart2, ArrowRight, Zap } from 'lucide-react';

export default function Products() {
  const { t } = useTranslation();

  return (
    <Layout>
      <div className="py-12 animate-in fade-in duration-500">
        <header className="mb-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">{t('hub.title')}</h1>
          <p className="text-lg text-muted-foreground">{t('hub.subtitle')}</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1: Technical Analysis */}
          <Link href="/products/technical-analysis" className="group">
            <div className="h-full border border-border bg-card rounded-2xl overflow-hidden hover-elevate transition-all duration-300 hover:border-primary/30 flex flex-col">
              <div className="p-8 pb-6 bg-gradient-to-br from-primary/5 to-transparent border-b border-border/50">
                <div className="w-14 h-14 bg-background border border-border rounded-xl shadow-sm flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
                  <LineChart size={28} />
                </div>
                <h2 className="text-2xl font-bold group-hover:text-primary transition-colors">
                  {t('product.ta.title')}
                </h2>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <p className="text-muted-foreground leading-relaxed flex-1">
                  {t('product.ta.desc')}
                </p>
                <div className="mt-8 pt-4 border-t border-border/50 flex items-center justify-between text-sm font-semibold text-primary">
                  <span>{t('product.ta.action')}</span>
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </Link>

          {/* Card 2: Fundamental Analysis */}
          <Link href="/products/fundamental-analysis" className="group">
            <div className="h-full border border-border bg-card rounded-2xl overflow-hidden hover-elevate transition-all duration-300 hover:border-primary/30 flex flex-col">
              <div className="p-8 pb-6 bg-gradient-to-br from-green-500/5 to-transparent border-b border-border/50">
                <div className="w-14 h-14 bg-background border border-border rounded-xl shadow-sm flex items-center justify-center text-green-600 mb-6 group-hover:scale-110 transition-transform">
                  <BarChart2 size={28} />
                </div>
                <h2 className="text-2xl font-bold group-hover:text-primary transition-colors">
                  {t('product.fa.title')}
                </h2>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <p className="text-muted-foreground leading-relaxed flex-1">
                  {t('product.fa.desc')}
                </p>
                <div className="mt-8 pt-4 border-t border-border/50 flex items-center justify-between text-sm font-semibold text-primary">
                  <span>{t('product.fa.action')}</span>
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </Link>

          {/* Card 3: Ripple Lab */}
          <Link href="/products/ripple-lab" className="group">
            <div className="h-full border border-border bg-card rounded-2xl overflow-hidden hover-elevate transition-all duration-300 hover:border-primary/30 flex flex-col">
              <div className="p-8 pb-6 bg-gradient-to-br from-violet-500/5 to-transparent border-b border-border/50">
                <div className="w-14 h-14 bg-background border border-border rounded-xl shadow-sm flex items-center justify-center text-violet-600 mb-6 group-hover:scale-110 transition-transform">
                  <Zap size={28} />
                </div>
                <h2 className="text-2xl font-bold group-hover:text-primary transition-colors">
                  {t('product.rl.title')}
                </h2>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <p className="text-muted-foreground leading-relaxed flex-1">
                  {t('product.rl.desc')}
                </p>
                <div className="mt-8 pt-4 border-t border-border/50 flex items-center justify-between text-sm font-semibold text-primary">
                  <span>{t('product.rl.action')}</span>
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </Layout>
  );
}
