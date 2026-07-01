'use client';

import { useState, useEffect, useCallback } from 'react';
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
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  History,
  Loader2,
  X,
  AlertCircle
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

interface Milestone {
  name: string;
  pct: number;
}

interface SchemeCatalogItem {
  code: string;
  nameEn: string;
  nameHi: string;
  tagline: string;
  description: string;
  subsidyByCategory: SubsidyByCategory;
  unitCostCapLakh: number;
  maxSubsidyLakh: number;
  eligibility: string[];
  requiredDocuments: string[];
  geofence: string;
  classification: string;
  accentColor: string;
  milestones: Milestone[];
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
}

interface AmendmentLog {
  id: string;
  schemeCode: string;
  changeSummary: string;
  previousData: any;
  newData: any;
  createdAt: string;
  adminName: string;
  adminEmail: string;
}

const SUPPORTED_DOCUMENTS = [
  { code: 'AADHAAR', label: 'Aadhaar Card' },
  { code: 'CASTE_CERT', label: 'Caste Certificate (SC/ST/EBC)' },
  { code: 'LAND_DEED', label: 'Land Deed / LPC / Lease Agreement' },
  { code: 'BANK_PASSBOOK', label: 'Bank Passbook (Aadhaar Seeded)' },
  { code: 'PASSPORT_PHOTO', label: 'Passport Size Photograph' },
  { code: 'POND_PHOTO', label: 'Geo-tagged Pond Photos (4)' },
  { code: 'POWER_PROOF', label: 'Electricity Bill / Power Proof' },
  { code: 'TRAINING_CERT', label: 'Aquaculture Training Certificate' },
  { code: 'CROP_RECORD', label: 'Crop Cycle / Production Records' },
  { code: 'DIVERSIFICATION_PLAN', label: 'Species Diversification Plan' },
  { code: 'INCOME_CERT', label: 'Income Certificate' },
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
  gray:   { border: 'border-gray-500/40',   bg: 'bg-gray-500/5',    text: 'text-gray-400',   ring: 'ring-1 ring-gray-500/40' },
};

const STATUS_THEME: Record<string, { label: string; text: string; bg: string; border: string }> = {
  ACTIVE:   { label: 'Ongoing', text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  INACTIVE: { label: 'Suspended', text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  ARCHIVED: { label: 'Discontinued', text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' }
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
  const [schemes, setSchemes] = useState<SchemeCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSchemeCode, setSelectedSchemeCode] = useState<string | null>(null);

  // Edit / Add Modal Form State
  const [showEditModal, setShowEditModal] = useState(false);
  const [isNewScheme, setIsNewScheme] = useState(false);
  const [formError, setFormError] = useState('');
  const [submittingForm, setSubmittingForm] = useState(false);

  // Form Fields
  const [code, setCode] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [nameHi, setNameHi] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [generalSubsidy, setGeneralSubsidy] = useState(40);
  const [ebcSubsidy, setEbcSubsidy] = useState(60);
  const [scSubsidy, setScSubsidy] = useState(60);
  const [stSubsidy, setStSubsidy] = useState(60);
  const [unitCostCapLakh, setUnitCostCapLakh] = useState('');
  const [maxSubsidyLakh, setMaxSubsidyLakh] = useState('');
  const [eligibilityText, setEligibilityText] = useState('');
  const [requiredDocs, setRequiredDocs] = useState<string[]>([]);
  const [geofence, setGeofence] = useState('');
  const [classification, setClassification] = useState('');
  const [accentColor, setAccentColor] = useState('teal');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE' | 'ARCHIVED'>('ACTIVE');
  const [changeSummary, setChangeSummary] = useState('');

  // Milestone list field state
  const [milestonesList, setMilestonesList] = useState<Milestone[]>([]);

  // Amendments timeline state
  const [amendments, setAmendments] = useState<AmendmentLog[]>([]);
  const [loadingAmendments, setLoadingAmendments] = useState(false);

  const fetchSchemes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<ApiEnvelope<SchemeCatalogItem[]>>('/api/v1/yojana/admin/schemes');
      if (res.success && res.data) {
        setSchemes(res.data);
      }
    } catch (err) {
      console.error('Failed to load schemes:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSchemes();
  }, [fetchSchemes]);

  const loadAmendments = useCallback(async (schemeCode: string) => {
    setLoadingAmendments(true);
    try {
      const res = await api.get<ApiEnvelope<AmendmentLog[]>>(`/api/v1/yojana/admin/schemes/${schemeCode}/amendments`);
      if (res.success && res.data) {
        setAmendments(res.data);
      }
    } catch (err) {
      console.error('Failed to load amendments timeline:', err);
    } finally {
      setLoadingAmendments(false);
    }
  }, []);

  useEffect(() => {
    if (selectedSchemeCode) {
      void loadAmendments(selectedSchemeCode);
    } else {
      setAmendments([]);
    }
  }, [selectedSchemeCode, loadAmendments]);

  // Open Form for Editing guidelines
  const handleOpenEdit = (scheme: SchemeCatalogItem) => {
    setIsNewScheme(false);
    setFormError('');
    setCode(scheme.code);
    setNameEn(scheme.nameEn);
    setNameHi(scheme.nameHi);
    setTagline(scheme.tagline);
    setDescription(scheme.description || '');
    setGeneralSubsidy(scheme.subsidyByCategory.general);
    setEbcSubsidy(scheme.subsidyByCategory.ebc);
    setScSubsidy(scheme.subsidyByCategory.sc);
    setStSubsidy(scheme.subsidyByCategory.st);
    setUnitCostCapLakh(scheme.unitCostCapLakh.toString());
    setMaxSubsidyLakh(scheme.maxSubsidyLakh.toString());
    setEligibilityText(scheme.eligibility.join('\n'));
    setRequiredDocs(scheme.requiredDocuments);
    setGeofence(scheme.geofence);
    setClassification(scheme.classification);
    setAccentColor(scheme.accentColor);
    setMilestonesList(scheme.milestones);
    setStatus(scheme.status);
    setChangeSummary('');
    setShowEditModal(true);
  };

  // Open Form for creating new scheme
  const handleOpenCreate = () => {
    setIsNewScheme(true);
    setFormError('');
    setCode('');
    setNameEn('');
    setNameHi('');
    setTagline('');
    setDescription('');
    setGeneralSubsidy(40);
    setEbcSubsidy(60);
    setScSubsidy(60);
    setStSubsidy(60);
    setUnitCostCapLakh('');
    setMaxSubsidyLakh('');
    setEligibilityText('');
    setRequiredDocs(['AADHAAR', 'LAND_DEED', 'BANK_PASSBOOK', 'POND_PHOTO']);
    setGeofence('All 38 Bihar Districts');
    setClassification('Infrastructure');
    setAccentColor('teal');
    setMilestonesList([
      { name: 'Initial Construction Phase', pct: 50 },
      { name: 'Operational Stocking Phase', pct: 50 }
    ]);
    setStatus('ACTIVE');
    setChangeSummary('Initial Scheme guidelines created.');
    setShowEditModal(true);
  };

  const handleDocumentToggle = (docCode: string) => {
    if (requiredDocs.includes(docCode)) {
      setRequiredDocs(prev => prev.filter(c => c !== docCode));
    } else {
      setRequiredDocs(prev => [...prev, docCode]);
    }
  };

  const handleAddMilestoneField = () => {
    setMilestonesList(prev => [...prev, { name: '', pct: 0 }]);
  };

  const handleRemoveMilestoneField = (index: number) => {
    setMilestonesList(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleMilestoneChange = (index: number, field: 'name' | 'pct', val: string) => {
    setMilestonesList(prev => prev.map((m, idx) => {
      if (idx !== index) return m;
      return {
        ...m,
        [field]: field === 'pct' ? (parseInt(val, 10) || 0) : val
      };
    }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    // Validations
    if (!nameEn.trim() || !nameHi.trim()) {
      setFormError('English and Hindi names are required');
      return;
    }
    if (isNewScheme && !/^[A-Z0-9_]+$/.test(code)) {
      setFormError('Scheme Code must be uppercase alphanumeric (no spaces)');
      return;
    }
    const costCap = parseFloat(unitCostCapLakh);
    const subCap = parseFloat(maxSubsidyLakh);
    if (isNaN(costCap) || costCap <= 0 || isNaN(subCap) || subCap <= 0) {
      setFormError('Cost cap and max subsidy must be positive numbers');
      return;
    }

    // Validate Milestones
    if (milestonesList.length === 0) {
      setFormError('At least one milestone is required.');
      return;
    }
    const emptyName = milestonesList.some(m => !m.name.trim());
    if (emptyName) {
      setFormError('All milestones must have descriptions.');
      return;
    }
    const totalPct = milestonesList.reduce((sum, m) => sum + m.pct, 0);
    if (totalPct !== 100) {
      setFormError(`Milestone percentages must sum exactly to 100% (currently ${totalPct}%).`);
      return;
    }

    if (!isNewScheme && changeSummary.trim().length < 10) {
      setFormError('Guideline Amendment Summary/Reason must be at least 10 characters.');
      return;
    }

    setSubmittingForm(true);

    const payload = {
      nameEn,
      nameHi,
      tagline,
      description,
      subsidyByCategory: {
        general: generalSubsidy,
        ebc: ebcSubsidy,
        sc: scSubsidy,
        st: stSubsidy
      },
      unitCostCapLakh: costCap,
      maxSubsidyLakh: subCap,
      eligibility: eligibilityText.split('\n').map(l => l.trim()).filter(Boolean),
      requiredDocuments: requiredDocs,
      geofence,
      classification,
      accentColor,
      milestones: milestonesList,
      status,
      changeSummary
    };

    try {
      if (isNewScheme) {
        const createPayload = { ...payload, code };
        const res = await api.post<ApiEnvelope<unknown>>('/api/v1/yojana/admin/schemes', createPayload);
        if (res.success) {
          setShowEditModal(false);
          await fetchSchemes();
        } else {
          setFormError(res.error || 'Failed to create scheme');
        }
      } else {
        const res = await api.put<ApiEnvelope<unknown>>(`/api/v1/yojana/admin/schemes/${code}`, payload);
        if (res.success) {
          setShowEditModal(false);
          await fetchSchemes();
          // Reload timeline if current
          if (selectedSchemeCode === code) {
            await loadAmendments(code);
          }
        } else {
          setFormError(res.error || 'Failed to amend guidelines');
        }
      }
    } catch (err: any) {
      setFormError(err.message || 'Server error occurred');
    } finally {
      setSubmittingForm(false);
    }
  };

  return (
    <div className="flex flex-col gap-12 p-6 pb-24 max-w-5xl mx-auto w-full">

      {/* ── Page Header ── */}
      <div className="flex justify-between items-start pt-2 border-b border-glass-border/30 pb-5">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-teal-400 mb-2">
            Government Guidelines
          </div>
          <h1 className="text-3xl font-bold text-ink-primary">Aquaculture Schemes & Yojanas</h1>
          <p className="text-sm text-ink-secondary mt-2 max-w-2xl leading-relaxed">
            Browse and amend state subsidy rules, milestones, and caste-wise funding caps.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-xl bg-teal-500/10 text-teal-300 border border-teal-500/30 hover:bg-teal-500/20 transition-all shadow-glow"
        >
          <Plus className="h-4 w-4" />
          Add New Scheme
        </button>
      </div>

      {/* ════════════════════════════════════════════════════════════
          SECTION 1 — SCHEME CATALOG
      ════════════════════════════════════════════════════════════ */}
      <section className="flex flex-col gap-5">
        <SectionDivider
          icon={ScrollText}
          title="Government Scheme Directory"
          subtitle="All active and inactive aquaculture guidelines. Select a scheme card to audit its document checklists, milestones, and guideline edit logs."
        />

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-ink-muted">
            <Loader2 className="h-6 w-6 text-teal-400 animate-spin" />
            <span className="text-xs">Querying schemes config...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {schemes.map(scheme => {
              const themeColor = scheme.status === 'ACTIVE' ? scheme.accentColor : 'gray';
              const a = ACCENT[themeColor] || ACCENT.gray;
              const isOpen = selectedSchemeCode === scheme.code;
              const maxSubsidy = Math.max(...Object.values(scheme.subsidyByCategory));
              const statusMeta = STATUS_THEME[scheme.status];
              return (
                <button
                  key={scheme.code}
                  onClick={() => setSelectedSchemeCode(isOpen ? null : scheme.code)}
                  className={`text-left p-5 rounded-2xl border transition-all duration-300 relative ${
                    isOpen
                      ? `${a.border} ${a.bg} ${a.ring} shadow-tileSelected scale-[1.02]`
                      : 'border-glass-border/60 bg-canvas-900/60 shadow-tile hover:shadow-tileHover hover:border-glass-border hover:-translate-y-0.5'
                  }`}
                >
                  <div className="flex justify-between items-center mb-2.5">
                    <span className={`text-[10px] font-mono font-bold tracking-widest ${a.text}`}>
                      {scheme.code}
                    </span>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${statusMeta.bg} ${statusMeta.text} ${statusMeta.border}`}>
                      {statusMeta.label}
                    </span>
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
                      {scheme.classification || 'Scheme'}
                    </span>
                    {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* ── Expanded Scheme Detail & Amendment timeline ── */}
        {selectedSchemeCode && (() => {
          const scheme = schemes.find(s => s.code === selectedSchemeCode)!;
          if (!scheme) return null;
          const themeColor = scheme.status === 'ACTIVE' ? scheme.accentColor : 'gray';
          const a = ACCENT[themeColor] || ACCENT.gray;
          const maxSubsidyPct = Math.max(...Object.values(scheme.subsidyByCategory));
          const farmerSharePct = 100 - maxSubsidyPct;
          const farmerShareLakh = ((farmerSharePct / 100) * scheme.unitCostCapLakh).toFixed(2);
          const statusMeta = STATUS_THEME[scheme.status];
          return (
            <div className={`rounded-2xl border ${a.border} bg-canvas-950/80 p-6 backdrop-blur-md shadow-popup animate-fadeIn flex flex-col gap-6`}>
              {/* Detail header */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-glass-border/30 pb-5">
                <div>
                  <div className="flex items-center gap-3.5 mb-1.5">
                    <span className={`text-[10px] font-mono font-bold tracking-widest ${a.text}`}>{scheme.code}</span>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${statusMeta.bg} ${statusMeta.text} ${statusMeta.border}`}>
                      {statusMeta.label}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-ink-primary">{scheme.nameEn}</h3>
                  <div className="text-sm text-ink-muted mt-0.5">{scheme.nameHi}</div>
                  <div className="text-xs text-ink-secondary mt-1.5 italic">"{scheme.tagline}"</div>
                </div>

                <div className="flex flex-row sm:flex-col items-center sm:items-end gap-3 self-end sm:self-auto">
                  <button
                    onClick={() => handleOpenEdit(scheme)}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20 hover:bg-teal-500/20 transition-all"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    Amend Guidelines
                  </button>
                  <div className={`px-4 py-2 rounded-xl ${a.bg} border ${a.border} text-right`}>
                    <div className="text-[10px] text-ink-muted">Govt. Cost Cap</div>
                    <div className={`text-xl font-bold font-mono ${a.text}`}>
                      ₹{scheme.maxSubsidyLakh}L
                    </div>
                  </div>
                </div>
              </div>

              {/* description */}
              <p className="text-xs text-ink-secondary leading-relaxed bg-canvas-900/50 p-3 rounded-xl border border-glass-border/20">
                <span className="font-bold text-ink-primary">Description:</span> {scheme.description || 'No description provided.'}
              </p>

              {/* ── Quick Facts Strip ── */}
              <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 p-4 rounded-xl border ${a.border} bg-canvas-950/40`}>
                {[
                  { label: 'Max Govt. Subsidy', value: `${maxSubsidyPct}%`, sub: 'of unit cost' },
                  { label: 'Farmer\'s Share', value: `${farmerSharePct}%`, sub: `≈ ₹${farmerShareLakh}L` },
                  { label: 'Unit Cost Cap', value: `₹${scheme.unitCostCapLakh}L`, sub: 'per beneficiary' },
                  { label: 'Max Payout', value: `₹${scheme.maxSubsidyLakh}L`, sub: 'govt. share' },
                  { label: 'Disbursement', value: `${scheme.milestones.length} stages`, sub: 'milestones' },
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
                      Required Documents Checklist
                    </div>
                    <ul className="space-y-1.5">
                      {scheme.requiredDocuments.map((docCode, i) => {
                        const matched = SUPPORTED_DOCUMENTS.find(d => d.code === docCode);
                        return (
                          <li key={i} className="flex items-center gap-2 text-xs text-ink-secondary">
                            <FileText className="h-3 w-3 text-ink-muted flex-shrink-0" />
                            {matched ? matched.label : docCode}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>

                {/* Milestones & Payout Stages */}
                <div>
                  <div className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-4">
                    Disbursement Payout Milestones
                  </div>
                  <ol className="space-y-3">
                    {scheme.milestones.map((m, i) => (
                      <li key={i} className="flex items-start gap-3 text-xs text-ink-secondary">
                        <span
                          className={`flex-shrink-0 w-5 h-5 rounded-full ${a.bg} ${a.text} border ${a.border} text-[9px] font-bold flex items-center justify-center mt-0.5`}
                        >
                          {i + 1}
                        </span>
                        <div className="flex-1">
                          <div className="font-semibold text-ink-primary">{m.name}</div>
                          <div className="text-[10px] text-ink-muted mt-0.5">Disbursement Percentage: {m.pct}%</div>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>

              {/* ─── AMENDMENTS AUDIT TRAIL ACCORDION TIMELINE ─── */}
              <div className="border-t border-glass-border/30 pt-6 mt-3">
                <div className="flex items-center gap-2 text-xs font-bold text-ink-muted uppercase tracking-widest mb-4">
                  <History className="h-4 w-4 text-teal-400" />
                  Guideline Amendment Audit Timeline
                </div>

                {loadingAmendments ? (
                  <div className="flex items-center gap-2 text-xs text-ink-muted py-4">
                    <Loader2 className="h-3.5 w-3.5 text-teal-400 animate-spin" />
                    Fetching amendment timeline history...
                  </div>
                ) : amendments.length === 0 ? (
                  <div className="text-xs text-ink-muted leading-relaxed bg-canvas-900/30 p-4 rounded-xl border border-glass-border/10">
                    No guidelines amendments have been logged for this scheme. Original seeded parameters are currently active.
                  </div>
                ) : (
                  <div className="relative border-l border-glass-border/30 pl-4 ml-2 space-y-5 py-2">
                    {amendments.map((log) => (
                      <div key={log.id} className="relative text-xs">
                        {/* Dot marker */}
                        <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-teal-500 border border-canvas-900" />
                        
                        <div className="flex justify-between items-start gap-3 flex-wrap">
                          <span className="font-bold text-ink-secondary text-[11px] bg-glass px-2 py-0.5 rounded border border-glass-border">
                            {log.adminName} ({log.adminEmail})
                          </span>
                          <span className="font-mono text-[10px] text-ink-muted">
                            {new Date(log.createdAt).toLocaleString('en-IN')}
                          </span>
                        </div>

                        <p className="text-xs font-semibold text-teal-400 mt-2">
                          Change Summary: "{log.changeSummary}"
                        </p>

                        {/* Snapshot details breakdown */}
                        <div className="mt-2.5 p-3 rounded-lg bg-canvas-950/40 border border-glass-border/20 text-[10px] text-ink-muted leading-relaxed grid grid-cols-2 gap-4">
                          <div>
                            <span className="font-bold text-red-400 uppercase tracking-wider block mb-1">Previous State:</span>
                            <ul className="space-y-0.5">
                              <li>• Cost Cap: ₹{log.previousData.unit_cost_cap_lakh}L</li>
                              <li>• Govt. Share: ₹{log.previousData.max_subsidy_lakh}L</li>
                              <li>• General Subsidy: {log.previousData.subsidy_by_category?.general}%</li>
                              <li>• EBC Subsidy: {log.previousData.subsidy_by_category?.ebc}%</li>
                              <li>• Status: {log.previousData.status}</li>
                            </ul>
                          </div>
                          <div>
                            <span className="font-bold text-emerald-400 uppercase tracking-wider block mb-1">Amended State:</span>
                            <ul className="space-y-0.5">
                              <li>• Cost Cap: ₹{log.newData.unit_cost_cap_lakh}L</li>
                              <li>• Govt. Share: ₹{log.newData.max_subsidy_lakh}L</li>
                              <li>• General Subsidy: {log.newData.subsidy_by_category?.general}%</li>
                              <li>• EBC Subsidy: {log.newData.subsidy_by_category?.ebc}%</li>
                              <li>• Status: {log.newData.status}</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </section>

      {/* ─── SECTION 2 — STAGE GUIDE & GLOSSARY ─── */}
      <section className="flex flex-col gap-5">
        <SectionDivider
          icon={Info}
          title="Application Payout Stages & Terms"
          subtitle="How dynamic milestones guide DBT disbursement workflows."
        />
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
          EDIT & AMENDMENT FORM MODAL
      ════════════════════════════════════════════════════════════ */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-canvas-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-2xl border border-glass-border bg-canvas-900 flex flex-col max-h-[90vh] shadow-popup my-8">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-glass-border bg-glass">
              <div>
                <h3 className="text-base font-bold text-ink-primary">
                  {isNewScheme ? 'Add New Scheme Catalog' : `Amend Guidelines: ${code}`}
                </h3>
                <p className="text-xs text-ink-muted mt-0.5">
                  {isNewScheme ? 'Configure a new yojana guideline' : 'Update rates, documents, or status with audit log'}
                </p>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 rounded-lg bg-canvas-800 border border-glass-border text-ink-muted hover:text-ink-secondary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {formError && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Basic Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {isNewScheme && (
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block mb-1">Scheme Code (Unique, e.g. PMMSY)</label>
                    <input
                      type="text"
                      required
                      value={code}
                      onChange={e => setCode(e.target.value.toUpperCase())}
                      placeholder="e.g. RAS_YOJANA"
                      className="w-full text-xs p-2.5 rounded-xl bg-canvas-950 border border-glass-border text-ink-primary focus:outline-none focus:border-teal-500/50"
                    />
                  </div>
                )}
                <div>
                  <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block mb-1">Scheme Title (English)</label>
                  <input
                    type="text"
                    required
                    value={nameEn}
                    onChange={e => setNameEn(e.target.value)}
                    placeholder="e.g. Recirculatory Aquaculture System (RAS)"
                    className="w-full text-xs p-2.5 rounded-xl bg-canvas-950 border border-glass-border text-ink-primary focus:outline-none focus:border-teal-500/50"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block mb-1">Scheme Title (Hindi)</label>
                  <input
                    type="text"
                    required
                    value={nameHi}
                    onChange={e => setNameHi(e.target.value)}
                    placeholder="e.g. रीसर्क्युलेटरी एक्वाकल्चर सिस्टम योजना"
                    className="w-full text-xs p-2.5 rounded-xl bg-canvas-950 border border-glass-border text-ink-primary focus:outline-none focus:border-teal-500/50"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block mb-1">Tagline</label>
                  <input
                    type="text"
                    value={tagline}
                    onChange={e => setTagline(e.target.value)}
                    placeholder="e.g. High density intensive fish farming with 80% water recirculation"
                    className="w-full text-xs p-2.5 rounded-xl bg-canvas-950 border border-glass-border text-ink-primary focus:outline-none focus:border-teal-500/50"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block mb-1">Description / Brief</label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={2}
                    placeholder="Provide scheme outline details..."
                    className="w-full text-xs p-2.5 rounded-xl bg-canvas-950 border border-glass-border text-ink-primary focus:outline-none focus:border-teal-500/50"
                  />
                </div>
              </div>

              {/* Financial Caps */}
              <div className="border-t border-glass-border/30 pt-4">
                <div className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-3">
                  Financial Limits & Budget Caps
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block mb-1">Unit Cost Cap (in Lakhs ₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={unitCostCapLakh}
                      onChange={e => setUnitCostCapLakh(e.target.value)}
                      placeholder="e.g. 20.00"
                      className="w-full text-xs p-2.5 rounded-xl bg-canvas-950 border border-glass-border text-ink-primary focus:outline-none focus:border-teal-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block mb-1">Max Govt. Subsidy Cap (in Lakhs ₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={maxSubsidyLakh}
                      onChange={e => setMaxSubsidyLakh(e.target.value)}
                      placeholder="e.g. 12.00"
                      className="w-full text-xs p-2.5 rounded-xl bg-canvas-950 border border-glass-border text-ink-primary focus:outline-none focus:border-teal-500/50"
                    />
                  </div>
                </div>
              </div>

              {/* Category-wise Subsidy Percentages */}
              <div className="border-t border-glass-border/30 pt-4">
                <div className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-3">
                  Subsidy Percentage by Caste Category (%)
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'General', val: generalSubsidy, setter: setGeneralSubsidy },
                    { label: 'EBC', val: ebcSubsidy, setter: setEbcSubsidy },
                    { label: 'SC', val: scSubsidy, setter: setScSubsidy },
                    { label: 'ST', val: stSubsidy, setter: setStSubsidy },
                  ].map(item => (
                    <div key={item.label}>
                      <label className="text-[9px] font-bold text-ink-muted uppercase tracking-wider block mb-1">{item.label}</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        required
                        value={item.val}
                        onChange={e => item.setter(parseInt(e.target.value, 10) || 0)}
                        className="w-full text-xs p-2.5 rounded-xl bg-canvas-950 border border-glass-border text-ink-primary focus:outline-none focus:border-teal-500/50"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Required Documents */}
              <div className="border-t border-glass-border/30 pt-4">
                <div className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-3">
                  Required Application Documents Checklist
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-canvas-950/40 p-4 rounded-xl border border-glass-border/20">
                  {SUPPORTED_DOCUMENTS.map(doc => (
                    <label key={doc.code} className="flex items-center gap-2.5 text-xs text-ink-secondary cursor-pointer">
                      <input
                        type="checkbox"
                        checked={requiredDocs.includes(doc.code)}
                        onChange={() => handleDocumentToggle(doc.code)}
                        className="rounded border-glass-border bg-canvas-950 text-teal-500 focus:ring-0 focus:ring-offset-0"
                      />
                      <span>{doc.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Milestones Config */}
              <div className="border-t border-glass-border/30 pt-4">
                <div className="flex justify-between items-center mb-3">
                  <div className="text-[10px] font-bold text-ink-muted uppercase tracking-widest">
                    Disbursement Payout Milestones
                  </div>
                  <button
                    type="button"
                    onClick={handleAddMilestoneField}
                    className="text-[10px] font-bold text-teal-400 hover:text-teal-300 uppercase flex items-center gap-0.5"
                  >
                    <Plus className="h-3 w-3" /> Add Stage
                  </button>
                </div>

                <div className="space-y-2">
                  {milestonesList.map((m, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <span className="text-xs font-mono text-ink-muted w-4">{idx + 1}.</span>
                      <input
                        type="text"
                        required
                        value={m.name}
                        onChange={e => handleMilestoneChange(idx, 'name', e.target.value)}
                        placeholder={`Stage ${idx + 1} Description (e.g. Excavation completed)`}
                        className="flex-1 text-xs p-2.5 rounded-xl bg-canvas-950 border border-glass-border text-ink-primary focus:outline-none focus:border-teal-500/50"
                      />
                      <div className="w-20 relative">
                        <input
                          type="number"
                          min="1"
                          max="100"
                          required
                          value={m.pct}
                          onChange={e => handleMilestoneChange(idx, 'pct', e.target.value)}
                          className="w-full text-xs p-2.5 pr-6 rounded-xl bg-canvas-950 border border-glass-border text-ink-primary focus:outline-none focus:border-teal-500/50 text-right font-mono"
                        />
                        <span className="absolute right-2 top-3 text-[10px] text-ink-muted">%</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveMilestoneField(idx)}
                        className="p-2 rounded-xl bg-red-500/5 border border-red-500/20 text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-right text-[10px] font-mono text-ink-muted">
                  Total Percentage: <span className={milestonesList.reduce((s, m) => s + m.pct, 0) === 100 ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                    {milestonesList.reduce((s, m) => s + m.pct, 0)}%
                  </span> (Must be exactly 100%)
                </div>
              </div>

              {/* Classification, Geofence & Status */}
              <div className="border-t border-glass-border/30 pt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block mb-1">Geofence (Coverage)</label>
                  <input
                    type="text"
                    required
                    value={geofence}
                    onChange={e => setGeofence(e.target.value)}
                    placeholder="e.g. All 38 Bihar Districts"
                    className="w-full text-xs p-2.5 rounded-xl bg-canvas-950 border border-glass-border text-ink-primary focus:outline-none focus:border-teal-500/50"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block mb-1">Classification Type</label>
                  <input
                    type="text"
                    required
                    value={classification}
                    onChange={e => setClassification(e.target.value)}
                    placeholder="e.g. Intensive Aquaculture"
                    className="w-full text-xs p-2.5 rounded-xl bg-canvas-950 border border-glass-border text-ink-primary focus:outline-none focus:border-teal-500/50"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block mb-1">Status State</label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as any)}
                    className="w-full text-xs p-2.5 rounded-xl bg-canvas-950 border border-glass-border text-ink-primary focus:outline-none focus:border-teal-500/50"
                  >
                    <option value="ACTIVE">Ongoing (Active)</option>
                    <option value="INACTIVE">Suspended (Inactive)</option>
                    <option value="ARCHIVED">Discontinued (Archived)</option>
                  </select>
                </div>
              </div>

              {/* Mandatory Guideline Amendment Log Reason */}
              <div className="border-t border-glass-border/30 pt-4">
                <label className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-1">
                  Amendment Summary / GO Reference (Mandatory, min 10 chars)
                </label>
                <textarea
                  required
                  value={changeSummary}
                  onChange={e => setChangeSummary(e.target.value)}
                  placeholder="e.g. Increased PMMSY EBC category subsidy to 60% per Government Order No. MATSYA-2026-89."
                  rows={3}
                  className="w-full text-xs p-3 rounded-xl bg-canvas-950 border border-amber-500/30 text-ink-primary placeholder-ink-muted focus:outline-none focus:border-amber-500/60"
                />
              </div>

            </form>

            {/* Modal Footer */}
            <div className="p-4 border-t border-glass-border bg-glass flex justify-end gap-2.5">
              <button
                type="button"
                disabled={submittingForm}
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-canvas-800 text-ink-muted hover:text-ink-secondary disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingForm}
                onClick={handleFormSubmit}
                className="flex items-center gap-1 px-5 py-2 text-xs font-bold rounded-xl bg-teal-500/10 text-teal-300 border border-teal-500/30 hover:bg-teal-500/20 disabled:opacity-30"
              >
                {submittingForm && <Loader2 className="h-3 w-3 animate-spin" />}
                {isNewScheme ? 'Publish Scheme' : 'Publish Guideline Amendment'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
