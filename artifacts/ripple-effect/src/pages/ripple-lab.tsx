import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@clerk/react';
import { Layout } from '@/components/layout';
import { useTranslation } from '@/lib/i18n';
import { useLocation } from 'wouter';
import { NewsInputForm, type NewsInput } from '@/components/ripple-lab/NewsInputForm';
import { EventSummary } from '@/components/ripple-lab/EventSummary';
import { RippleChain } from '@/components/ripple-lab/RippleChain';
import { OpportunityCard } from '@/components/ripple-lab/OpportunityCard';
import { CatalystRiskPanel } from '@/components/ripple-lab/CatalystRiskPanel';
import { ConfirmationPanel } from '@/components/ripple-lab/ConfirmationPanel';
import { SourceEvidenceList } from '@/components/ripple-lab/SourceEvidenceList';
import type { RippleAnalysis, RippleNewsInput } from '@/lib/ripple-types';
import { Button } from '@/components/ui/button';
import { ArrowLeft, AlertCircle } from 'lucide-react';

async function callAnalyzeRipple(
  input: RippleNewsInput,
  language: string,
  getToken: () => Promise<string | null>,
): Promise<RippleAnalysis> {
  const token = await getToken();
  const response = await fetch('/api/market/ripple-lab/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
    body: JSON.stringify({ ...input, language }),
  });

  if (!response.ok) {
    let msg = `HTTP ${response.status}`;
    try {
      const err = await response.json();
      if (err.error) msg = err.error;
    } catch {}
    throw new Error(msg);
  }
  return response.json();
}

export default function RippleLab() {
  const { t, language } = useTranslation();
  const { getToken } = useAuth();
  const [result, setResult] = useState<RippleAnalysis | null>(null);

  const mutation = useMutation({
    mutationFn: (input: RippleNewsInput) =>
      callAnalyzeRipple(input, language, getToken),
    onSuccess: (data) => setResult(data),
  });

  const handleSubmit = (form: NewsInput) => {
    const tickers = form.primaryTickers
      .split(/[,\s]+/)
      .map(t => t.trim().toUpperCase())
      .filter(Boolean);

    mutation.mutate({
      headline: form.headline.trim(),
      body: form.body.trim() || undefined,
      source: form.source.trim() || undefined,
      url: form.url.trim() || undefined,
      publishedAt: form.publishedAt || undefined,
      primaryTickers: tickers.length > 0 ? tickers : undefined,
    });
  };

  const reset = () => {
    setResult(null);
    mutation.reset();
  };

  return (
    <Layout>
      <div className="py-8 md:py-12">
        {/* Header when showing results */}
        {result && (
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" size="sm" onClick={reset} className="gap-1.5 text-sm">
              <ArrowLeft size={15} />
              {t('rl.newAnalysis')}
            </Button>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm text-muted-foreground">{t('rl.analysisReady')}</span>
            </div>
          </div>
        )}

        {/* Input state */}
        {!result && !mutation.isPending && (
          <>
            <NewsInputForm onSubmit={handleSubmit} isLoading={mutation.isPending} />
          </>
        )}

        {/* Loading state */}
        {mutation.isPending && (
          <div className="max-w-2xl mx-auto text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
              <div className="w-7 h-7 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
            <h2 className="text-lg font-semibold mb-2">{t('rl.analyzing')}</h2>
            <div className="space-y-1.5 text-sm text-muted-foreground">
              <p>{t('rl.loading.step1')}</p>
              <p>{t('rl.loading.step2')}</p>
              <p>{t('rl.loading.step3')}</p>
            </div>
          </div>
        )}

        {/* Error state */}
        {mutation.isError && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center mb-6">
              <AlertCircle size={24} className="text-red-500 mx-auto mb-3" />
              <p className="text-sm font-medium text-red-800 mb-1">{t('rl.error')}</p>
              <p className="text-xs text-red-600">{(mutation.error as Error)?.message}</p>
            </div>
            <NewsInputForm onSubmit={handleSubmit} isLoading={false} />
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* A. News header + B. What happened + C. Why it matters + drivers */}
            <EventSummary analysis={result} />

            {/* D. Ripple Chain */}
            {result.rippleChain.length > 0 && (
              <RippleChain analysis={result} />
            )}

            {/* E. Top Ripple Opportunities */}
            {result.opportunities.length > 0 && (
              <div>
                <div className="flex items-baseline gap-3 mb-4">
                  <h2 className="text-base font-semibold">{t('rl.section.opportunities')}</h2>
                  <p className="text-xs text-muted-foreground">{t('rl.section.opportunities.sub')}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {result.opportunities.map((opp, i) => (
                    <OpportunityCard key={opp.ticker} opp={opp} rank={i + 1} />
                  ))}
                </div>
              </div>
            )}

            {/* F. Catalysts and Risks */}
            <CatalystRiskPanel analysis={result} />

            {/* G. Confirm or Invalidate */}
            <ConfirmationPanel analysis={result} />

            {/* H. Sources and Methodology */}
            <SourceEvidenceList analysis={result} />

            {/* New analysis CTA */}
            <div className="text-center pt-4">
              <Button variant="outline" onClick={reset} className="gap-2">
                <ArrowLeft size={14} />
                {t('rl.newAnalysis')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
