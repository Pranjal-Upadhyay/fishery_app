'use client';

import { useState } from 'react';
import {
  ScrollText,
  CheckCircle,
  Clock,
  UserCheck,
  CreditCard,
  ChevronDown,
  ChevronUp,
  Info,
  FileText,
  BookOpen,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SubsidyByCategory {
  general: number;
  ebc: number;
  sc: number;
  st: number;
}

interface SchemeCatalogItem {
  id: string;
  code: string;
  nameEn: string;
  nameHi: string;
  tagline: string;
  subsidyByCategory: SubsidyByCategory;
  unitCostCapLakh: number;
  maxSubsidyLakh: number;
  eligibility: string[];
  requiredDocuments: string[];
  geofence: string;
  classification: string;
  applicationSteps: string[];
  accentColor: 'teal' | 'sky' | 'amber' | 'violet';
}

// ─── Static Data ──────────────────────────────────────────────────────────────

const SCHEME_CATALOG: SchemeCatalogItem[] = [
  {
    id: '1',
    code: 'PMMSY',
    nameEn: 'Pradhan Mantri Matsya Sampada Yojana',
    nameHi: 'प्रधान मंत्री मत्स्य संपदा योजना',
    tagline: 'National Flagship Fisheries Development Scheme',
    subsidyByCategory: { general: 40, ebc: 60, sc: 60, st: 60 },
    unitCostCapLakh: 25.00,
    maxSubsidyLakh: 15.00,
    eligibility: [
      'All fishers, fish farmers, SHGs, JLGs, and cooperatives',
      'Aadhaar-linked bank account is mandatory',
      'Land ownership or lease agreement (minimum 7 years)',
      'Must not have availed same scheme in previous 5 years',
      'Women beneficiaries get additional 10% priority access',
    ],
    requiredDocuments: [
      'Aadhaar Card (self)',
      'Land deed or lease agreement',
      'Bank passbook (front page, Aadhaar-seeded)',
      'Geo-tagged pond photographs (minimum 4)',
      'Caste certificate (if applicable)',
      'Income certificate',
    ],
    geofence: 'All 38 Bihar Districts (National Scheme)',
    classification: 'Capital Infrastructure',
    applicationSteps: [
      'Open MatsyaMitra app → Apply for Scheme',
      'Select your eligible pond and choose PMMSY scheme',
      'Upload all required documents via the in-app scanner',
      'Block officer reviews documents and verifies GPS match',
      'Application escalated to District Level Committee (DLC)',
      'DLC formally approves and confirms subsidy amount',
      'First instalment released after construction/setup photo proof',
      'Final instalment released after operational verification photo',
    ],
    accentColor: 'teal',
  },
  {
    id: '2',
    code: 'TMVSY',
    nameEn: 'Talab Matsyiki Vishesh Sahayata Yojana',
    nameHi: 'तालाब मात्स्यिकी विशेष सहायता योजना',
    tagline: 'Special Pond Renovation & Construction Assistance',
    subsidyByCategory: { general: 50, ebc: 70, sc: 70, st: 70 },
    unitCostCapLakh: 10.10,
    maxSubsidyLakh: 7.07,
    eligibility: [
      'SC, ST and EBC categories receive maximum 70% subsidy',
      'General category receives 50% subsidy',
      'Minimum 0.2 hectare pond area required',
      'Leased land must have agreement of minimum 9 years',
      'Fisheries training certificate preferred (not mandatory)',
    ],
    requiredDocuments: [
      'Aadhaar Card (self and family head)',
      'Caste Certificate (mandatory for SC / ST / EBC)',
      'Land ownership deed or lease agreement',
      'Bank passbook (Aadhaar-seeded account)',
      'Geo-tagged pond location photographs',
      'Passport photographs (2 copies)',
    ],
    geofence: 'All 38 Bihar Districts',
    classification: 'Pond Infrastructure',
    applicationSteps: [
      'Open MatsyaMitra → Apply for Scheme',
      'Select TMVSY and choose the eligible pond',
      'Upload caste certificate, land deed, and bank proof',
      'Block-level officer inspects GPS match and documents',
      'File escalated to DLC for formal committee approval',
      'Subsidy disbursed in 2 instalments via Direct Bank Transfer',
    ],
    accentColor: 'sky',
  },
  {
    id: '3',
    code: 'JKSY',
    nameEn: 'Jalkrishi Saurikaran Yojana',
    nameHi: 'जलकृषि सौरीकरण योजना',
    tagline: 'Solar-Powered Pump & Aeration Infrastructure',
    subsidyByCategory: { general: 80, ebc: 80, sc: 80, st: 80 },
    unitCostCapLakh: 5.42,
    maxSubsidyLakh: 4.34,
    eligibility: [
      'All caste categories equally eligible (uniform 80% subsidy)',
      'Land lease agreement of minimum 9 years required',
      'Existing operational fish or shrimp pond is mandatory',
      'North Bihar applicants: 5 HP solar pump eligible',
      'South Bihar applicants: 7.5 HP solar pump eligible',
    ],
    requiredDocuments: [
      'Aadhaar Card',
      'Land lease agreement (minimum 9 years)',
      'Proof of operational pond (photograph)',
      'Bank passbook',
      'Electricity bill or current power source proof',
    ],
    geofence: 'North Bihar (5 HP) | South Bihar (7.5 HP)',
    classification: 'Solar Infrastructure',
    applicationSteps: [
      'Apply via MatsyaMitra mobile app',
      'Upload lease agreement and current pond proof',
      'Officer verifies pond is operational and GPS matches district',
      'DLC approves with district-specific pump horsepower noted',
      'Full 80% subsidy released after solar pump installation photo',
    ],
    accentColor: 'amber',
  },
  {
    id: '4',
    code: 'MPVY',
    nameEn: 'Matsya Prajati Vividhikaran Yojana',
    nameHi: 'मत्स्य प्रजाति का विविधीकरण योजना',
    tagline: 'Species Diversification & Hatchery Development',
    subsidyByCategory: { general: 60, ebc: 60, sc: 60, st: 60 },
    unitCostCapLakh: 13.12,
    maxSubsidyLakh: 7.87,
    eligibility: [
      'Prior aquaculture training certificate from fisheries dept.',
      'Minimum 0.5 hectare water body required',
      'Land lease agreement of minimum 9 years',
      'Minimum 2 years of documented fish farming experience',
      'Active fish farming with existing crop cycle records',
    ],
    requiredDocuments: [
      'Aadhaar Card',
      'Aquaculture training certificate',
      'Land ownership deed or lease agreement',
      'Bank passbook',
      'Existing crop cycle records (from MatsyaMitra or manual)',
      'Species diversification plan (can be submitted within 30 days)',
    ],
    geofence: 'Designated hatchery districts only (check with block officer)',
    classification: 'Hatchery & Diversification',
    applicationSteps: [
      'Obtain training certificate from State Fisheries department',
      'Apply via MatsyaMitra with training certificate uploaded',
      'Block officer verifies experience and pond eligibility',
      'DLC reviews species diversification plan',
      'Milestone 1 released after hatchery infrastructure setup',
      'Milestone 2 released after first diversified crop cycle harvested',
    ],
    accentColor: 'violet',
  },
];

const STAGE_GUIDE = [
  {
    key: 'AWAITING_REVIEW',
    label: 'Awaiting Review',
    colorClass: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    dotColor: 'bg-amber-400',
    Icon: Clock,
    description: 'Application submitted by farmer. Block officer has not yet reviewed the documents or GPS location.',
    officerNote: 'Your task: Verify all uploaded documents and GPS coordinates. Then send to DLC Queue or reject with reason.',
  },
  {
    key: 'DLC_QUEUE',
    label: 'DLC Queue',
    colorClass: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
    dotColor: 'bg-sky-400',
    Icon: UserCheck,
    description: 'Documents verified by block officer. Now waiting for the District Level Committee to formally approve.',
    officerNote: 'Present to DLC meeting. Committee reviews subsidy amount and either approves or rejects the application.',
  },
  {
    key: 'APPROVED',
    label: 'DLC Approved',
    colorClass: 'text-violet-400 bg-violet-500/10 border-violet-500/30',
    dotColor: 'bg-violet-400',
    Icon: ShieldCheck,
    description: 'DLC has formally approved the application. Subsidy amount is confirmed. Farmer can begin work.',
    officerNote: 'Wait for farmer to complete Milestone 1 (construction / installation). Verify the geo-tagged proof photo.',
  },
  {
    key: 'MILESTONE_1_MET',
    label: 'Milestone 1 Met',
    colorClass: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
    dotColor: 'bg-rose-400',
    Icon: CreditCard,
    description: 'First instalment of subsidy (typically 50%) released after farmer submitted geo-tagged proof photograph.',
    officerNote: 'Monitor remaining construction / operation. Verify Milestone 2 when farmer submits final completion proof.',
  },
  {
    key: 'MILESTONE_2_MET',
    label: 'Completed',
    colorClass: 'text-teal-400 bg-teal-500/10 border-teal-500/30',
    dotColor: 'bg-teal-400',
    Icon: CheckCircle,
    description: 'All milestones verified. Full subsidy disbursed via Direct Bank Transfer (DBT). Case is now closed.',
    officerNote: 'No further action required. Application is archived for state audit records.',
  },
];

const GLOSSARY = [
  {
    term: 'DLC',
    full: 'District Level Committee',
    desc: 'A formal government committee of district officials. Their approval is mandatory before any subsidy money can be transferred to a farmer.',
  },
  {
    term: 'DBT',
    full: 'Direct Bank Transfer',
    desc: 'Subsidy money sent directly into the farmer\'s Aadhaar-linked bank account by the government — no cash, no intermediaries.',
  },
  {
    term: 'GPS Passed',
    full: 'Geofence Validation',
    desc: 'Automatic system check verifying the pond\'s GPS coordinates fall within the eligible district boundary for the scheme applied.',
  },
  {
    term: 'Doc Verified',
    full: 'Document Verified',
    desc: 'Block officer has manually reviewed the uploaded document and confirmed it is genuine, complete, and matches the farmer profile.',
  },
  {
    term: 'Milestone',
    full: 'Disbursement Milestone',
    desc: 'Proof of physical work completed (e.g. pond excavated, pump installed) required before each subsidy instalment is released by the government.',
  },
];

const ACCENT: Record<string, { border: string; bg: string; text: string; ring: string }> = {
  teal:   { border: 'border-teal-500/50',   bg: 'bg-teal-500/10',   text: 'text-teal-400',   ring: 'ring-1 ring-teal-500/50' },
  sky:    { border: 'border-sky-500/50',    bg: 'bg-sky-500/10',    text: 'text-sky-400',    ring: 'ring-1 ring-sky-500/50' },
  amber:  { border: 'border-amber-500/50',  bg: 'bg-amber-500/10',  text: 'text-amber-400',  ring: 'ring-1 ring-amber-500/50' },
  violet: { border: 'border-violet-400/50', bg: 'bg-violet-500/8',  text: 'text-violet-400', ring: 'ring-1 ring-violet-400/50' },
};

function SectionDivider({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-3 pb-1">
      <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="h-4 w-4 text-teal-400" />
      </div>
      <div>
        <h2 className="text-base font-bold text-ink-primary">{title}</h2>
        <p className="text-xs text-ink-muted mt-0.5 max-w-xl">{subtitle}</p>
      </div>
    </div>
  );
}

export default function SchemesPage() {
  const [selectedScheme, setSelectedScheme] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-16 p-6 pb-24 max-w-5xl mx-auto w-full">

      {/* ── Page Header ── */}
      <div className="pt-2">
        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-teal-400 mb-2">
          Government Allocations
        </div>
        <h1 className="text-3xl font-bold text-ink-primary">Aquaculture Schemes & Yojanas</h1>
        <p className="text-sm text-ink-secondary mt-2 max-w-2xl leading-relaxed">
          Browse active subsidy schemes, eligibility requirements, and payout structures. 
          Use the navigation menu to review submitted applications.
        </p>
      </div>

      {/* ════════════════════════════════════════════════════════════
          SECTION 1 — SCHEME CATALOG
      ════════════════════════════════════════════════════════════ */}
      <section className="flex flex-col gap-5">
        <SectionDivider
          icon={ScrollText}
          title="Government Scheme Directory"
          subtitle="All active aquaculture subsidy schemes. Click a scheme to view full eligibility rules, subsidy breakdown, and how to apply."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {SCHEME_CATALOG.map(scheme => {
            const a = ACCENT[scheme.accentColor];
            const isOpen = selectedScheme === scheme.id;
            const maxSubsidy = Math.max(...Object.values(scheme.subsidyByCategory));
            return (
              <button
                key={scheme.id}
                onClick={() => setSelectedScheme(isOpen ? null : scheme.id)}
                className={`text-left p-5 rounded-2xl border transition-all duration-300 ${
                  isOpen
                    ? `${a.border} ${a.bg} ${a.ring} shadow-tileSelected scale-[1.02]`
                    : 'border-glass-border/60 bg-canvas-900/60 shadow-tile hover:shadow-tileHover hover:border-glass-border hover:-translate-y-0.5'
                }`}
              >
                <div className={`text-[10px] font-mono font-bold tracking-widest mb-2.5 ${a.text}`}>
                  {scheme.code}
                </div>
                <div className="text-sm font-bold text-ink-primary leading-snug mb-1">
                  {scheme.nameEn}
                </div>
                <div className="text-[10px] text-ink-muted mb-4 line-clamp-1">{scheme.nameHi}</div>

                <div className="space-y-2 text-xs border-t border-glass-border/30 pt-4">
                  <div className="flex justify-between">
                    <span className="text-ink-muted">Max subsidy</span>
                    <span className={`font-bold font-mono ${a.text}`}>{maxSubsidy}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-muted">Unit cost cap</span>
                    <span className="font-mono text-ink-secondary">₹{scheme.unitCostCapLakh}L</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-muted">Max subsidy amt</span>
                    <span className={`font-mono font-bold ${a.text}`}>₹{scheme.maxSubsidyLakh}L</span>
                  </div>
                </div>

                <div className={`mt-4 flex items-center justify-between text-[10px] font-semibold ${a.text}`}>
                  <span className={`px-2 py-0.5 rounded-full ${a.bg} border ${a.border} text-[9px]`}>
                    {scheme.classification}
                  </span>
                  {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Expanded Scheme Detail ── */}
        {selectedScheme && (() => {
          const scheme = SCHEME_CATALOG.find(s => s.id === selectedScheme)!;
          const a = ACCENT[scheme.accentColor];
          const maxSubsidyPct = Math.max(...Object.values(scheme.subsidyByCategory));
          const farmerSharePct = 100 - maxSubsidyPct;
          const farmerShareLakh = ((farmerSharePct / 100) * scheme.unitCostCapLakh).toFixed(2);
          return (
            <div className={`rounded-2xl border ${a.border} bg-canvas-950/80 p-6 backdrop-blur-md shadow-popup animate-fadeIn`}>
              {/* Detail header */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                <div>
                  <div className={`text-[10px] font-mono font-bold tracking-widest ${a.text} mb-1`}>{scheme.code}</div>
                  <h3 className="text-xl font-bold text-ink-primary">{scheme.nameEn}</h3>
                  <div className="text-sm text-ink-muted mt-0.5">{scheme.nameHi}</div>
                  <div className="text-xs text-ink-secondary mt-1 italic">{scheme.tagline}</div>
                </div>
                <div className={`flex-shrink-0 text-right px-5 py-3 rounded-2xl ${a.bg} border ${a.border}`}>
                  <div className="text-xs text-ink-muted">Maximum Subsidy Amount</div>
                  <div className={`text-2xl font-bold font-mono mt-1 ${a.text}`}>
                    ₹{scheme.maxSubsidyLakh}L
                  </div>
                  <div className="text-[10px] text-ink-muted mt-0.5">
                    out of ₹{scheme.unitCostCapLakh}L unit cost cap
                  </div>
                </div>
              </div>

              {/* ── Quick Facts Strip ── */}
              <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-8 p-4 rounded-xl border ${a.border} bg-canvas-950/40`}>
                {[
                  { label: 'Max Govt. Subsidy', value: `${maxSubsidyPct}%`, sub: 'of unit cost' },
                  { label: 'Farmer\'s Share', value: `${farmerSharePct}%`, sub: `≈ ₹${farmerShareLakh}L` },
                  { label: 'Unit Cost Cap', value: `₹${scheme.unitCostCapLakh}L`, sub: 'per beneficiary' },
                  { label: 'Max Payout', value: `₹${scheme.maxSubsidyLakh}L`, sub: 'govt. share' },
                  { label: 'Disbursement', value: `${scheme.applicationSteps.length > 5 ? 2 : 1} Milestones`, sub: 'instalment mode' },
                  { label: 'Documents Required', value: `${scheme.requiredDocuments.length}`, sub: 'mandatory docs' },
                ].map(fact => (
                  <div key={fact.label} className="text-center">
                    <div className={`text-sm font-bold font-mono ${a.text}`}>{fact.value}</div>
                    <div className="text-[9px] font-bold text-ink-muted uppercase tracking-wider mt-0.5">{fact.label}</div>
                    <div className="text-[9px] text-ink-muted/70 mt-0.5">{fact.sub}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Subsidy by category */}
                <div>
                  <div className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-4">
                    Subsidy by Category
                  </div>
                  <div className="space-y-3">
                    {(
                      [
                        { label: 'General Category', key: 'general' },
                        { label: 'EBC (Extremely Backward)', key: 'ebc' },
                        { label: 'SC (Scheduled Caste)', key: 'sc' },
                        { label: 'ST (Scheduled Tribe)', key: 'st' },
                      ] as const
                    ).map(cat => {
                      const pct = scheme.subsidyByCategory[cat.key];
                      return (
                        <div key={cat.key}>
                          <div className="flex justify-between text-xs mb-1.5">
                            <span className="text-ink-secondary">{cat.label}</span>
                            <span className={`font-bold font-mono ${a.text}`}>{pct}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-canvas-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${a.bg} border-r ${a.border}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-5 p-3 rounded-xl bg-canvas-900/60 border border-glass-border/30">
                    <div className="text-[10px] text-ink-muted mb-0.5">Geofenced Coverage Area</div>
                    <div className="text-xs font-semibold text-ink-primary">{scheme.geofence}</div>
                  </div>
                </div>

                {/* Eligibility */}
                <div>
                  <div className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-4">
                    Eligibility Criteria
                  </div>
                  <ul className="space-y-2.5">
                    {scheme.eligibility.map((e, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-ink-secondary">
                        <CheckCircle className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${a.text}`} />
                        {e}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-5">
                    <div className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-3">
                      Required Documents
                    </div>
                    <ul className="space-y-1.5">
                      {scheme.requiredDocuments.map((d, i) => (
                        <li key={i} className="flex items-center gap-2 text-xs text-ink-secondary">
                          <FileText className="h-3 w-3 text-ink-muted flex-shrink-0" />
                          {d}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* How to apply */}
                <div>
                  <div className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-4">
                    How to Apply (Step-by-Step)
                  </div>
                  <ol className="space-y-3">
                    {scheme.applicationSteps.map((step, i) => (
                      <li key={i} className="flex items-start gap-3 text-xs text-ink-secondary">
                        <span
                          className={`flex-shrink-0 w-5 h-5 rounded-full ${a.bg} ${a.text} border ${a.border} text-[9px] font-bold flex items-center justify-center mt-0.5`}
                        >
                          {i + 1}
                        </span>
                        <span className="leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          );
        })()}
      </section>

      {/* ─── SECTION 2 — STAGE GUIDE & GLOSSARY ─── */}
      <section className="flex flex-col gap-5">
        <SectionDivider
          icon={Info}
          title="Application Stages — Reference Guide"
          subtitle="Reference details on how each application processes through state committees."
        />

        <div className="relative">
          <div className="hidden md:block absolute top-[2.2rem] left-[calc(10%)] right-[calc(10%)] h-px bg-glass-border z-0" />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 relative z-10">
            {STAGE_GUIDE.map((stage, idx) => {
              const Icon = stage.Icon;
              return (
                <div key={stage.key} className="flex flex-col">
                  <GlassCard className={`p-4 border ${stage.colorClass.split(' ').slice(2).join(' ')} flex flex-col gap-3 h-full`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-full border flex items-center justify-center flex-shrink-0 ${stage.colorClass.split(' ').slice(0, 2).join(' ')} ${stage.colorClass.split(' ')[2]}`}>
                        <span className="text-[10px] font-bold">{idx + 1}</span>
                      </div>
                      <Icon className={`h-3.5 w-3.5 ${stage.colorClass.split(' ')[0]}`} />
                    </div>
                    <div>
                      <div className={`text-xs font-bold mb-1.5 ${stage.colorClass.split(' ')[0]}`}>{stage.label}</div>
                      <div className="text-[10px] text-ink-muted leading-relaxed">{stage.description}</div>
                    </div>
                    <div className={`mt-auto pt-2 border-t border-glass-border/30 text-[9px] ${stage.colorClass.split(' ')[0]} opacity-80 leading-relaxed`}>
                      <span className="font-bold">Officer: </span>{stage.officerNote}
                    </div>
                  </GlassCard>
                </div>
              );
            })}
          </div>
        </div>

        <GlassCard className="p-5">
          <div className="flex items-center gap-2 text-xs font-bold text-ink-muted uppercase tracking-widest mb-4">
            <BookOpen className="h-3.5 w-3.5" />
            Key Terms Glossary
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {GLOSSARY.map(g => (
              <div key={g.term} className="p-3 rounded-xl bg-canvas-950/50 border border-glass-border/40">
                <div className="text-[11px] font-bold text-teal-400 mb-0.5">{g.term}</div>
                <div className="text-[9px] font-semibold text-ink-secondary mb-1.5 uppercase tracking-wider">{g.full}</div>
                <div className="text-[10px] text-ink-muted leading-relaxed">{g.desc}</div>
              </div>
            ))}
          </div>
        </GlassCard>
      </section>
    </div>
  );
}
