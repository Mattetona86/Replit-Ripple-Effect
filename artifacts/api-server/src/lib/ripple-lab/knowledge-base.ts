/**
 * Static knowledge base: seed companies and their relationships.
 * 15 core companies across AI infrastructure, semiconductors, and energy themes.
 * All relationships are classified with an evidence basis to enforce reliability rules.
 */

export interface CompanyProfile {
  ticker: string;
  name: string;
  sector: string;
  primaryThemes: string[];
  keyFacts: string[];
}

export interface KnownRelationship {
  source: string;
  target: string;
  type: string;
  description: string;
  confidence: 'confirmed' | 'strongly_supported' | 'plausible';
  evidenceBasis: string;
  themes: string[];
}

export const THEMES = [
  'AI infrastructure', 'semiconductors', 'data centers', 'power grid',
  'nuclear energy', 'defense', 'drones', 'robotics', 'cybersecurity',
  'rare earths', 'quantum computing',
];

export const COMPANY_PROFILES: CompanyProfile[] = [
  {
    ticker: 'NVDA',
    name: 'NVIDIA Corporation',
    sector: 'Technology / Semiconductors',
    primaryThemes: ['AI infrastructure', 'semiconductors', 'data centers', 'robotics'],
    keyFacts: [
      'Designs AI accelerators (H100, H200, Blackwell B200); data center is 70%+ of revenue',
      'Fabless — TSMC manufactures all chips on 4nm/3nm nodes',
      'CUDA ecosystem creates strong developer moat; HBM memory from SK Hynix & Micron is critical supply',
      'NVLink and InfiniBand networking for GPU clusters',
    ],
  },
  {
    ticker: 'MSFT',
    name: 'Microsoft Corporation',
    sector: 'Technology / Cloud',
    primaryThemes: ['AI infrastructure', 'data centers', 'cybersecurity'],
    keyFacts: [
      'Azure is the #2 hyperscaler and a top NVIDIA GPU buyer',
      'OpenAI exclusive commercial licensing partner; Copilot AI across Office 365',
      'Committing $80B+ in FY2025 to AI data center capex',
    ],
  },
  {
    ticker: 'AMZN',
    name: 'Amazon.com Inc.',
    sector: 'Technology / Cloud',
    primaryThemes: ['AI infrastructure', 'data centers'],
    keyFacts: [
      'AWS is the largest cloud provider; major NVIDIA GPU customer',
      'Custom Trainium and Inferentia AI chips for internal workloads',
      'Significant capex expansion for AI infrastructure',
    ],
  },
  {
    ticker: 'GOOGL',
    name: 'Alphabet Inc.',
    sector: 'Technology / Cloud',
    primaryThemes: ['AI infrastructure', 'data centers', 'quantum computing'],
    keyFacts: [
      'Google Cloud hyperscaler; major NVIDIA GPU buyer',
      'Custom TPU (Tensor Processing Unit) chips for AI workloads',
      'Gemini AI models; DeepMind research division',
    ],
  },
  {
    ticker: 'META',
    name: 'Meta Platforms Inc.',
    sector: 'Technology / Social Media',
    primaryThemes: ['AI infrastructure', 'data centers'],
    keyFacts: [
      'One of the largest NVIDIA GPU buyers globally; "hundreds of thousands of H100s"',
      'LLaMA open-source AI models; MTIA custom inference chip',
      'AI infrastructure capex $60B+ announced for 2025',
    ],
  },
  {
    ticker: 'TSM',
    name: 'Taiwan Semiconductor Manufacturing',
    sector: 'Technology / Semiconductor Manufacturing',
    primaryThemes: ['semiconductors', 'AI infrastructure'],
    keyFacts: [
      'World\'s leading contract chip manufacturer; makes NVIDIA GPUs on 4nm/3nm',
      'CoWoS advanced packaging integrates HBM with GPU die — supply is gating AI chip production',
      'Manufactures AMD, Apple, Qualcomm, Broadcom chips; geopolitical risk: Taiwan Strait',
    ],
  },
  {
    ticker: 'MU',
    name: 'Micron Technology',
    sector: 'Technology / Memory Semiconductors',
    primaryThemes: ['semiconductors', 'AI infrastructure'],
    keyFacts: [
      'Manufactures HBM3E — high-bandwidth memory critical for AI GPUs',
      'DRAM and NAND flash leader; NVIDIA, AMD, and hyperscalers are key HBM customers',
      'HBM is the highest-margin segment with AI-driven demand surge',
    ],
  },
  {
    ticker: 'AVGO',
    name: 'Broadcom Inc.',
    sector: 'Technology / Semiconductors',
    primaryThemes: ['semiconductors', 'AI infrastructure', 'data centers'],
    keyFacts: [
      'Custom ASIC chips for hyperscaler AI inference (Google TPU, Meta MTIA-adjacent work)',
      'Networking semiconductors: Tomahawk and Jericho switches in AI data centers',
      'VMware acquisition expanded software business',
    ],
  },
  {
    ticker: 'ANET',
    name: 'Arista Networks',
    sector: 'Technology / Networking',
    primaryThemes: ['data centers', 'AI infrastructure'],
    keyFacts: [
      'Ethernet switches for AI data center back-end networking',
      'Key customers: Microsoft, Meta, Google; Ultra-Ethernet Consortium member',
      'Ethernet challenging InfiniBand for AI cluster networking',
    ],
  },
  {
    ticker: 'VRT',
    name: 'Vertiv Holdings',
    sector: 'Industrials / Data Center Infrastructure',
    primaryThemes: ['data centers', 'power grid', 'AI infrastructure'],
    keyFacts: [
      'Liquid cooling systems and power management (UPS, PDUs) for AI data centers',
      'Direct liquid cooling (DLC) essential for high-TDP AI GPUs',
      'Core beneficiary of AI-driven data center power density surge',
    ],
  },
  {
    ticker: 'ETN',
    name: 'Eaton Corporation',
    sector: 'Industrials / Power Management',
    primaryThemes: ['power grid', 'data centers'],
    keyFacts: [
      'Electrical equipment: switchgear, PDUs, UPS for data centers and grid',
      'Key supplier for data center power infrastructure and grid electrification',
    ],
  },
  {
    ticker: 'GEV',
    name: 'GE Vernova',
    sector: 'Industrials / Power Generation',
    primaryThemes: ['power grid', 'nuclear energy'],
    keyFacts: [
      'Gas turbines, wind power, and grid transmission equipment',
      'AI data center power demand drives new utility investment cycles',
      'Grid modernization and power generation infrastructure play',
    ],
  },
  {
    ticker: 'ASML',
    name: 'ASML Holding',
    sector: 'Technology / Semiconductor Equipment',
    primaryThemes: ['semiconductors'],
    keyFacts: [
      'Monopoly supplier of EUV lithography machines; enables TSMC, Samsung advanced nodes',
      'High-NA EUV for next-generation 2nm and below nodes',
      'Export controls restrict EUV and DUV sales to China',
    ],
  },
  {
    ticker: 'AMD',
    name: 'Advanced Micro Devices',
    sector: 'Technology / Semiconductors',
    primaryThemes: ['semiconductors', 'AI infrastructure', 'data centers'],
    keyFacts: [
      'MI300X AI GPU competes with NVIDIA H100/H200 in training and inference',
      'EPYC server CPUs for data centers; fabless — manufactured by TSMC',
      'Gaining hyperscaler AI accelerator market share',
    ],
  },
  {
    ticker: 'SMCI',
    name: 'Super Micro Computer',
    sector: 'Technology / Server Hardware',
    primaryThemes: ['AI infrastructure', 'data centers', 'semiconductors'],
    keyFacts: [
      'AI GPU server systems integrating NVIDIA Blackwell and AMD GPUs',
      'Direct liquid cooling (DLC) server manufacturer; close NVIDIA partner',
      'Accounting irregularities and audit delays posed risk in 2024-2025',
    ],
  },
];

export const KNOWN_RELATIONSHIPS: KnownRelationship[] = [
  // NVIDIA supply chain
  { source: 'NVDA', target: 'TSM', type: 'manufacturing_partner', description: 'TSMC manufactures all NVIDIA GPUs on advanced nodes (4nm/3nm)', confidence: 'confirmed', evidenceBasis: 'NVIDIA investor presentations, TSMC customer disclosures', themes: ['AI infrastructure', 'semiconductors'] },
  { source: 'NVDA', target: 'MU', type: 'supplier', description: 'Micron supplies HBM3E memory integrated into NVIDIA AI GPUs', confidence: 'confirmed', evidenceBasis: 'Micron earnings calls, NVIDIA product specifications', themes: ['semiconductors', 'AI infrastructure'] },
  { source: 'NVDA', target: 'AVGO', type: 'technology_partner', description: 'Broadcom networking chips (InfiniBand, Ethernet) used in NVIDIA GPU clusters', confidence: 'confirmed', evidenceBasis: 'Industry documentation and partner announcements', themes: ['data centers', 'AI infrastructure'] },
  { source: 'NVDA', target: 'ANET', type: 'technology_partner', description: 'Arista Ethernet switches deployed in AI data center back-end networking alongside NVIDIA GPUs', confidence: 'strongly_supported', evidenceBasis: 'Arista customer references, industry analysis', themes: ['data centers', 'AI infrastructure'] },
  { source: 'NVDA', target: 'SMCI', type: 'technology_partner', description: 'Super Micro integrates NVIDIA GPUs into AI server systems', confidence: 'confirmed', evidenceBasis: 'SMCI investor materials, NVIDIA partner ecosystem disclosures', themes: ['AI infrastructure', 'data centers'] },
  { source: 'NVDA', target: 'VRT', type: 'infrastructure_provider', description: 'Vertiv liquid cooling and power systems deployed in NVIDIA GPU data centers', confidence: 'strongly_supported', evidenceBasis: 'Vertiv investor presentations, data center industry standards', themes: ['data centers', 'power grid'] },
  { source: 'NVDA', target: 'AMD', type: 'competitor', description: 'AMD MI300X directly competes with NVIDIA H100/H200 in AI accelerator market', confidence: 'confirmed', evidenceBasis: 'Public product launches and hyperscaler customer announcements', themes: ['semiconductors', 'AI infrastructure'] },
  // Hyperscalers as NVIDIA customers
  { source: 'MSFT', target: 'NVDA', type: 'customer', description: 'Microsoft Azure is among the largest buyers of NVIDIA H100/H200 GPUs', confidence: 'confirmed', evidenceBasis: 'Microsoft earnings calls, Azure AI product catalog', themes: ['AI infrastructure', 'data centers'] },
  { source: 'AMZN', target: 'NVDA', type: 'customer', description: 'AWS purchases NVIDIA GPUs for cloud AI instances (p4, p5 instances)', confidence: 'confirmed', evidenceBasis: 'AWS product catalog, Amazon earnings commentary', themes: ['AI infrastructure', 'data centers'] },
  { source: 'GOOGL', target: 'NVDA', type: 'customer', description: 'Google Cloud purchases NVIDIA GPUs alongside its custom TPUs', confidence: 'confirmed', evidenceBasis: 'Google Cloud product announcements', themes: ['AI infrastructure', 'data centers'] },
  { source: 'META', target: 'NVDA', type: 'customer', description: 'Meta is among the largest NVIDIA GPU buyers for AI research and inference', confidence: 'confirmed', evidenceBasis: 'Meta earnings calls: "hundreds of thousands of H100s"', themes: ['AI infrastructure', 'data centers'] },
  // TSMC relationships
  { source: 'TSM', target: 'ASML', type: 'supplier', description: 'ASML EUV and high-NA EUV machines are essential for TSMC advanced node manufacturing', confidence: 'confirmed', evidenceBasis: 'TSMC and ASML public filings and technology roadmaps', themes: ['semiconductors'] },
  { source: 'AMD', target: 'TSM', type: 'manufacturing_partner', description: 'TSMC manufactures AMD EPYC CPUs and MI300X AI GPUs', confidence: 'confirmed', evidenceBasis: 'AMD investor day, TSMC customer disclosures', themes: ['semiconductors', 'AI infrastructure'] },
  // Power and infrastructure
  { source: 'MSFT', target: 'VRT', type: 'customer', description: 'Microsoft data centers use Vertiv power and cooling infrastructure', confidence: 'strongly_supported', evidenceBasis: 'Vertiv customer base disclosures, industry standards', themes: ['data centers', 'power grid'] },
  { source: 'VRT', target: 'ETN', type: 'competitor', description: 'Eaton competes with Vertiv in data center power management (UPS, switchgear)', confidence: 'confirmed', evidenceBasis: 'Market segmentation, overlapping product lines', themes: ['power grid', 'data centers'] },
  { source: 'GEV', target: 'MSFT', type: 'customer', description: 'GE Vernova grid and generation equipment supports data center power infrastructure for hyperscalers', confidence: 'plausible', evidenceBasis: 'Data center power infrastructure analysis and utility investment cycles', themes: ['power grid', 'data centers'] },
  // Broadcom custom AI ASIC
  { source: 'AVGO', target: 'GOOGL', type: 'customer', description: 'Google is Broadcom\'s key custom AI ASIC (TPU) partner', confidence: 'confirmed', evidenceBasis: 'Broadcom earnings calls, Google TPU chip partnership disclosures', themes: ['AI infrastructure', 'semiconductors'] },
];

export function getCompanyByTicker(ticker: string): CompanyProfile | undefined {
  return COMPANY_PROFILES.find(c => c.ticker.toUpperCase() === ticker.toUpperCase());
}

export function getRelationshipsForTickers(tickers: string[]): KnownRelationship[] {
  const tickerSet = new Set(tickers.map(t => t.toUpperCase()));
  return KNOWN_RELATIONSHIPS.filter(
    r => tickerSet.has(r.source.toUpperCase()) || tickerSet.has(r.target.toUpperCase()),
  );
}

export function formatKnowledgeBaseForLLM(): string {
  const companyList = COMPANY_PROFILES.map(
    c => `${c.ticker} (${c.name}): themes=[${c.primaryThemes.join(', ')}] | ${c.keyFacts.slice(0, 2).join('; ')}`,
  ).join('\n');

  const relList = KNOWN_RELATIONSHIPS.map(
    r => `${r.source}→${r.target} [${r.type}, ${r.confidence}]: ${r.description}`,
  ).join('\n');

  return `=== SEED COMPANIES ===\n${companyList}\n\n=== KNOWN RELATIONSHIPS ===\n${relList}`;
}
