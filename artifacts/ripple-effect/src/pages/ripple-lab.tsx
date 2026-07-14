import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/react';
import { Layout } from '@/components/layout';
import { useTranslation } from '@/lib/i18n';
import { useLocation, useParams } from 'wouter';
import { NewsInputForm, type NewsInput } from '@/components/ripple-lab/NewsInputForm';
import { EventSummary } from '@/components/ripple-lab/EventSummary';
import { RippleEffect } from '@/components/ripple-lab/RippleEffect';
import { SourceEvidenceList } from '@/components/ripple-lab/SourceEvidenceList';
import type { RippleAnalysisRecord, RippleNewsInput } from '@/lib/ripple-types';
import { Button } from '@/components/ui/button';
import { ArrowLeft, AlertCircle, RotateCcw, Clock } from 'lucide-react';

const REQUEST_TIMEOUT_MS = 60_000;

class RippleApiError extends Error {
  status: number;
  isTimeout: boolean;
  constructor(message: string, status: number, isTimeout = false) {
    super(message);
    this.status = status;
    this.isTimeout = isTimeout;
  }
}

async function fetchWithAuth(
  url: string,
  options: RequestInit,
  getToken: () => Promise<string | null>,
): Promise<unknown> {
  const token = await getToken();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      credentials: 'include',
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new RippleApiError('Request timed out', 0, true);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    let msg = `HTTP ${response.status}`;
    try {
      const body = await response.json();
      if (body.error) msg = body.error;
    } catch {
      // response body wasn't JSON — keep the generic HTTP-status message
    }
    throw new RippleApiError(msg, response.status);
  }
  return response.json();
}

async function analyzeRipple(
  input: RippleNewsInput,
  language: string,
  getToken: () => Promise<string | null>,
): Promise<RippleAnalysisRecord> {
  const data = await fetchWithAuth(
    '/api/market/ripple-lab/analyze',
    { method: 'POST', body: JSON.stringify({ ...input, language }) },
    getToken,
  );
  return data as RippleAnalysisRecord;
}

async function getRippleAnalysis(
  id: string,
  getToken: () => Promise<string | null>,
): Promise<RippleAnalysisRecord> {
  const data = await fetchWithAuth(`/api/market/ripple-lab/${id}`, { method: 'GET' }, getToken);
  return data as RippleAnalysisRecord;
}

export default function RippleLab() {
  const { t, language } = useTranslation();
  const { getToken } = useAuth();
  const [, setLocation] = useLocation();
  const { id } = useParams<{ id?: string }>();
  const [lastInput, setLastInput] = useState<RippleNewsInput | null>(null);

  const mutation = useMutation({
    mutationFn: (input: RippleNewsInput) => analyzeRipple(input, language, getToken),
    onSuccess: (record) => setLocation(`/products/ripple-lab/${record.id}`, { replace: true }),
  });

  const query = useQuery({
    queryKey: ['ripple-analysis', id],
    queryFn: () => getRippleAnalysis(id!, getToken),
    enabled: !!id,
    retry: false,
  });

  const handleSubmit = (form: NewsInput) => {
    const tickers = form.primaryTickers
      .split(/[,\s]+/)
      .map(t => t.trim().toUpperCase())
      .filter(Boolean);

    const input: RippleNewsInput = {
      headline: form.headline.trim(),
      body: form.body.trim() || undefined,
      source: form.source.trim() || undefined,
      url: form.url.trim() || undefined,
      publishedAt: form.publishedAt || undefined,
      primaryTickers: tickers.length > 0 ? tickers : undefined,
    };
    setLastInput(input);
    mutation.mutate(input);
  };

  const retry = () => {
    if (lastInput) mutation.mutate(lastInput);
  };

  const startNew = () => {
    mutation.reset();
    setLastInput(null);
    setLocation('/products/ripple-lab');
  };

  // ── Viewing a saved analysis by id ──────────────────────────────────────
  if (id) {
    if (query.isLoading) {
      return (
        <Layout>
          <div className="max-w-2xl mx-auto text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
              <div className="w-7 h-7 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
            <p className="text-sm text-muted-foreground">{t('rl.state.loadingSaved')}</p>
          </div>
        </Layout>
      );
    }

    if (query.isError) {
      const err = query.error as RippleApiError;
      const notFound = err.status === 404;
      return (
        <Layout>
          <div className="max-w-2xl mx-auto text-center py-16">
            <AlertCircle size={24} className="text-red-500 mx-auto mb-3" />
            <p className="text-sm font-medium text-red-800 mb-4">
              {notFound ? t('rl.state.notFound') : err.message}
            </p>
            <div className="flex items-center justify-center gap-2">
              {!notFound && (
                <Button size="sm" variant="outline" onClick={() => query.refetch()} className="gap-1.5">
                  <RotateCcw size={13} />
                  {t('rl.state.retry')}
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={startNew} className="gap-2">
                <ArrowLeft size={14} />
                {t('rl.newAnalysis')}
              </Button>
            </div>
          </div>
        </Layout>
      );
    }

    const record = query.data!;
    const result = record.analysis;

    return (
      <Layout>
        <div className="py-8 md:py-12 space-y-6">
          <div className="flex items-center gap-4 mb-2">
            <Button variant="ghost" size="sm" onClick={startNew} className="gap-1.5 text-sm">
              <ArrowLeft size={15} />
              {t('rl.newAnalysis')}
            </Button>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm text-muted-foreground">{t('rl.analysisReady')}</span>
            </div>
          </div>

          <EventSummary analysis={result} />

          {result.rippleChain.length > 0 || result.opportunities.length > 0 ? (
            <RippleEffect analysis={result} />
          ) : (
            <div className="bg-white border border-border rounded-2xl p-8 text-center">
              <p className="text-sm text-muted-foreground">{t('rl.state.emptyResult')}</p>
            </div>
          )}

          <SourceEvidenceList analysis={result} />

          <div className="text-center pt-4">
            <Button variant="outline" onClick={startNew} className="gap-2">
              <ArrowLeft size={14} />
              {t('rl.newAnalysis')}
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  // ── New analysis: input / loading / error states ────────────────────────
  return (
    <Layout>
      <div className="py-8 md:py-12">
        {!mutation.isPending && !mutation.isError && !mutation.isSuccess && (
          <NewsInputForm onSubmit={handleSubmit} isLoading={false} />
        )}

        {(mutation.isPending || mutation.isSuccess) && (
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

        {mutation.isError && (
          <div className="max-w-2xl mx-auto">
            <ErrorPanel error={mutation.error as RippleApiError} onRetry={retry} />
            <NewsInputForm onSubmit={handleSubmit} isLoading={false} />
          </div>
        )}
      </div>
    </Layout>
  );
}

function ErrorPanel({ error, onRetry }: { error: RippleApiError; onRetry: () => void }) {
  const { t } = useTranslation();
  const isValidationError = error.status === 400;
  const isTimeout = error.isTimeout;

  return (
    <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center mb-6">
      {isTimeout ? <Clock size={24} className="text-red-500 mx-auto mb-3" /> : <AlertCircle size={24} className="text-red-500 mx-auto mb-3" />}
      <p className="text-sm font-medium text-red-800 mb-1">
        {isTimeout ? t('rl.state.timeout') : isValidationError ? t('rl.state.validationError') : t('rl.state.aiError')}
      </p>
      <p className="text-xs text-red-600 mb-4">{error.message}</p>
      {!isValidationError && (
        <Button size="sm" variant="outline" onClick={onRetry} className="gap-1.5">
          <RotateCcw size={13} />
          {t('rl.state.retry')}
        </Button>
      )}
    </div>
  );
}
