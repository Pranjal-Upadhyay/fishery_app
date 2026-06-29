'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ScrollText,
  CheckCircle,
  XCircle,
  Clock,
  UserCheck,
  CreditCard,
  Loader2,
  ChevronDown,
  ChevronUp,
  Bell,
  ArrowRight,
  Info,
  MapPin,
  FileText,
  BookOpen,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { api } from '@/lib/api';
import { ApiEnvelope } from '@/lib/types';

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

interface Application {
  id: string;
  appNum: string;
  farmerName: string;
  caste: string;
  yojanaName: string;
  district: string;
  landArea: string;
  documents: { name: string; status: 'verified' | 'pending' | 'missing' }[];
  gpsCoords: string;
  gpsMatch: boolean;
  status: string;
  milestones: { name: string; pct: number; verified: boolean; photoUrl?: string }[];
  subsidyAmount: string;
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
      'Open MatsyaMitra app → Policy Guidance → Apply for Scheme',
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
      'Open MatsyaMitra → Policy Guidance → Apply for Scheme',
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

// ─── Accent Styles ────────────────────────────────────────────────────────────

const ACCENT: Record<string, { border: string; bg: string; text: string; selectedBg: string }> = {
  teal:   { border: 'border-teal-500/40',   bg: 'bg-teal-500/10',   text: 'text-teal-400',   selectedBg: 'bg-teal-500/15' },
  sky:    { border: 'border-sky-500/40',    bg: 'bg-sky-500/10',    text: 'text-sky-400',    selectedBg: 'bg-sky-500/15' },
  amber:  { border: 'border-amber-500/40',  bg: 'bg-amber-500/10',  text: 'text-amber-400',  selectedBg: 'bg-amber-500/15' },
  violet: { border: 'border-violet-500/40', bg: 'bg-violet-500/10', text: 'text-violet-400', selectedBg: 'bg-violet-500/15' },
};

// ─── Status Badge ─────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { colorClass: string; label: string }> = {
  'Awaiting Review': { colorClass: 'text-amber-400 bg-amber-500/10 border-amber-500/30',  label: 'Awaiting Review' },
  'DLC Queue':       { colorClass: 'text-sky-400 bg-sky-500/10 border-sky-500/30',         label: 'DLC Queue' },
  'Approved':        { colorClass: 'text-violet-400 bg-violet-500/10 border-violet-500/30', label: 'DLC Approved' },
  'Milestone 1 Met': { colorClass: 'text-rose-400 bg-rose-500/10 border-rose-500/30',      label: 'Milestone 1 Met' },
  'Milestone 2 Met': { colorClass: 'text-teal-400 bg-teal-500/10 border-teal-500/30',      label: 'Completed' },
  'Rejected':        { colorClass: 'text-red-400 bg-red-500/10 border-red-500/30',         label: 'Rejected' },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? { colorClass: 'text-gray-400 bg-gray-500/10 border-gray-500/30', label: status };
  return (
    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${meta.colorClass}`}>
      {meta.label}
    </span>
  );
}

// ─── Section Divider ──────────────────────────────────────────────────────────

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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SchemesPage() {
  const [selectedScheme, setSelectedScheme] = useState<string | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [expandedApp, setExpandedApp] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [notifSent, setNotifSent] = useState<Set<string>>(new Set());

  const fetchApps = useCallback(async () => {
    try {
      const res = await api.get<ApiEnvelope<Application[]>>('/api/v1/yojana/admin/applications');
      if (res.success) setApplications(res.data);
    } catch (err) {
      console.error('Failed to fetch yojana applications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchApps(); }, [fetchApps]);

  const handleStatusChange = async (appId: string, dbStatus: string) => {
    setProcessingId(appId);
    try {
      await api.patch<ApiEnvelope<unknown>>(`/api/v1/yojana/admin/applications/${appId}/status`, { status: dbStatus });
      await fetchApps();
    } catch (err) {
      console.error('Status update failed:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleVerifyDoc = (appId: string, docIndex: number) => {
    setApplications(prev =>
      prev.map(app => {
        if (app.id !== appId) return app;
        const newDocs = [...app.documents];
        newDocs[docIndex] = { ...newDocs[docIndex], status: 'verified' };
        return { ...app, documents: newDocs };
      }),
    );
  };

  const handleSendNotification = async (app: Application) => {
    try {
      await api.post('/api/v1/notifications/send', {
        farmerName: app.farmerName,
        type: 'scheme_status_update',
        title: `Scheme Application Update — ${app.status}`,
        message: `Your application ${app.appNum} for ${app.yojanaName} is currently in "${app.status}" stage. Open MatsyaMitra for full details.`,
      });
      setNotifSent(prev => new Set([...prev, app.id]));
    } catch (err) {
      console.error('Notification failed:', err);
    }
  };

  const filteredApps =
    statusFilter === 'ALL' ? applications : applications.filter(a => a.status === statusFilter);

  const countByStatus = (s: string) => applications.filter(a => a.status === s).length;

  // ──────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-16 p-6 pb-24 max-w-5xl mx-auto w-full">

      {/* ── Page Header ── */}
      <div className="pt-2">
        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-teal-400 mb-2">
          Government Allocations
        </div>
        <h1 className="text-3xl font-bold text-ink-primary">Aquaculture Schemes & Yojanas</h1>
        <p className="text-sm text-ink-secondary mt-2 max-w-2xl leading-relaxed">
          Manage government subsidy schemes for aquaculture development across Bihar. Browse scheme rules,
          review farmer applications, and track subsidy disbursements through each verification stage.
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

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {SCHEME_CATALOG.map(scheme => {
            const a = ACCENT[scheme.accentColor];
            const isOpen = selectedScheme === scheme.id;
            const maxSubsidy = Math.max(...Object.values(scheme.subsidyByCategory));
            return (
              <button
                key={scheme.id}
                onClick={() => setSelectedScheme(isOpen ? null : scheme.id)}
                className={`text-left p-5 rounded-2xl border transition-all duration-200 ${
                  isOpen
                    ? `${a.border} ${a.selectedBg}`
                    : 'border-glass-border bg-canvas-900/50 hover:bg-glass-subtle'
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
          return (
            <div className={`rounded-2xl border ${a.border} bg-canvas-950/70 p-6 backdrop-blur-sm`}>
              {/* Detail header */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
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

      {/* ════════════════════════════════════════════════════════════
          SECTION 2 — STAGE GUIDE & GLOSSARY
      ════════════════════════════════════════════════════════════ */}
      <section className="flex flex-col gap-5">
        <SectionDivider
          icon={Info}
          title="Application Stages — Reference Guide"
          subtitle="New to the dashboard? Every application moves through these 5 stages before a subsidy is fully disbursed. Use this as a reference."
        />

        {/* 5-step pipeline */}
        <div className="relative">
          {/* Connecting line behind cards */}
          <div className="hidden md:block absolute top-[2.2rem] left-[calc(10%)] right-[calc(10%)] h-px bg-glass-border z-0" />

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 relative z-10">
            {STAGE_GUIDE.map((stage, idx) => {
              const Icon = stage.Icon;
              return (
                <div key={stage.key} className="flex flex-col">
                  <GlassCard className={`p-4 border ${stage.colorClass.split(' ').slice(2).join(' ')} flex flex-col gap-3`}>
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-full border flex items-center justify-center flex-shrink-0 ${stage.colorClass.split(' ').slice(0, 2).join(' ')} ${stage.colorClass.split(' ')[2]}`}
                      >
                        <span className="text-[10px] font-bold">{idx + 1}</span>
                      </div>
                      <Icon className={`h-3.5 w-3.5 ${stage.colorClass.split(' ')[0]}`} />
                    </div>
                    <div>
                      <div className={`text-xs font-bold mb-1.5 ${stage.colorClass.split(' ')[0]}`}>
                        {stage.label}
                      </div>
                      <div className="text-[10px] text-ink-muted leading-relaxed">
                        {stage.description}
                      </div>
                    </div>
                    <div className={`mt-auto pt-2 border-t border-glass-border/30 text-[9px] ${stage.colorClass.split(' ')[0]} opacity-80 leading-relaxed`}>
                      <span className="font-bold">Officer: </span>
                      {stage.officerNote}
                    </div>
                  </GlassCard>
                  {idx < STAGE_GUIDE.length - 1 && (
                    <div className="md:hidden flex justify-center py-1">
                      <ArrowRight className="h-3 w-3 text-ink-muted rotate-90" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Glossary */}
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

      {/* ════════════════════════════════════════════════════════════
          SECTION 3 — APPLICATION QUEUE
      ════════════════════════════════════════════════════════════ */}
      <section className="flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <SectionDivider
            icon={UserCheck}
            title="Verification & Approval Queue"
            subtitle="Click any application row to expand its full details, documents, and available officer actions."
          />
          {!loading && (
            <div className="text-xs text-ink-muted flex-shrink-0 pt-1">
              {applications.length} total application{applications.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Filter pills */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`text-xs px-3 py-1.5 rounded-full border font-semibold transition-all ${
              statusFilter === 'ALL'
                ? 'bg-teal-500/20 border-teal-500/40 text-teal-400'
                : 'bg-canvas-900/50 border-glass-border text-ink-muted hover:text-ink-secondary'
            }`}
          >
            All ({applications.length})
          </button>
          {Object.keys(STATUS_META).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`text-xs px-3 py-1.5 rounded-full border font-semibold transition-all ${
                statusFilter === s
                  ? `${STATUS_META[s].colorClass}`
                  : 'bg-canvas-900/50 border-glass-border text-ink-muted hover:text-ink-secondary'
              }`}
            >
              {STATUS_META[s].label} ({countByStatus(s)})
            </button>
          ))}
        </div>

        {/* Application list */}
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3 text-ink-muted">
            <Loader2 className="h-5 w-5 text-teal-400 animate-spin" />
            <span className="text-sm">Loading applications...</span>
          </div>
        ) : filteredApps.length === 0 ? (
          <GlassCard className="p-12 text-center">
            <div className="text-ink-muted text-sm">No applications found for this filter.</div>
          </GlassCard>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredApps.map(app => {
              const isExpanded = expandedApp === app.id;
              const isProcessing = processingId === app.id;
              const allDocsVerified = app.documents.every(d => d.status === 'verified');
              const isDone = app.status === 'Milestone 2 Met' || app.status === 'Rejected';

              return (
                <div
                  key={app.id}
                  className={`rounded-2xl border overflow-hidden transition-all ${
                    isExpanded ? 'border-teal-500/25' : 'border-glass-border'
                  }`}
                >
                  {/* ── Collapsed Row ── */}
                  <button
                    className={`w-full text-left px-5 py-4 flex items-center gap-4 transition-colors ${
                      isExpanded ? 'bg-glass' : 'bg-canvas-900/50 hover:bg-glass-subtle'
                    }`}
                    onClick={() => setExpandedApp(isExpanded ? null : app.id)}
                  >
                    <div className="font-mono text-xs font-bold text-ink-primary w-36 flex-shrink-0">
                      {app.appNum}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-ink-primary">{app.farmerName}</div>
                      <div className="text-xs text-ink-muted mt-0.5 truncate">
                        {app.yojanaName} · {app.district}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <StatusBadge status={app.status} />
                      <span className="text-xs text-ink-muted hidden sm:block">{app.caste}</span>
                      {isExpanded
                        ? <ChevronUp className="h-4 w-4 text-ink-muted" />
                        : <ChevronDown className="h-4 w-4 text-ink-muted" />
                      }
                    </div>
                  </button>

                  {/* ── Expanded Detail Panel ── */}
                  {isExpanded && (
                    <div className="border-t border-glass-border/60 bg-canvas-950/60 p-6">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* ── Col 1: Profile & GPS ── */}
                        <div className="space-y-5">
                          <div>
                            <div className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-3">
                              Farmer Profile
                            </div>
                            <div className="space-y-2">
                              {[
                                { label: 'Full Name',      value: app.farmerName },
                                { label: 'Category',       value: app.caste },
                                { label: 'District',       value: app.district },
                                { label: 'Land Area',      value: app.landArea },
                                { label: 'Subsidy Amount', value: app.subsidyAmount },
                              ].map(row => (
                                <div key={row.label} className="flex justify-between items-baseline text-xs">
                                  <span className="text-ink-muted">{row.label}</span>
                                  <span className="font-semibold text-ink-primary text-right">{row.value}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div
                            className={`p-3.5 rounded-xl border ${
                              app.gpsMatch
                                ? 'bg-teal-500/5 border-teal-500/20'
                                : 'bg-rose-500/5 border-rose-500/20'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 text-xs font-bold text-ink-primary mb-1.5">
                              <MapPin className="h-3.5 w-3.5 text-teal-400" />
                              GPS Geofence Check
                            </div>
                            <div className="text-[10px] font-mono text-ink-muted mb-2">{app.gpsCoords}</div>
                            <div
                              className={`flex items-center gap-1.5 text-xs font-bold ${
                                app.gpsMatch ? 'text-teal-400' : 'text-rose-400'
                              }`}
                            >
                              {app.gpsMatch
                                ? <><CheckCircle className="h-3.5 w-3.5" /> Passed — pond within eligible district</>
                                : <><XCircle className="h-3.5 w-3.5" /> Failed — outside eligible boundary</>
                              }
                            </div>
                          </div>

                          {/* Milestones */}
                          {app.milestones && app.milestones.length > 0 && (
                            <div>
                              <div className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-3">
                                Disbursement Milestones
                              </div>
                              <div className="space-y-2">
                                {app.milestones.map((m, idx) => (
                                  <div
                                    key={idx}
                                    className={`p-3 rounded-xl border text-xs ${
                                      m.verified
                                        ? 'bg-teal-500/5 border-teal-500/20'
                                        : 'bg-canvas-950/30 border-glass-border/40'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-semibold text-ink-primary">{m.name}</span>
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-ink-muted font-mono text-[10px]">{m.pct}%</span>
                                        {m.verified
                                          ? <span className="text-teal-400 flex items-center gap-0.5 text-[10px] font-bold"><CheckCircle className="h-3 w-3" /> Disbursed</span>
                                          : <span className="text-ink-muted text-[10px]">Pending</span>
                                        }
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* ── Col 2: Documents ── */}
                        <div>
                          <div className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-3">
                            Document Verification
                          </div>
                          <div className="flex flex-col gap-2">
                            {app.documents.map((doc, idx) => (
                              <div
                                key={doc.name}
                                className="flex items-center justify-between p-3 rounded-xl border border-glass-border/40 bg-canvas-950/30"
                              >
                                <div className="flex items-center gap-2 text-xs text-ink-secondary min-w-0">
                                  <FileText className="h-3.5 w-3.5 text-ink-muted flex-shrink-0" />
                                  <span className="truncate">{doc.name}</span>
                                </div>
                                <div className="flex-shrink-0 ml-2">
                                  {doc.status === 'verified' ? (
                                    <span className="flex items-center gap-1 text-[10px] font-bold text-teal-400">
                                      <CheckCircle className="h-3 w-3" /> Verified
                                    </span>
                                  ) : doc.status === 'missing' ? (
                                    <span className="flex items-center gap-1 text-[10px] font-bold text-rose-400">
                                      <AlertTriangle className="h-3 w-3" /> Missing
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => handleVerifyDoc(app.id, idx)}
                                      className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-teal-500/10 text-teal-300 border border-teal-500/30 hover:bg-teal-500/20 transition-colors"
                                    >
                                      Verify
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>

                          {!allDocsVerified && app.status === 'Awaiting Review' && (
                            <div className="mt-3 flex items-start gap-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-amber-300">
                              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                              All documents must be verified before this application can be sent to the DLC Queue.
                            </div>
                          )}
                        </div>

                        {/* ── Col 3: Officer Actions ── */}
                        <div>
                          <div className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-3">
                            Officer Actions
                          </div>
                          <div className="flex flex-col gap-2.5">

                            {/* Stage-specific primary action */}
                            {app.status === 'Awaiting Review' && (
                              <button
                                disabled={!allDocsVerified || isProcessing}
                                onClick={() => handleStatusChange(app.id, 'DLC_QUEUE')}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-semibold bg-sky-500/10 text-sky-300 border border-sky-500/30 hover:bg-sky-500/20 disabled:opacity-40 disabled:pointer-events-none transition-all"
                              >
                                {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
                                Send to DLC Queue
                              </button>
                            )}

                            {app.status === 'DLC Queue' && (
                              <button
                                disabled={isProcessing}
                                onClick={() => handleStatusChange(app.id, 'APPROVED')}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-semibold bg-violet-500/10 text-violet-300 border border-violet-500/30 hover:bg-violet-500/20 disabled:opacity-40 disabled:pointer-events-none transition-all"
                              >
                                {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                                DLC — Approve Application
                              </button>
                            )}

                            {app.status === 'Approved' && (
                              <button
                                disabled={isProcessing}
                                onClick={() => handleStatusChange(app.id, 'MILESTONE_1_MET')}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/30 hover:bg-rose-500/20 disabled:opacity-40 disabled:pointer-events-none transition-all"
                              >
                                {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />}
                                Verify & Release Milestone 1
                              </button>
                            )}

                            {app.status === 'Milestone 1 Met' && (
                              <button
                                disabled={isProcessing}
                                onClick={() => handleStatusChange(app.id, 'MILESTONE_2_MET')}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-semibold bg-teal-500/10 text-teal-300 border border-teal-500/30 hover:bg-teal-500/20 disabled:opacity-40 disabled:pointer-events-none transition-all"
                              >
                                {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                                Verify & Release Final Payment
                              </button>
                            )}

                            {/* Send Notification */}
                            {!isDone && (
                              <button
                                onClick={() => void handleSendNotification(app)}
                                disabled={notifSent.has(app.id)}
                                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-semibold border transition-all ${
                                  notifSent.has(app.id)
                                    ? 'bg-teal-500/5 text-teal-400/50 border-teal-500/15 cursor-not-allowed'
                                    : 'bg-canvas-900/60 text-ink-secondary border-glass-border hover:bg-glass-subtle hover:text-ink-primary'
                                }`}
                              >
                                <Bell className="h-3.5 w-3.5" />
                                {notifSent.has(app.id) ? 'Notification Sent ✓' : 'Notify Farmer of Current Status'}
                              </button>
                            )}

                            {/* Reject */}
                            {!isDone && (
                              <button
                                disabled={isProcessing}
                                onClick={() => handleStatusChange(app.id, 'REJECTED')}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-semibold bg-red-500/5 text-red-400 border border-red-500/20 hover:bg-red-500/10 disabled:opacity-40 disabled:pointer-events-none transition-all"
                              >
                                {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                                Reject Application
                              </button>
                            )}

                            {/* Terminal states */}
                            {app.status === 'Milestone 2 Met' && (
                              <div className="text-center py-3 text-xs text-teal-400 font-semibold flex items-center justify-center gap-2">
                                <CheckCircle className="h-4 w-4" />
                                Full subsidy disbursed via DBT — Case closed
                              </div>
                            )}
                            {app.status === 'Rejected' && (
                              <div className="text-center py-3 text-xs text-red-400 font-semibold flex items-center justify-center gap-2">
                                <XCircle className="h-4 w-4" />
                                Application rejected
                              </div>
                            )}

                            {/* Contextual stage note */}
                            {!isDone && (() => {
                              const stageInfo = STAGE_GUIDE.find(s => s.label === app.status || s.key === app.status);
                              if (!stageInfo) return null;
                              return (
                                <div className="mt-1 p-3 rounded-xl bg-canvas-900/40 border border-glass-border/30 text-[10px] text-ink-muted leading-relaxed">
                                  <span className="font-bold text-ink-secondary">Current stage: </span>
                                  {stageInfo.description}
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
