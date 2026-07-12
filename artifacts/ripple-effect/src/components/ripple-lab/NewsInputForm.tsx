import { useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Zap, Newspaper } from 'lucide-react';

export interface NewsInput {
  headline: string;
  body: string;
  source: string;
  url: string;
  publishedAt: string;
  primaryTickers: string;
}

interface Props {
  onSubmit: (input: NewsInput) => void;
  isLoading: boolean;
}

const EXAMPLE: NewsInput = {
  headline: 'NVIDIA reports stronger-than-expected data-center revenue and raises guidance due to accelerating demand for AI infrastructure.',
  body: 'NVIDIA reported quarterly data center revenue of $22.6 billion, up 427% year-over-year, driven by surging demand for H100 and H200 GPUs from cloud providers and AI labs. The company raised full-year revenue guidance by 15% citing continued hyperscaler capex expansion and strong Blackwell GPU order backlog.',
  source: 'NVIDIA Earnings Release',
  url: 'https://investor.nvidia.com',
  publishedAt: new Date().toISOString().slice(0, 10),
  primaryTickers: 'NVDA',
};

export function NewsInputForm({ onSubmit, isLoading }: Props) {
  const { t } = useTranslation();
  const [form, setForm] = useState<NewsInput>({
    headline: '',
    body: '',
    source: '',
    url: '',
    publishedAt: new Date().toISOString().slice(0, 10),
    primaryTickers: '',
  });

  const set = (k: keyof NewsInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.headline.trim()) return;
    onSubmit(form);
  };

  const loadExample = () => setForm(EXAMPLE);

  const isValid = form.headline.trim().length > 0;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
          <Zap size={28} className="text-primary" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('rl.input.title')}</h1>
        <p className="text-muted-foreground mt-2 text-sm max-w-md mx-auto">{t('rl.input.subtitle')}</p>
      </div>

      <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="headline" className="text-sm font-medium">{t('rl.field.headline')} <span className="text-destructive">*</span></Label>
            <Textarea
              id="headline"
              placeholder={t('rl.field.headline.placeholder')}
              value={form.headline}
              onChange={set('headline')}
              rows={2}
              className="resize-none text-sm"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="body" className="text-sm font-medium">{t('rl.field.body')}</Label>
            <Textarea
              id="body"
              placeholder={t('rl.field.body.placeholder')}
              value={form.body}
              onChange={set('body')}
              rows={4}
              className="resize-none text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="source" className="text-sm font-medium">{t('rl.field.source')}</Label>
              <Input id="source" placeholder="e.g. Bloomberg, Reuters" value={form.source} onChange={set('source')} className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date" className="text-sm font-medium">{t('rl.field.date')}</Label>
              <Input id="date" type="date" value={form.publishedAt} onChange={set('publishedAt')} className="text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="url" className="text-sm font-medium">{t('rl.field.url')}</Label>
              <Input id="url" type="url" placeholder="https://..." value={form.url} onChange={set('url')} className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tickers" className="text-sm font-medium">{t('rl.field.tickers')}</Label>
              <Input id="tickers" placeholder="NVDA, MSFT, TSM" value={form.primaryTickers} onChange={set('primaryTickers')} className="text-sm" />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={!isValid || isLoading} className="flex-1 gap-2">
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  {t('rl.analyzing')}
                </>
              ) : (
                <>
                  <Zap size={15} />
                  {t('rl.analyze')}
                </>
              )}
            </Button>
            <Button type="button" variant="outline" onClick={loadExample} disabled={isLoading} className="gap-2 text-sm">
              <Newspaper size={14} />
              {t('rl.example')}
            </Button>
          </div>
        </form>
      </div>

      <p className="text-xs text-muted-foreground text-center mt-4">{t('rl.disclaimer')}</p>
    </div>
  );
}
