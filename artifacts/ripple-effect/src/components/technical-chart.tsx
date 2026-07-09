import React, { useEffect, useRef } from 'react';
import {
  createChart,
  ColorType,
  IChartApi,
  ISeriesApi,
  LineStyle,
  CrosshairMode,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
} from 'lightweight-charts';
import type { StockAnalysis } from '@workspace/api-client-react';

interface TechnicalChartProps {
  data: StockAnalysis;
  showSMA50: boolean;
  showSMA200: boolean;
  showEMA20: boolean;
  showEMA50: boolean;
}

export default function TechnicalChart({ 
  data, 
  showSMA50, 
  showSMA200, 
  showEMA20, 
  showEMA50 
}: TechnicalChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const rsiContainerRef = useRef<HTMLDivElement>(null);
  const macdContainerRef = useRef<HTMLDivElement>(null);
  
  const chartRef = useRef<IChartApi | null>(null);
  const rsiChartRef = useRef<IChartApi | null>(null);
  const macdChartRef = useRef<IChartApi | null>(null);
  
  // Main Series refs
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const sma50SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const sma200SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const ema20SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const ema50SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current || !rsiContainerRef.current || !macdContainerRef.current) return;
    
    const isDark = document.documentElement.classList.contains('dark');
    const bgColor = isDark ? '#1C2128' : '#FFFFFF';
    const textColor = isDark ? '#9CA3AF' : '#6B7280';
    const gridColor = isDark ? '#374151' : '#F3F4F6';

    const commonChartOptions = {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor,
        fontFamily: 'Outfit, sans-serif',
      },
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: gridColor },
      timeScale: { borderColor: gridColor, timeVisible: true },
    };

    // --- MAIN CHART ---
    const chart = createChart(chartContainerRef.current, {
      ...commonChartOptions,
      autoSize: true,
    });
    chartRef.current = chart;

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10B981',
      downColor: '#EF4444',
      borderVisible: false,
      wickUpColor: '#10B981',
      wickDownColor: '#EF4444',
    });
    
    const sortedCandles = [...data.candles].sort((a, b) => a.time - b.time);
    candleSeries.setData(sortedCandles.map(c => ({
      time: c.time as any, open: c.open, high: c.high, low: c.low, close: c.close,
    })));
    candleSeriesRef.current = candleSeries;

    data.supportLevels.forEach(price => {
      candleSeries.createPriceLine({
        price, color: '#10B981', lineWidth: 2, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: 'Support',
      });
    });

    data.resistanceLevels.forEach(price => {
      candleSeries.createPriceLine({
        price, color: '#EF4444', lineWidth: 2, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: 'Resistance',
      });
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#3B82F6',
      priceFormat: { type: 'volume' },
      priceScaleId: '',
    });
    chart.priceScale('').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });
    volumeSeries.setData(sortedCandles.map(c => ({
      time: c.time as any, value: c.volume, color: c.close >= c.open ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)',
    })));


    // --- RSI CHART ---
    const rsiChart = createChart(rsiContainerRef.current, {
      ...commonChartOptions,
      autoSize: true,
    });
    rsiChartRef.current = rsiChart;
    
    const rsiSeries = rsiChart.addSeries(LineSeries, {
      color: '#8B5CF6',
      lineWidth: 2,
    });
    const sortedRSI = [...data.rsi14].sort((a,b)=>a.time-b.time);
    rsiSeries.setData(sortedRSI.map(d => ({ time: d.time as any, value: d.value })));
    
    rsiSeries.createPriceLine({ price: 70, color: '#EF4444', lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: false });
    rsiSeries.createPriceLine({ price: 30, color: '#10B981', lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: false });


    // --- MACD CHART ---
    const macdChart = createChart(macdContainerRef.current, {
      ...commonChartOptions,
      autoSize: true,
    });
    macdChartRef.current = macdChart;
    
    const macdLine = macdChart.addSeries(LineSeries, { color: '#3B82F6', lineWidth: 2 });
    const signalLine = macdChart.addSeries(LineSeries, { color: '#F59E0B', lineWidth: 2 });
    const macdHist = macdChart.addSeries(HistogramSeries, {
      color: '#64748b',
    });

    const sortedMACD = [...data.macd].sort((a,b)=>a.time-b.time);
    macdLine.setData(sortedMACD.map(d => ({ time: d.time as any, value: d.macd })));
    signalLine.setData(sortedMACD.map(d => ({ time: d.time as any, value: d.signal })));
    macdHist.setData(sortedMACD.map(d => ({
      time: d.time as any, value: d.histogram, color: d.histogram >= 0 ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)'
    })));

    // Sync Time Scales
    const timeScale1 = chart.timeScale();
    const timeScale2 = rsiChart.timeScale();
    const timeScale3 = macdChart.timeScale();

    timeScale1.subscribeVisibleTimeRangeChange((range) => {
      if(range) { timeScale2.setVisibleRange(range); timeScale3.setVisibleRange(range); }
    });
    timeScale2.subscribeVisibleTimeRangeChange((range) => {
      if(range) { timeScale1.setVisibleRange(range); timeScale3.setVisibleRange(range); }
    });
    timeScale3.subscribeVisibleTimeRangeChange((range) => {
      if(range) { timeScale1.setVisibleRange(range); timeScale2.setVisibleRange(range); }
    });

    timeScale1.fitContent();

    return () => {
      chart.remove();
      rsiChart.remove();
      macdChart.remove();
      chartRef.current = null;
      rsiChartRef.current = null;
      macdChartRef.current = null;
    };
  }, [data]);

  useEffect(() => {
    if (!chartRef.current) return;
    
    if (showSMA50 && !sma50SeriesRef.current && data.sma50.length > 0) {
      const s = chartRef.current.addSeries(LineSeries, { color: '#3B82F6', lineWidth: 2, title: 'SMA 50' });
      s.setData([...data.sma50].sort((a,b)=>a.time-b.time).map(d => ({ time: d.time as any, value: d.value })));
      sma50SeriesRef.current = s;
    } else if (!showSMA50 && sma50SeriesRef.current) {
      chartRef.current.removeSeries(sma50SeriesRef.current);
      sma50SeriesRef.current = null;
    }

    if (showSMA200 && !sma200SeriesRef.current && data.sma200.length > 0) {
      const s = chartRef.current.addSeries(LineSeries, { color: '#8B5CF6', lineWidth: 2, title: 'SMA 200' });
      s.setData([...data.sma200].sort((a,b)=>a.time-b.time).map(d => ({ time: d.time as any, value: d.value })));
      sma200SeriesRef.current = s;
    } else if (!showSMA200 && sma200SeriesRef.current) {
      chartRef.current.removeSeries(sma200SeriesRef.current);
      sma200SeriesRef.current = null;
    }

    if (showEMA20 && !ema20SeriesRef.current && data.ema20.length > 0) {
      const s = chartRef.current.addSeries(LineSeries, { color: '#F59E0B', lineWidth: 2, title: 'EMA 20' });
      s.setData([...data.ema20].sort((a,b)=>a.time-b.time).map(d => ({ time: d.time as any, value: d.value })));
      ema20SeriesRef.current = s;
    } else if (!showEMA20 && ema20SeriesRef.current) {
      chartRef.current.removeSeries(ema20SeriesRef.current);
      ema20SeriesRef.current = null;
    }

    if (showEMA50 && !ema50SeriesRef.current && data.ema50.length > 0) {
      const s = chartRef.current.addSeries(LineSeries, { color: '#F97316', lineWidth: 2, title: 'EMA 50' });
      s.setData([...data.ema50].sort((a,b)=>a.time-b.time).map(d => ({ time: d.time as any, value: d.value })));
      ema50SeriesRef.current = s;
    } else if (!showEMA50 && ema50SeriesRef.current) {
      chartRef.current.removeSeries(ema50SeriesRef.current);
      ema50SeriesRef.current = null;
    }

  }, [showSMA50, showSMA200, showEMA20, showEMA50, data]);

  return (
    <div className="w-full h-full flex flex-col bg-transparent">
      {/* Main Chart Container */}
      <div className="flex-1 w-full relative min-h-[300px]">
        <div ref={chartContainerRef} className="absolute inset-0" />
      </div>
      
      {/* RSI Container */}
      <div className="h-[120px] w-full border-t border-border/50 relative">
        <div className="absolute top-2 left-2 z-10 text-xs font-semibold text-muted-foreground bg-card/80 px-1 rounded">RSI (14)</div>
        <div ref={rsiContainerRef} className="absolute inset-0" />
      </div>

      {/* MACD Container */}
      <div className="h-[120px] w-full border-t border-border/50 relative">
        <div className="absolute top-2 left-2 z-10 text-xs font-semibold text-muted-foreground bg-card/80 px-1 rounded">MACD (12,26,9)</div>
        <div ref={macdContainerRef} className="absolute inset-0" />
      </div>
    </div>
  );
}
