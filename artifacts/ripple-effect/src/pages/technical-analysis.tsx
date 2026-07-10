import React, { useState, useEffect, useRef } from 'react';
import { Layout } from '@/components/layout';
import { useTranslation } from '@/lib/i18n';
import {
  useSearchTickers,
  useGetStockAnalysis,
  getSearchTickersQueryKey,
  getGetStockAnalysisQueryKey,
  useListSavedAnalyses,
  useSaveAnalysis,
  useDeleteSavedAnalysis,
  getListSavedAnalysesQueryKey,
} from '@workspace/api-client-react';
import { useDebounce } from 'use-debounce';
import { 
  Search, 
  Info, 
  ChevronRight, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  BookOpen,
  X,
  Bookmark,
  BookmarkCheck,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// We'll mock the chart wrapper until we create it properly
import TechnicalChart from '@/components/technical-chart';

const TIMEFRAMES = ['1D', '1W', '1M', '3M', '1Y', '5Y'] as const;
type Timeframe = typeof TIMEFRAMES[number];

export default function TechnicalAnalysis() {
  const { t, language } = useTranslation();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery] = useDebounce(searchQuery, 300);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('1Y');
  
  // States for toggles
  const [showSMA50, setShowSMA50] = useState(false);
  const [showSMA200, setShowSMA200] = useState(false);
  const [showEMA20, setShowEMA20] = useState(false);
  const [showEMA50, setShowEMA50] = useState(false);
  
  // Beginner Guide
  const [showGuide, setShowGuide] = useState(() => {
    return localStorage.getItem('ripple_guide_dismissed') !== 'true';
  });

  const [showGlossary, setShowGlossary] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  const { toast } = useToast();

  // APIs
  const { data: searchResults, isLoading: isSearching } = useSearchTickers(
    { query: debouncedSearchQuery },
    {
      query: {
        enabled: debouncedSearchQuery.length > 0,
        queryKey: getSearchTickersQueryKey({ query: debouncedSearchQuery }),
      },
    }
  );

  const { data: analysis, isLoading: isAnalyzing, isError } = useGetStockAnalysis(
    { symbol: selectedSymbol || '', timeframe: selectedTimeframe, language },
    {
      query: {
        enabled: !!selectedSymbol,
        queryKey: getGetStockAnalysisQueryKey({
          symbol: selectedSymbol || '',
          timeframe: selectedTimeframe,
          language,
        }),
      },
    }
  );

  const { data: savedAnalyses } = useListSavedAnalyses({
    query: { queryKey: getListSavedAnalysesQueryKey() },
  });

  const isSaved = !!savedAnalyses?.some(
    (s) => s.symbol === selectedSymbol && s.timeframe === selectedTimeframe && s.language === language,
  );

  const { mutate: saveAnalysisMutate, isPending: isSaving } = useSaveAnalysis({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSavedAnalysesQueryKey() });
        toast({ description: t('saved.toast.saved') });
      },
      onError: () => {
        toast({ description: t('saved.toast.error'), variant: 'destructive' });
      },
    },
  });

  const { mutate: deleteSavedMutate } = useDeleteSavedAnalysis({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSavedAnalysesQueryKey() });
      },
    },
  });

  const handleSymbolSelect = (symbol: string) => {
    setSelectedSymbol(symbol);
    setSearchQuery('');
  };

  const handleSaveAnalysis = () => {
    if (!analysis || !selectedSymbol) return;
    saveAnalysisMutate({
      data: {
        symbol: analysis.symbol,
        name: analysis.name,
        timeframe: selectedTimeframe,
        language,
        snapshot: analysis,
      },
    });
  };

  const openSavedAnalysis = (symbol: string, timeframe: Timeframe) => {
    setSelectedTimeframe(timeframe);
    setSelectedSymbol(symbol);
    setShowSaved(false);
  };

  const dismissGuide = () => {
    setShowGuide(false);
    localStorage.setItem('ripple_guide_dismissed', 'true');
  };

  return (
    <Layout>
      <div className="py-6 flex flex-col gap-6 max-h-[calc(100vh-64px)]">
        
        {/* Top Bar: Search & Timeframe */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card p-4 rounded-xl border border-border shadow-sm">
          <div className="relative w-full md:max-w-md z-20">
            <div className="relative flex items-center">
              <Search className="absolute left-3 text-muted-foreground w-5 h-5" />
              <input
                type="text"
                placeholder={t('ta.search.placeholder')}
                className="w-full h-12 pl-10 pr-4 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground font-medium"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            {/* Search Dropdown */}
            {debouncedSearchQuery.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-lg shadow-xl overflow-hidden max-h-64 overflow-y-auto">
                {isSearching ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">{t('ta.search.loading')}</div>
                ) : searchResults && searchResults.length > 0 ? (
                  searchResults.map((result) => (
                    <button
                      key={result.symbol}
                      className="w-full text-left px-4 py-3 hover:bg-accent flex items-center justify-between border-b border-border/50 last:border-0"
                      onClick={() => handleSymbolSelect(result.symbol)}
                    >
                      <div>
                        <span className="font-bold text-foreground">{result.symbol}</span>
                        <span className="ml-2 text-sm text-muted-foreground line-clamp-1">{result.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-sm">{result.exchange}</span>
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">{t('ta.search.empty')}</div>
                )}
              </div>
            )}
          </div>

          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSaved((v) => !v)}
              className="h-9 gap-2 shrink-0"
            >
              <Bookmark size={14} />
              {t('saved.trigger')}
              {savedAnalyses && savedAnalyses.length > 0 && (
                <span className="text-[10px] bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center">
                  {savedAnalyses.length}
                </span>
              )}
            </Button>
            {showSaved && (
              <div className="absolute top-full right-0 mt-2 w-80 bg-popover border border-border rounded-lg shadow-xl overflow-hidden max-h-80 overflow-y-auto z-30">
                {!savedAnalyses || savedAnalyses.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">{t('saved.empty')}</div>
                ) : (
                  savedAnalyses.map((s) => (
                    <div
                      key={s.id}
                      className="w-full text-left px-4 py-3 hover:bg-accent flex items-center justify-between border-b border-border/50 last:border-0 gap-2"
                    >
                      <button
                        className="flex-1 text-left min-w-0"
                        onClick={() => openSavedAnalysis(s.symbol, s.timeframe as Timeframe)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">{s.symbol}</span>
                          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-sm">
                            {t(`tf.${s.timeframe}`)}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground line-clamp-1 block">{s.name}</span>
                      </button>
                      <button
                        className="text-muted-foreground hover:text-destructive p-1.5 rounded shrink-0"
                        onClick={() => deleteSavedMutate({ id: s.id })}
                        aria-label={t('saved.remove')}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg border border-border overflow-x-auto w-full md:w-auto">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                onClick={() => setSelectedTimeframe(tf)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  selectedTimeframe === tf 
                    ? 'bg-background shadow-sm text-foreground' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t(`tf.${tf}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Beginner Guide */}
        {showGuide && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 md:p-6 relative flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
              <BookOpen className="text-primary w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-primary mb-1">{t('guide.title')}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{t('guide.desc')}</p>
            </div>
            <Button variant="outline" size="sm" onClick={dismissGuide} className="shrink-0">
              {t('guide.dismiss')}
            </Button>
            <button className="absolute top-2 right-2 text-muted-foreground hover:text-foreground" onClick={dismissGuide}>
              <X size={16} />
            </button>
          </div>
        )}

        {/* Main Content Area */}
        {selectedSymbol ? (
          isAnalyzing ? (
            <div className="flex-1 flex items-center justify-center min-h-[400px]">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                <p className="text-muted-foreground font-medium animate-pulse">Analyzing {selectedSymbol}...</p>
              </div>
            </div>
          ) : isError ? (
            <div className="flex-1 flex items-center justify-center min-h-[400px] border border-dashed border-destructive/30 rounded-xl bg-destructive/5">
              <div className="text-center">
                <AlertTriangle className="mx-auto w-10 h-10 text-destructive mb-3" />
                <p className="text-destructive font-medium">Failed to load analysis.</p>
              </div>
            </div>
          ) : analysis ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
              
              {/* Left Column: Chart */}
              <div className="lg:col-span-2 flex flex-col gap-4 min-h-[600px] lg:min-h-0">
                <div className="flex items-end justify-between px-2">
                  <div>
                    <h2 className="text-2xl font-bold font-mono tracking-tight">{analysis.symbol}</h2>
                    <p className="text-sm text-muted-foreground">{analysis.name}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      variant={isSaved ? 'default' : 'outline'}
                      size="sm"
                      onClick={handleSaveAnalysis}
                      disabled={isSaving || isSaved}
                      className="h-9 gap-2"
                    >
                      {isSaved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
                      {isSaved ? t('saved.saved') : t('saved.save')}
                    </Button>
                    <div className="text-right">
                      <div className="text-xl font-bold font-mono">${analysis.lastPrice?.toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(analysis.asOf).toLocaleDateString(language === 'it' ? 'it-IT' : 'en-US', {
                          month: 'short', day: 'numeric', year: 'numeric'
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Overlays Toggle */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-2">{t('chart.toggles.title')}</span>
                  <ToggleBtn label={t('indicator.sma50')} active={showSMA50} onClick={() => setShowSMA50(!showSMA50)} tooltip={t('tooltip.sma')} />
                  <ToggleBtn label={t('indicator.sma200')} active={showSMA200} onClick={() => setShowSMA200(!showSMA200)} tooltip={t('tooltip.sma')} />
                  <ToggleBtn label={t('indicator.ema20')} active={showEMA20} onClick={() => setShowEMA20(!showEMA20)} tooltip={t('tooltip.ema')} />
                  <ToggleBtn label={t('indicator.ema50')} active={showEMA50} onClick={() => setShowEMA50(!showEMA50)} tooltip={t('tooltip.ema')} />
                </div>

                <div className="flex-1 bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col relative">
                  <TechnicalChart 
                    data={analysis}
                    showSMA50={showSMA50}
                    showSMA200={showSMA200}
                    showEMA20={showEMA20}
                    showEMA50={showEMA50}
                  />
                  
                  {/* Badges overlaid on chart */}
                  <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none">
                    {analysis.unusualVolume && (
                      <div className="bg-amber-500/90 text-white text-xs font-bold px-2 py-1 rounded shadow-sm backdrop-blur-md flex items-center gap-1">
                        <AlertTriangle size={12} /> {t('chart.unusualVolume')}
                      </div>
                    )}
                    <div className="bg-background/80 backdrop-blur-md border border-border text-foreground text-xs font-medium px-2 py-1 rounded shadow-sm flex items-center gap-1">
                      {t('tooltip.market_structure')}: {t(`ms.${analysis.marketStructure}`)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Analysis Explanation */}
              <div className="flex flex-col h-full bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-border bg-muted/30 flex justify-between items-center shrink-0">
                  <h3 className="font-semibold flex items-center gap-2">
                    <BookOpen size={18} className="text-primary" />
                    {t('explain.title')}
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => setShowGlossary(true)} className="h-8 text-xs font-medium">
                    {t('glossary.trigger')}
                  </Button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-8">
                  {/* Overall Summary */}
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-primary mb-2">
                      {t('explain.summary')}
                    </h4>
                    <p className="text-sm text-foreground/90 leading-relaxed font-medium">
                      {analysis.explanation.summary}
                    </p>
                  </div>

                  {/* Indicator Reads */}
                  <div className="space-y-3">
                    {analysis.explanation.indicatorReads.map((read, idx) => (
                      <div key={idx} className="bg-background border border-border/60 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 font-medium text-sm">
                            {read.label}
                            <InfoTooltip text={t(`tooltip.${read.key.replace(/[0-9]/g, '')}`)} />
                          </div>
                          <SignalBadge signal={read.signal} label={t(`signal.${read.signal}`)} />
                        </div>
                        <div className="text-xs font-mono text-muted-foreground mb-1 border-b border-border/30 pb-2">
                          Value: {read.currentValueLabel}
                        </div>
                        <p className="text-sm text-foreground/90 leading-relaxed">
                          {read.explanation}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Summary Cases */}
                  <div className="grid grid-cols-1 gap-4">
                    <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-green-700 dark:text-green-400 mb-2 flex items-center gap-2">
                        <TrendingUp size={16} />
                        {t('explain.bullish_case')}
                      </h4>
                      <p className="text-sm text-foreground/90 leading-relaxed">{analysis.explanation.bullishCase}</p>
                    </div>
                    <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2 flex items-center gap-2">
                        <TrendingDown size={16} />
                        {t('explain.bearish_case')}
                      </h4>
                      <p className="text-sm text-foreground/90 leading-relaxed">{analysis.explanation.bearishCase}</p>
                    </div>
                  </div>

                  {/* Levels & Illustrative Setup */}
                  <div className="space-y-4 pt-4 border-t border-border/50">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      {t('explain.levels')}
                      <InfoTooltip text={t('tooltip.support_resistance')} />
                    </h4>
                    
                    <div className="space-y-3">
                      {analysis.explanation.levels.support && (
                        <div className="flex justify-between items-start text-sm">
                          <span className="text-muted-foreground font-medium w-24 shrink-0">{t('explain.support')}</span>
                          <div className="flex-1 text-right">
                            <span className="font-mono font-semibold">${analysis.explanation.levels.support}</span>
                            <p className="text-xs text-muted-foreground mt-1 text-left">{analysis.explanation.levels.supportReasoning}</p>
                          </div>
                        </div>
                      )}
                      {analysis.explanation.levels.resistance && (
                        <div className="flex justify-between items-start text-sm">
                          <span className="text-muted-foreground font-medium w-24 shrink-0">{t('explain.resistance')}</span>
                          <div className="flex-1 text-right">
                            <span className="font-mono font-semibold">${analysis.explanation.levels.resistance}</span>
                            <p className="text-xs text-muted-foreground mt-1 text-left">{analysis.explanation.levels.resistanceReasoning}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {analysis.explanation.levels.illustrativeSetup && (
                      <div className="mt-6 border border-dashed border-primary/30 rounded-lg p-4 bg-muted/20 relative">
                        <div className="absolute -top-3 left-4 bg-card px-2 text-xs font-semibold text-primary uppercase tracking-wider">
                          {t('explain.illustrative')}
                        </div>
                        <p className="text-xs text-muted-foreground mb-4 mt-2 italic border-b border-border/50 pb-3">
                          {t('explain.illustrative.desc')}
                        </p>
                        <div className="space-y-3 text-sm">
                           <div className="grid grid-cols-[80px_1fr] gap-2">
                             <span className="font-medium text-foreground">{t('explain.entry')}</span>
                             <div>
                               <span className="font-mono">${analysis.explanation.levels.illustrativeSetup.entry}</span>
                               <span className="text-xs text-muted-foreground block">{analysis.explanation.levels.illustrativeSetup.entryReasoning}</span>
                             </div>
                           </div>
                           <div className="grid grid-cols-[80px_1fr] gap-2">
                             <span className="font-medium text-red-500">{t('explain.stop')}</span>
                             <div>
                               <span className="font-mono text-red-500">${analysis.explanation.levels.illustrativeSetup.stop}</span>
                               <span className="text-xs text-muted-foreground block">{analysis.explanation.levels.illustrativeSetup.stopReasoning}</span>
                             </div>
                           </div>
                           <div className="grid grid-cols-[80px_1fr] gap-2">
                             <span className="font-medium text-green-500">{t('explain.target')}</span>
                             <div>
                               <span className="font-mono text-green-500">${analysis.explanation.levels.illustrativeSetup.target}</span>
                               <span className="text-xs text-muted-foreground block">{analysis.explanation.levels.illustrativeSetup.targetReasoning}</span>
                             </div>
                           </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Disclaimer in panel */}
                  <div className="p-3 bg-muted rounded text-xs text-muted-foreground leading-relaxed italic border-l-2 border-primary/30">
                    {analysis.explanation.disclaimer}
                  </div>
                </div>
              </div>

            </div>
          ) : null
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] border-2 border-dashed border-border rounded-xl bg-card/50 text-center p-8">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center text-muted-foreground mb-6">
              <Search size={32} />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Ready to analyze</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Search for a US stock or ETF ticker in the box above to generate a full technical analysis breakdown.
            </p>
          </div>
        )}

      </div>

      {/* Glossary Drawer/Modal */}
      {showGlossary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card border border-border shadow-2xl rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col animate-in zoom-in-95 slide-in-from-bottom-4">
            <div className="p-4 border-b border-border flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <BookOpen size={20} className="text-primary" />
                {t('glossary.title')}
              </h3>
              <button onClick={() => setShowGlossary(false)} className="p-2 hover:bg-muted rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-6">
              <GlossaryItem term="SMA" def={t('tooltip.sma')} />
              <GlossaryItem term="EMA" def={t('tooltip.ema')} />
              <GlossaryItem term="RSI" def={t('tooltip.rsi')} />
              <GlossaryItem term="MACD" def={t('tooltip.macd')} />
              <GlossaryItem term="Volume" def={t('tooltip.volume')} />
              <GlossaryItem term="Support & Resistance" def={t('tooltip.support_resistance')} />
              <GlossaryItem term="Market Structure" def={t('tooltip.market_structure')} />
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

function ToggleBtn({ label, active, onClick, tooltip }: { label: string, active: boolean, onClick: () => void, tooltip: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-all flex items-center gap-1.5 ${
            active 
              ? 'bg-primary border-primary text-primary-foreground shadow-sm' 
              : 'bg-background border-border text-muted-foreground hover:bg-muted'
          }`}
        >
          <div className={`w-2 h-2 rounded-full ${active ? 'bg-primary-foreground' : 'bg-muted-foreground/30'}`} />
          {label}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

function InfoTooltip({ text }: { text: string }) {
  if (!text || text === 'text') return null; // fallback if dict is missing
  return (
    <Tooltip>
      <TooltipTrigger type="button" className="text-muted-foreground hover:text-foreground transition-colors cursor-help">
        <Info size={14} />
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-xs leading-relaxed p-3">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

function SignalBadge({ signal, label }: { signal: 'bullish' | 'bearish' | 'neutral', label: string }) {
  if (signal === 'bullish') {
    return (
      <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-2 py-1 bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 rounded">
        <TrendingUp size={12} /> {label}
      </span>
    );
  }
  if (signal === 'bearish') {
    return (
      <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-2 py-1 bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 rounded">
        <TrendingDown size={12} /> {label}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-2 py-1 bg-muted text-muted-foreground border border-border rounded">
      <Minus size={12} /> {label}
    </span>
  );
}

function GlossaryItem({ term, def }: { term: string, def: string }) {
  return (
    <div>
      <h4 className="font-bold text-foreground mb-1">{term}</h4>
      <p className="text-sm text-muted-foreground leading-relaxed">{def}</p>
    </div>
  );
}
