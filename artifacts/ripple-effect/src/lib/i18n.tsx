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
