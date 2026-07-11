import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'it';

type Dictionary = {
  [key in Language]: {
    [key: string]: string;
  };
};

const dict: Dictionary = {
  en: {
    // Navigation
    'nav.products': 'Products',
    'nav.signin': 'Sign In',
    'nav.signup': 'Sign Up',
    'nav.signout': 'Sign Out',
    
    // Landing
    'landing.title': 'Understand the mechanics.',
    'landing.subtitle': 'Not a guru telling you what to do. The Ripple Effect is a credible, calm learning environment to study market mechanics and technical analysis through education.',
    'landing.cta': 'Start Learning',
    'landing.product1.title': 'Automated Technical Analysis',
    'landing.product1.desc': 'Search any US stock or ETF to see real-time technical indicators and read a balanced, plain-language breakdown of what they signal. No fake urgency, just facts.',
    
    // Products Hub
    'hub.title': 'Your Products',
    'hub.subtitle': 'Educational tools to build your market understanding.',
    'product.ta.title': 'Automated Technical Analysis',
    'product.ta.desc': 'Interactive charts, technical indicators, and plain-language explanations.',
    'product.ta.action': 'Open Tool',
    
    // Technical Analysis App
    'ta.search.placeholder': 'Search a US stock or ETF...',
    'ta.search.empty': 'No results found.',
    'ta.search.loading': 'Searching...',
    
    // Timeframes
    'tf.1D': '1D',
    'tf.1W': '1W',
    'tf.1M': '1M',
    'tf.3M': '3M',
    'tf.1Y': '1Y',
    'tf.5Y': '5Y',
    
    // Chart
    'chart.toggles.title': 'Overlays',
    'chart.unusualVolume': 'Unusual Volume Detected',
    
    // Indicators & Tooltips
    'indicator.sma50': '50-Day SMA',
    'indicator.sma200': '200-Day SMA',
    'indicator.ema20': '20-Day EMA',
    'indicator.ema50': '50-Day EMA',
    'indicator.rsi': 'RSI',
    'indicator.macd': 'MACD',
    
    'tooltip.sma': 'Simple Moving Average: The average price over a specific number of periods. Helps smooth out price action to identify trends.',
    'tooltip.ema': 'Exponential Moving Average: Similar to SMA, but gives more weight to recent prices, making it react faster to price changes.',
    'tooltip.rsi': 'Relative Strength Index: A momentum oscillator measuring the speed and change of price movements. Typically, above 70 is considered overbought and below 30 is oversold.',
    'tooltip.macd': 'Moving Average Convergence Divergence: A trend-following momentum indicator that shows the relationship between two moving averages of a price.',
    'tooltip.volume': 'Trading Volume: The number of shares traded during a given period. High volume can confirm a trend.',
    'tooltip.support_resistance': 'Support is a price level where a downtrend tends to pause due to a concentration of demand. Resistance is where an uptrend pauses due to supply.',
    'tooltip.market_structure': 'The sequence of highs and lows. Higher highs and higher lows define an uptrend.',

    // Badges & Signals
    'signal.bullish': 'Bullish',
    'signal.bearish': 'Bearish',
    'signal.neutral': 'Neutral',
    
    // Explanation Panel
    'explain.title': 'What the indicators are saying',
    'explain.bullish_case': 'The Bullish Case',
    'explain.bearish_case': 'The Bearish Case',
    'explain.summary': 'Summary',
    'explain.levels': 'Key Levels',
    'explain.illustrative': 'Illustrative Setup',
    'explain.illustrative.desc': 'This is an educational example of how a trader might frame a setup based on these levels. It is not a recommendation.',
    'explain.entry': 'Entry',
    'explain.stop': 'Stop Loss',
    'explain.target': 'Target',
    'explain.support': 'Support',
    'explain.resistance': 'Resistance',
    'explain.ma200': '200 SMA',
    
    // Market Structure
    'ms.higher_highs_higher_lows': 'Uptrend (HH/HL)',
    'ms.lower_highs_lower_lows': 'Downtrend (LH/LL)',
    'ms.sideways': 'Sideways',
    'ms.mixed': 'Mixed Structure',
    
    // Beginner Mode
    'guide.title': 'How to read this chart',
    'guide.desc': 'This tool helps you learn technical analysis. The chart above shows the price history (candlesticks) and volume. You can overlay moving averages to see trends. The panel on the right explains what each indicator suggests in plain English. Remember, indicators describe probabilities, not certainties.',
    'guide.dismiss': 'Got it',
    
    // Glossary
    'glossary.title': 'Glossary',
    'glossary.trigger': 'Open Glossary',
    'glossary.close': 'Close',

    // Disclaimers
    'disclaimer.banner': 'Educational tool for learning technical analysis. Not financial advice. Technical indicators describe probabilities, not certainties, and can be wrong. Do your own research.',

    // Saved analyses
    'saved.save': 'Save analysis',
    'saved.saved': 'Saved',
    'saved.trigger': 'Saved',
    'saved.empty': 'No saved analyses yet. Open a ticker and save it to find it here later.',
    'saved.remove': 'Remove',
    'saved.toast.saved': 'Analysis saved.',
    'saved.toast.error': 'Could not save this analysis. Please try again.',

    // Nav additions
    'nav.ta': 'Technical',
    'nav.fa': 'Fundamental',

    // Products hub - Fundamental Analysis card
    'product.fa.title': 'Automated Fundamental Analysis',
    'product.fa.desc': 'Revenue trends, profitability ratios, cash flow quality, valuation multiples, peer comparison, red flags, and an AI-generated plain-language explanation.',
    'product.fa.action': 'Open Tool',

    // Fundamental Analysis page
    'fa.search.placeholder': 'Search a US stock or ETF...',
    'fa.search.empty': 'No results found.',
    'fa.search.loading': 'Searching...',
    'fa.noSymbol': 'Search for a US stock or ETF above to start the fundamental analysis.',
    'fa.loading': 'Fetching financial statements, computing metrics, and generating AI explanation…',
    'fa.error': 'Could not load fundamental data. The ticker may not have sufficient financial data.',

    // Section titles
    'fa.section.scores': 'Fundamental Health',
    'fa.section.growth': 'Growth',
    'fa.section.profitability': 'Profitability',
    'fa.section.cashflow': 'Cash Generation & Earnings Quality',
    'fa.section.strength': 'Financial Strength',
    'fa.section.efficiency': 'Capital Efficiency',
    'fa.section.valuation': 'Valuation',
    'fa.section.peers': 'Peer Comparison',
    'fa.section.historical': 'Historical Trends',
    'fa.section.flags': 'Risks & Red Flags',
    'fa.section.strengths': 'Fundamental Strengths',
    'fa.section.explanation': 'AI Analysis',

    // Score labels
    'fa.score.very_strong': 'Very Strong',
    'fa.score.strong': 'Strong',
    'fa.score.neutral': 'Neutral',
    'fa.score.weak': 'Weak',
    'fa.score.very_weak': 'Very Weak',
    'fa.score.overall': 'Overall Score',

    // Dimensions
    'fa.dim.growth': 'Growth',
    'fa.dim.profitability': 'Profitability',
    'fa.dim.cashFlow': 'Cash Flow',
    'fa.dim.financialStrength': 'Financial Strength',
    'fa.dim.capitalEfficiency': 'Capital Efficiency',
    'fa.dim.valuation': 'Valuation',

    // Table columns
    'fa.col.metric': 'Metric',
    'fa.col.value': 'Value (TTM)',
    'fa.col.peerMedian': 'Peer Median',
    'fa.col.trend': 'Trend',
    'fa.col.vsPeers': 'vs Peers',
    'fa.col.vsHistory': 'vs History (3Y)',
    'fa.col.peerPct': 'Peer %ile',
    'fa.col.current': 'Current',

    // Metric labels
    'fa.metric.revenueTtm': 'Revenue TTM',
    'fa.metric.revenueYoy': 'Revenue Growth YoY',
    'fa.metric.revenue3yCagr': 'Revenue CAGR 3Y',
    'fa.metric.revenue5yCagr': 'Revenue CAGR 5Y',
    'fa.metric.revenueQoQ': 'Revenue QoQ',
    'fa.metric.revenueYoYQ': 'Revenue YoY (Latest Q)',
    'fa.metric.epsTtm': 'EPS Diluted TTM',
    'fa.metric.epsYoy': 'EPS Growth YoY',
    'fa.metric.eps3yCagr': 'EPS CAGR 3Y',
    'fa.metric.opIncYoy': 'Operating Income Growth',
    'fa.metric.netIncYoy': 'Net Income Growth',
    'fa.metric.ocfYoy': 'Operating Cash Flow Growth',
    'fa.metric.fcfYoy': 'Free Cash Flow Growth',
    'fa.metric.fcf3yCagr': 'FCF CAGR 3Y',
    'fa.metric.grossMargin': 'Gross Margin',
    'fa.metric.opMargin': 'Operating Margin',
    'fa.metric.ebitdaMargin': 'EBITDA Margin',
    'fa.metric.netMargin': 'Net Margin',
    'fa.metric.fcfMargin': 'FCF Margin',
    'fa.metric.roa': 'Return on Assets (ROA)',
    'fa.metric.roe': 'Return on Equity (ROE)',
    'fa.metric.roic': 'Return on Invested Capital (ROIC)',
    'fa.metric.ocfTtm': 'Operating Cash Flow',
    'fa.metric.capex': 'Capital Expenditure',
    'fa.metric.fcfTtm': 'Free Cash Flow',
    'fa.metric.fcfPerShare': 'FCF per Share',
    'fa.metric.cashConversion': 'Cash Conversion Ratio (OCF/NI)',
    'fa.metric.sbcRev': 'SBC / Revenue',
    'fa.metric.earningsQuality': 'Earnings Quality',
    'fa.metric.cash': 'Cash & Equivalents',
    'fa.metric.totalDebt': 'Total Debt',
    'fa.metric.netDebt': 'Net Debt',
    'fa.metric.de': 'Debt / Equity',
    'fa.metric.da': 'Debt / Assets',
    'fa.metric.ndEbitda': 'Net Debt / EBITDA',
    'fa.metric.currentRatio': 'Current Ratio',
    'fa.metric.quickRatio': 'Quick Ratio',
    'fa.metric.intCoverage': 'Interest Coverage',
    'fa.metric.goodwillAssets': 'Goodwill / Assets',
    'fa.metric.assetTurnover': 'Asset Turnover',
    'fa.metric.dso': 'Days Sales Outstanding (DSO)',
    'fa.metric.dio': 'Days Inventory Outstanding (DIO)',
    'fa.metric.dpo': 'Days Payable Outstanding (DPO)',
    'fa.metric.ccc': 'Cash Conversion Cycle',
    'fa.metric.pe': 'P/E',
    'fa.metric.forwardPe': 'Forward P/E',
    'fa.metric.ps': 'Price / Sales',
    'fa.metric.pb': 'Price / Book',
    'fa.metric.pFcf': 'Price / FCF',
    'fa.metric.evRev': 'EV / Revenue',
    'fa.metric.evEbitda': 'EV / EBITDA',
    'fa.metric.evEbit': 'EV / EBIT',
    'fa.metric.divYield': 'Dividend Yield',
    'fa.metric.buybackYield': 'Buyback Yield',
    'fa.metric.dilution1y': 'Share Dilution (1Y)',
    'fa.metric.dilution3y': 'Share Dilution (3Y CAGR)',

    // Earnings quality labels
    'fa.eq.high': 'High',
    'fa.eq.adequate': 'Adequate',
    'fa.eq.weak': 'Weak',
    'fa.eq.very_weak': 'Very Weak',

    // Trend labels
    'fa.trend.improving': 'Improving',
    'fa.trend.declining': 'Declining',
    'fa.trend.stable': 'Stable',

    // Peer table columns
    'fa.peers.symbol': 'Ticker',
    'fa.peers.mktCap': 'Mkt Cap',
    'fa.peers.revGrowth': 'Rev Growth',
    'fa.peers.grossMargin': 'Gross Margin',
    'fa.peers.opMargin': 'Op Margin',
    'fa.peers.roic': 'ROIC',
    'fa.peers.pe': 'P/E',
    'fa.peers.evEbitda': 'EV/EBITDA',
    'fa.peers.evSales': 'EV/Sales',
    'fa.peers.noPeers': 'No peer data available.',

    // Historical chart labels
    'fa.hist.revenue': 'Revenue',
    'fa.hist.opIncome': 'Operating Income',
    'fa.hist.netIncome': 'Net Income',
    'fa.hist.eps': 'EPS Diluted',
    'fa.hist.ocf': 'Operating Cash Flow',
    'fa.hist.fcf': 'Free Cash Flow',
    'fa.hist.margins': 'Margins',
    'fa.hist.netDebt': 'Net Debt',
    'fa.hist.shares': 'Shares Outstanding',

    // Red flags severity
    'fa.flag.high': 'High',
    'fa.flag.medium': 'Medium',
    'fa.flag.low': 'Low',
    'fa.flags.none': 'No significant risk flags detected.',
    'fa.strengths.none': 'No significant strengths detected from available data.',

    // Valuation matrix
    'fa.matrix.title': 'Quality / Valuation Matrix',
    'fa.matrix.quality': 'Fundamental Quality',
    'fa.matrix.valuation': 'Relative Valuation',
    'fa.matrix.cheap': 'Cheap vs Peers',
    'fa.matrix.expensive': 'Expensive vs Peers',
    'fa.matrix.strong': 'Strong Fundamentals',
    'fa.matrix.weak': 'Weak Fundamentals',

    // AI explanation panel
    'fa.explain.summary': 'Summary',
    'fa.explain.growth': 'Growth',
    'fa.explain.profitability': 'Profitability',
    'fa.explain.cashflow': 'Cash Flow',
    'fa.explain.balance': 'Balance Sheet',
    'fa.explain.valuation': 'Valuation',
    'fa.explain.peers': 'Peer Group',
    'fa.explain.strengths': 'Strengths',
    'fa.explain.risks': 'Risks',
    'fa.explain.conclusion': 'Conclusion',

    // Coverage / confidence
    'fa.coverage': 'Data coverage',
    'fa.confidence.high': 'High confidence',
    'fa.confidence.medium': 'Medium confidence',
    'fa.confidence.low': 'Low confidence',

    // Misc
    'fa.netCash': 'Net Cash',
    'fa.nm': 'N/M',
    'fa.na': 'N/A',
    'fa.ttm': 'TTM',
    'fa.lastFiling': 'Last filing',
    'fa.fiscalYearEnd': 'Fiscal year end',
    'fa.disclaimer': 'This analysis is for informational and educational purposes only and does not constitute financial, tax, or legal advice. Data may contain errors, delays, or omissions. Fair value estimates depend on the assumptions used and do not represent a certain prediction of the future price.',
    'fa.roe.warning.negative_equity': 'Warning: ROE computed with negative equity — not meaningful as a quality measure.',
    'fa.roe.warning.high_leverage': 'Note: High ROE partly driven by financial leverage.',
  },
  it: {
    // Navigation
    'nav.products': 'Prodotti',
    'nav.signin': 'Accedi',
    'nav.signup': 'Registrati',
    'nav.signout': 'Esci',
    
    // Landing
    'landing.title': 'Comprendi i meccanismi.',
    'landing.subtitle': 'Non un guru che ti dice cosa fare. The Ripple Effect è un ambiente di apprendimento credibile e calmo per studiare le dinamiche di mercato e l\'analisi tecnica attraverso la formazione.',
    'landing.cta': 'Inizia a Imparare',
    'landing.product1.title': 'Analisi Tecnica Automatica',
    'landing.product1.desc': 'Cerca qualsiasi azione o ETF USA per vedere indicatori tecnici in tempo reale e leggere una spiegazione equilibrata in linguaggio semplice su cosa segnalano. Nessuna urgenza fittizia, solo fatti.',
    
    // Products Hub
    'hub.title': 'I tuoi Prodotti',
    'hub.subtitle': 'Strumenti educativi per costruire la tua comprensione del mercato.',
    'product.ta.title': 'Analisi Tecnica Automatica',
    'product.ta.desc': 'Grafici interattivi, indicatori tecnici e spiegazioni in linguaggio semplice.',
    'product.ta.action': 'Apri Strumento',
    
    // Technical Analysis App
    'ta.search.placeholder': 'Cerca un\'azione o un ETF USA...',
    'ta.search.empty': 'Nessun risultato trovato.',
    'ta.search.loading': 'Ricerca in corso...',
    
    // Timeframes
    'tf.1D': '1G',
    'tf.1W': '1S',
    'tf.1M': '1M',
    'tf.3M': '3M',
    'tf.1Y': '1A',
    'tf.5Y': '5A',
    
    // Chart
    'chart.toggles.title': 'Sovrapposizioni',
    'chart.unusualVolume': 'Volume Anomalo Rilevato',
    
    // Indicators & Tooltips
    'indicator.sma50': 'SMA 50 Giorni',
    'indicator.sma200': 'SMA 200 Giorni',
    'indicator.ema20': 'EMA 20 Giorni',
    'indicator.ema50': 'EMA 50 Giorni',
    'indicator.rsi': 'RSI',
    'indicator.macd': 'MACD',
    
    'tooltip.sma': 'Media Mobile Semplice (SMA): Il prezzo medio su un numero specifico di periodi. Aiuta a smussare l\'azione del prezzo per identificare i trend.',
    'tooltip.ema': 'Media Mobile Esponenziale (EMA): Simile alla SMA, ma dà maggior peso ai prezzi recenti, rendendola più reattiva alle variazioni di prezzo.',
    'tooltip.rsi': 'Indice di Forza Relativa (RSI): Un oscillatore di momentum che misura la velocità e la variazione dei movimenti di prezzo. Valori sopra 70 indicano ipercomprato, sotto 30 ipervenduto.',
    'tooltip.macd': 'Moving Average Convergence Divergence: Un indicatore di momentum che segue il trend, mostrando la relazione tra due medie mobili di un prezzo.',
    'tooltip.volume': 'Volume di Scambio: Il numero di azioni scambiate in un dato periodo. Un volume elevato può confermare un trend.',
    'tooltip.support_resistance': 'Il supporto è un livello di prezzo in cui un trend ribassista tende a fermarsi per un concentramento di domanda. La resistenza è dove un trend rialzista si ferma a causa dell\'offerta.',
    'tooltip.market_structure': 'La sequenza di massimi e minimi. Massimi e minimi crescenti definiscono un trend rialzista.',

    // Badges & Signals
    'signal.bullish': 'Rialzista',
    'signal.bearish': 'Ribassista',
    'signal.neutral': 'Neutrale',
    
    // Explanation Panel
    'explain.title': 'Cosa dicono gli indicatori',
    'explain.bullish_case': 'Lo Scenario Rialzista',
    'explain.bearish_case': 'Lo Scenario Ribassista',
    'explain.summary': 'Riepilogo',
    'explain.levels': 'Livelli Chiave',
    'explain.illustrative': 'Setup Illustrativo',
    'explain.illustrative.desc': 'Questo è un esempio educativo di come un trader potrebbe strutturare un setup basandosi su questi livelli. Non è una raccomandazione d\'investimento.',
    'explain.entry': 'Ingresso',
    'explain.stop': 'Stop Loss',
    'explain.target': 'Target',
    'explain.support': 'Supporto',
    'explain.resistance': 'Resistenza',
    'explain.ma200': 'SMA 200',
    
    // Market Structure
    'ms.higher_highs_higher_lows': 'Trend Rialzista (HH/HL)',
    'ms.lower_highs_lower_lows': 'Trend Ribassista (LH/LL)',
    'ms.sideways': 'Laterale',
    'ms.mixed': 'Struttura Mista',
    
    // Beginner Mode
    'guide.title': 'Come leggere questo grafico',
    'guide.desc': 'Questo strumento ti aiuta a imparare l\'analisi tecnica. Il grafico mostra la storia dei prezzi (candele) e il volume. Puoi sovrapporre le medie mobili per vedere i trend. Il pannello a destra spiega in linguaggio semplice cosa suggerisce ogni indicatore. Ricorda, gli indicatori descrivono probabilità, non certezze.',
    'guide.dismiss': 'Ho capito',
    
    // Glossary
    'glossary.title': 'Glossario',
    'glossary.trigger': 'Apri Glossario',
    'glossary.close': 'Chiudi',

    // Disclaimers
    'disclaimer.banner': 'Strumento educativo per l\'apprendimento dell\'analisi tecnica. Non è una consulenza finanziaria. Gli indicatori tecnici descrivono probabilità, non certezze, e possono sbagliare. Fai le tue ricerche.',

    // Saved analyses
    'saved.save': 'Salva analisi',
    'saved.saved': 'Salvata',
    'saved.trigger': 'Salvate',
    'saved.empty': 'Nessuna analisi salvata. Apri un titolo e salvalo per ritrovarlo qui.',
    'saved.remove': 'Rimuovi',
    'saved.toast.saved': 'Analisi salvata.',
    'saved.toast.error': 'Impossibile salvare questa analisi. Riprova.',

    // Nav additions
    'nav.ta': 'Tecnica',
    'nav.fa': 'Fondamentale',

    // Products hub - Fundamental Analysis card
    'product.fa.title': 'Analisi Fondamentale Automatica',
    'product.fa.desc': 'Trend dei ricavi, indici di redditività, qualità dei flussi di cassa, multipli di valutazione, confronto con i competitor, segnali di allarme e spiegazione in linguaggio semplice generata dall\'AI.',
    'product.fa.action': 'Apri Strumento',

    // Fundamental Analysis page
    'fa.search.placeholder': 'Cerca un\'azione o ETF USA...',
    'fa.search.empty': 'Nessun risultato trovato.',
    'fa.search.loading': 'Ricerca in corso...',
    'fa.noSymbol': 'Cerca un titolo sopra per avviare l\'analisi fondamentale.',
    'fa.loading': 'Recupero bilanci, calcolo metriche e generazione spiegazione AI in corso…',
    'fa.error': 'Impossibile caricare i dati fondamentali. Il titolo potrebbe avere dati finanziari insufficienti.',

    // Section titles
    'fa.section.scores': 'Stato Fondamentale',
    'fa.section.growth': 'Crescita',
    'fa.section.profitability': 'Redditività',
    'fa.section.cashflow': 'Generazione di Cassa e Qualità degli Utili',
    'fa.section.strength': 'Solidità Finanziaria',
    'fa.section.efficiency': 'Efficienza del Capitale',
    'fa.section.valuation': 'Valutazione',
    'fa.section.peers': 'Confronto con i Competitor',
    'fa.section.historical': 'Dati Storici',
    'fa.section.flags': 'Rischi e Segnali d\'Allarme',
    'fa.section.strengths': 'Punti di Forza',
    'fa.section.explanation': 'Analisi AI',

    // Score labels
    'fa.score.very_strong': 'Molto forte',
    'fa.score.strong': 'Forte',
    'fa.score.neutral': 'Neutrale',
    'fa.score.weak': 'Debole',
    'fa.score.very_weak': 'Molto debole',
    'fa.score.overall': 'Punteggio complessivo',

    // Dimensions
    'fa.dim.growth': 'Crescita',
    'fa.dim.profitability': 'Redditività',
    'fa.dim.cashFlow': 'Generazione di Cassa',
    'fa.dim.financialStrength': 'Solidità Finanziaria',
    'fa.dim.capitalEfficiency': 'Efficienza del Capitale',
    'fa.dim.valuation': 'Valutazione',

    // Table columns
    'fa.col.metric': 'Metrica',
    'fa.col.value': 'Valore (TTM)',
    'fa.col.peerMedian': 'Mediana Peer',
    'fa.col.trend': 'Trend',
    'fa.col.vsPeers': 'vs Peer',
    'fa.col.vsHistory': 'vs Storia (3A)',
    'fa.col.peerPct': 'Percentile',
    'fa.col.current': 'Attuale',

    // Metric labels
    'fa.metric.revenueTtm': 'Ricavi TTM',
    'fa.metric.revenueYoy': 'Crescita Ricavi YoY',
    'fa.metric.revenue3yCagr': 'CAGR Ricavi 3 anni',
    'fa.metric.revenue5yCagr': 'CAGR Ricavi 5 anni',
    'fa.metric.revenueQoQ': 'Ricavi QoQ',
    'fa.metric.revenueYoYQ': 'Ricavi YoY (ultimo trim.)',
    'fa.metric.epsTtm': 'EPS Diluito TTM',
    'fa.metric.epsYoy': 'Crescita EPS YoY',
    'fa.metric.eps3yCagr': 'CAGR EPS 3 anni',
    'fa.metric.opIncYoy': 'Crescita Reddito Operativo',
    'fa.metric.netIncYoy': 'Crescita Utile Netto',
    'fa.metric.ocfYoy': 'Crescita Cash Flow Operativo',
    'fa.metric.fcfYoy': 'Crescita Free Cash Flow',
    'fa.metric.fcf3yCagr': 'CAGR FCF 3 anni',
    'fa.metric.grossMargin': 'Margine Lordo',
    'fa.metric.opMargin': 'Margine Operativo',
    'fa.metric.ebitdaMargin': 'Margine EBITDA',
    'fa.metric.netMargin': 'Margine Netto',
    'fa.metric.fcfMargin': 'Margine FCF',
    'fa.metric.roa': 'Rendimento delle Attività (ROA)',
    'fa.metric.roe': 'Rendimento del P.N. (ROE)',
    'fa.metric.roic': 'Rendimento sul Capitale Investito (ROIC)',
    'fa.metric.ocfTtm': 'Cash Flow Operativo',
    'fa.metric.capex': 'Investimenti in Conto Capitale (Capex)',
    'fa.metric.fcfTtm': 'Free Cash Flow',
    'fa.metric.fcfPerShare': 'FCF per Azione',
    'fa.metric.cashConversion': 'Cash Conversion Ratio (OCF/Utile)',
    'fa.metric.sbcRev': 'SBC / Ricavi',
    'fa.metric.earningsQuality': 'Qualità degli Utili',
    'fa.metric.cash': 'Disponibilità Liquide',
    'fa.metric.totalDebt': 'Debito Totale',
    'fa.metric.netDebt': 'Debito Netto',
    'fa.metric.de': 'Debito / Patrimonio Netto',
    'fa.metric.da': 'Debito / Attività Totali',
    'fa.metric.ndEbitda': 'Debito Netto / EBITDA',
    'fa.metric.currentRatio': 'Current Ratio',
    'fa.metric.quickRatio': 'Quick Ratio',
    'fa.metric.intCoverage': 'Copertura degli Interessi',
    'fa.metric.goodwillAssets': 'Goodwill / Attività Totali',
    'fa.metric.assetTurnover': 'Asset Turnover',
    'fa.metric.dso': 'Giorni Crediti (DSO)',
    'fa.metric.dio': 'Giorni Magazzino (DIO)',
    'fa.metric.dpo': 'Giorni Debiti (DPO)',
    'fa.metric.ccc': 'Ciclo Finanziario (CCC)',
    'fa.metric.pe': 'P/E',
    'fa.metric.forwardPe': 'P/E Atteso',
    'fa.metric.ps': 'Prezzo / Ricavi',
    'fa.metric.pb': 'Prezzo / Patrimonio Netto',
    'fa.metric.pFcf': 'Prezzo / FCF',
    'fa.metric.evRev': 'EV / Ricavi',
    'fa.metric.evEbitda': 'EV / EBITDA',
    'fa.metric.evEbit': 'EV / EBIT',
    'fa.metric.divYield': 'Dividend Yield',
    'fa.metric.buybackYield': 'Buyback Yield',
    'fa.metric.dilution1y': 'Diluizione Azionaria (1 anno)',
    'fa.metric.dilution3y': 'Diluizione Azionaria (CAGR 3 anni)',

    // Earnings quality labels
    'fa.eq.high': 'Alta',
    'fa.eq.adequate': 'Adeguata',
    'fa.eq.weak': 'Debole',
    'fa.eq.very_weak': 'Molto debole',

    // Trend labels
    'fa.trend.improving': 'In miglioramento',
    'fa.trend.declining': 'In declino',
    'fa.trend.stable': 'Stabile',

    // Peer table columns
    'fa.peers.symbol': 'Ticker',
    'fa.peers.mktCap': 'Cap. Mercato',
    'fa.peers.revGrowth': 'Crescita Ricavi',
    'fa.peers.grossMargin': 'Margine Lordo',
    'fa.peers.opMargin': 'Margine Op.',
    'fa.peers.roic': 'ROIC',
    'fa.peers.pe': 'P/E',
    'fa.peers.evEbitda': 'EV/EBITDA',
    'fa.peers.evSales': 'EV/Ricavi',
    'fa.peers.noPeers': 'Nessun dato disponibile sui competitor.',

    // Historical chart labels
    'fa.hist.revenue': 'Ricavi',
    'fa.hist.opIncome': 'Reddito Operativo',
    'fa.hist.netIncome': 'Utile Netto',
    'fa.hist.eps': 'EPS Diluito',
    'fa.hist.ocf': 'Cash Flow Operativo',
    'fa.hist.fcf': 'Free Cash Flow',
    'fa.hist.margins': 'Margini',
    'fa.hist.netDebt': 'Debito Netto',
    'fa.hist.shares': 'Azioni in Circolazione',

    // Red flags severity
    'fa.flag.high': 'Alto',
    'fa.flag.medium': 'Medio',
    'fa.flag.low': 'Basso',
    'fa.flags.none': 'Nessun segnale di rischio significativo rilevato.',
    'fa.strengths.none': 'Nessun punto di forza significativo rilevato dai dati disponibili.',

    // Valuation matrix
    'fa.matrix.title': 'Matrice Qualità / Valutazione',
    'fa.matrix.quality': 'Qualità Fondamentale',
    'fa.matrix.valuation': 'Valutazione Relativa',
    'fa.matrix.cheap': 'Economica vs Peer',
    'fa.matrix.expensive': 'Costosa vs Peer',
    'fa.matrix.strong': 'Fondamentali Forti',
    'fa.matrix.weak': 'Fondamentali Deboli',

    // AI explanation panel
    'fa.explain.summary': 'Riepilogo',
    'fa.explain.growth': 'Crescita',
    'fa.explain.profitability': 'Redditività',
    'fa.explain.cashflow': 'Flussi di Cassa',
    'fa.explain.balance': 'Stato Patrimoniale',
    'fa.explain.valuation': 'Valutazione',
    'fa.explain.peers': 'Peer Group',
    'fa.explain.strengths': 'Punti di Forza',
    'fa.explain.risks': 'Rischi',
    'fa.explain.conclusion': 'Conclusione',

    // Coverage / confidence
    'fa.coverage': 'Copertura dei dati',
    'fa.confidence.high': 'Alta affidabilità',
    'fa.confidence.medium': 'Media affidabilità',
    'fa.confidence.low': 'Bassa affidabilità',

    // Misc
    'fa.netCash': 'Posizione netta di cassa',
    'fa.nm': 'N/S',
    'fa.na': 'N/D',
    'fa.ttm': 'TTM',
    'fa.lastFiling': 'Ultimo filing',
    'fa.fiscalYearEnd': 'Fine anno fiscale',
    'fa.disclaimer': 'Questa analisi ha finalità esclusivamente informative ed educative e non costituisce consulenza finanziaria, fiscale o legale. I dati possono contenere errori, ritardi o omissioni. Le stime di fair value dipendono dalle ipotesi utilizzate e non rappresentano una previsione certa del prezzo futuro.',
    'fa.roe.warning.negative_equity': 'Attenzione: ROE calcolato con patrimonio netto negativo — non significativo come indicatore di qualità.',
    'fa.roe.warning.high_leverage': 'Nota: ROE elevato parzialmente trainato dalla leva finanziaria.',
  }
};

type I18nContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    const saved = localStorage.getItem('ripple_language');
    if (saved === 'en' || saved === 'it') {
      setLanguageState(saved);
    } else {
      const browserLang = navigator.language.startsWith('it') ? 'it' : 'en';
      setLanguageState(browserLang);
      localStorage.setItem('ripple_language', browserLang);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('ripple_language', lang);
  };

  const t = (key: string): string => {
    return dict[language][key] || key;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useTranslation must be used within an I18nProvider');
  return context;
}
