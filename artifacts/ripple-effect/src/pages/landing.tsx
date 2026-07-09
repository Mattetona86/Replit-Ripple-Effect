import { Layout } from '@/components/layout';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { LineChart, Search, Sparkles, BookOpen } from 'lucide-react';

export default function Landing() {
  const { t } = useTranslation();

  return (
    <Layout>
      <div className="flex flex-col min-h-[calc(100vh-140px)] justify-center py-20 animate-in fade-in duration-700">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Sparkles size={16} />
            <span>Strictly Educational</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-foreground">
            {t('landing.title')}
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            {t('landing.subtitle')}
          </p>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/sign-up">
              <Button size="lg" className="h-14 px-8 text-lg w-full sm:w-auto font-medium">
                {t('landing.cta')}
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-32 max-w-5xl mx-auto grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          <div className="order-2 md:order-1 relative aspect-square md:aspect-[4/3] rounded-2xl overflow-hidden border border-border shadow-xl bg-card">
            {/* Abstract visual representation of a chart/app */}
            <div className="absolute inset-0 bg-gradient-to-br from-background to-muted/50 p-6 flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 border border-border/50 rounded-lg bg-background/50 relative overflow-hidden">
                <div className="absolute top-1/4 left-0 right-0 h-px bg-primary/20" />
                <div className="absolute top-2/4 left-0 right-0 h-px bg-primary/20" />
                <div className="absolute top-3/4 left-0 right-0 h-px bg-primary/20" />
                
                {/* Fake line chart */}
                <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                  <path d="M0,80 Q20,70 40,50 T70,30 T100,10" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary/40" />
                  <path d="M0,90 Q15,85 30,60 T60,40 T100,20" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-500/40" />
                </svg>
                
                {/* Fake candles */}
                <div className="absolute bottom-1/4 left-[20%] w-2 h-12 bg-emerald-500/80 rounded-sm" />
                <div className="absolute bottom-[30%] left-[30%] w-2 h-8 bg-red-500/80 rounded-sm" />
                <div className="absolute bottom-[35%] left-[40%] w-2 h-16 bg-emerald-500/80 rounded-sm" />
                <div className="absolute bottom-[50%] left-[50%] w-2 h-10 bg-emerald-500/80 rounded-sm" />
                <div className="absolute bottom-[45%] left-[60%] w-2 h-14 bg-red-500/80 rounded-sm" />
              </div>
            </div>
          </div>
          
          <div className="order-1 md:order-2 space-y-6">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-2">
              <LineChart size={24} />
            </div>
            <h2 className="text-3xl font-bold">{t('landing.product1.title')}</h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              {t('landing.product1.desc')}
            </p>
            <ul className="space-y-3 pt-2">
              <li className="flex items-center gap-3 text-foreground">
                <Search size={18} className="text-primary" />
                <span>Search thousands of US equities</span>
              </li>
              <li className="flex items-center gap-3 text-foreground">
                <LineChart size={18} className="text-primary" />
                <span>Interactive pure-data charting</span>
              </li>
              <li className="flex items-center gap-3 text-foreground">
                <BookOpen size={18} className="text-primary" />
                <span>Unbiased, plain-language breakdown</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </Layout>
  );
}
