'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  MapPin,
  UserCheck,
  Bell,
  CreditCard,
  ShieldCheck,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  FileText,
  LayoutGrid,
  ListChecks,
  Download,
  TrendingUp,
  Coins,
  ArrowRight,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { ExportButton } from '@/components/ui/export-button';
import { api } from '@/lib/api';
import { ApiEnvelope } from '@/lib/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ApplicationDocument {
  id: string;
  name: string;
  doc_type: string;
  filePath: string;
  fileName: string;
  status: 'verified' | 'pending' | 'rejected';
  rejectionReason?: string | null;
}

interface Application {
  id: string;
  appNum: string;
  farmerName: string;
  caste: string;
  yojanaName: string;
  district: string;
  landArea: string;
  documents: ApplicationDocument[];
  gpsCoords: string;
  gpsMatch: boolean;
  status: string;
  milestones: { name: string; pct: number; verified: boolean; photoUrl?: string }[];
  subsidyAmount: string;
  projectDescription?: string;
  applicationRejectionReason?: string | null;
}

interface LocationItem {
  code: string;
  name: string;
}

interface MisStatItem {
  code: string;
  name: string;
  parentCode: string | null;
  awaiting_review: number;
  dlc_queue: number;
  approved: number;
  milestone_1: number;
  completed: number;
  rejected: number;
  total: number;
  totalSubsidy: number;
}

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

export default function ApplicationsPage() {
  const [activeTab, setActiveTab] = useState<'queue' | 'mis'>('queue');
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedApp, setExpandedApp] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [notifSent, setNotifSent] = useState<Set<string>>(new Set());

  // Pagination states
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filter Toolbar states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedBlock, setSelectedBlock] = useState('');
  const [selectedPanchayat, setSelectedPanchayat] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedYojana, setSelectedYojana] = useState('');

  // Cascading Location Dropdowns Lists
  const [districts, setDistricts] = useState<LocationItem[]>([]);
  const [blocks, setBlocks] = useState<LocationItem[]>([]);
  const [panchayats, setPanchayats] = useState<LocationItem[]>([]);

  // MIS Analytics states
  const [misStats, setMisStats] = useState<MisStatItem[]>([]);
  const [misGroupBy, setMisGroupBy] = useState<'district' | 'block' | 'panchayat'>('district');
  const [misLoading, setMisLoading] = useState(false);
  const [misDistrictFilter, setMisDistrictFilter] = useState('');
  const [misBlockFilter, setMisBlockFilter] = useState('');

  // PDF Viewer Modal state
  const [viewingDoc, setViewingDoc] = useState<ApplicationDocument | null>(null);
  const [viewingDocUrl, setViewingDocUrl] = useState<string>('');
  const [fetchingDocUrl, setFetchingDocUrl] = useState(false);

  // Document Rejection Modal state
  const [rejectingDoc, setRejectingDoc] = useState<ApplicationDocument | null>(null);
  const [rejectionDocReason, setRejectionDocReason] = useState('');
  const [submittingDocRejection, setSubmittingDocRejection] = useState(false);

  // Application Rejection Modal state
  const [rejectingAppId, setRejectingAppId] = useState<string | null>(null);
  const [rejectionAppReason, setRejectionAppReason] = useState('');
  const [submittingAppRejection, setSubmittingAppRejection] = useState(false);

  const [schemes, setSchemes] = useState<{ code: string; nameEn: string }[]>([]);

  // Load static/initial dropdown values
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const res = await api.get<ApiEnvelope<LocationItem[]>>('/api/v1/yojana/admin/locations/districts');
        if (res.success) setDistricts(res.data);

        const schemesRes = await api.get<ApiEnvelope<{ code: string; nameEn: string }[]>>('/api/v1/yojana/admin/schemes');
        if (schemesRes.success) setSchemes(schemesRes.data);
      } catch (err) {
        console.error('Failed to load initial dropdowns:', err);
      }
    };
    void loadInitialData();
  }, []);

  // Cascading blocks load
  useEffect(() => {
    const loadBlocks = async () => {
      if (!selectedDistrict) {
        setBlocks([]);
        setSelectedBlock('');
        setPanchayats([]);
        setSelectedPanchayat('');
        return;
      }
      try {
        const res = await api.get<ApiEnvelope<LocationItem[]>>(`/api/v1/yojana/admin/locations/blocks?districtCode=${selectedDistrict}`);
        if (res.success) {
          setBlocks(res.data);
          setSelectedBlock('');
          setValuesEmpty();
        }
      } catch (err) {
        console.error('Failed to load blocks:', err);
      }
    };
    const setValuesEmpty = () => {
      setPanchayats([]);
      setSelectedPanchayat('');
    };
    void loadBlocks();
  }, [selectedDistrict]);

  // Cascading panchayats load
  useEffect(() => {
    const loadPanchayats = async () => {
      if (!selectedBlock) {
        setPanchayats([]);
        setSelectedPanchayat('');
        return;
      }
      try {
        const res = await api.get<ApiEnvelope<LocationItem[]>>(`/api/v1/yojana/admin/locations/panchayats?blockCode=${selectedBlock}`);
        if (res.success) setPanchayats(res.data);
      } catch (err) {
        console.error('Failed to load panchayats:', err);
      }
    };
    void loadPanchayats();
  }, [selectedBlock]);

  // Fetch operational queue
  const fetchApps = useCallback(async () => {
    setLoading(true);
    try {
      const qParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search: searchTerm,
        districtCode: selectedDistrict,
        blockCode: selectedBlock,
        panchayatCode: selectedPanchayat,
        status: selectedStatus,
        yojanaCode: selectedYojana,
      });
      const res = await api.get<ApiEnvelope<Application[]>>(`/api/v1/yojana/admin/applications?${qParams.toString()}`);
      if (res.success && res.data) {
        setApplications(res.data);
        if (res.pagination) {
          setTotalCount(res.pagination.total);
          setTotalPages(res.pagination.pages);
        }
      }
    } catch (err) {
      console.error('Failed to fetch applications:', err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchTerm, selectedDistrict, selectedBlock, selectedPanchayat, selectedStatus, selectedYojana]);

  useEffect(() => {
    if (activeTab === 'queue') {
      void fetchApps();
    }
  }, [fetchApps, activeTab]);

  // Fetch MIS Aggregate Stats
  const fetchMisStats = useCallback(async () => {
    setMisLoading(true);
    try {
      const qParams = new URLSearchParams({
        groupBy: misGroupBy,
        districtCode: misDistrictFilter,
        blockCode: misBlockFilter,
      });
      const res = await api.get<ApiEnvelope<MisStatItem[]>>(`/api/v1/yojana/admin/applications/mis-stats?${qParams.toString()}`);
      if (res.success && res.data) {
        setMisStats(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch MIS stats:', err);
    } finally {
      setMisLoading(false);
    }
  }, [misGroupBy, misDistrictFilter, misBlockFilter]);

  useEffect(() => {
    if (activeTab === 'mis') {
      void fetchMisStats();
    }
  }, [fetchMisStats, activeTab]);

  // Handle status step transition
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

  const handleOpenDocViewer = async (doc: ApplicationDocument) => {
    setViewingDoc(doc);
    setFetchingDocUrl(true);
    setViewingDocUrl('');
    try {
      const res = await api.get<ApiEnvelope<{ url: string }>>(`/api/v1/yojana/admin/documents/${doc.id}/view-url`);
      if (res.success && res.data?.url) {
        setViewingDocUrl(res.data.url);
      } else {
        console.error('Failed to fetch download url');
      }
    } catch (err) {
      console.error('Error fetching doc view URL:', err);
    } finally {
      setFetchingDocUrl(false);
    }
  };

  const handleVerifyDocDirectly = async (docId: string) => {
    try {
      await api.patch(`/api/v1/yojana/admin/documents/${docId}/verify`, {
        status: 'VERIFIED'
      });
      setViewingDoc(null);
      await fetchApps();
    } catch (err) {
      console.error('Error verifying document:', err);
    }
  };

  const handleConfirmDocRejection = async () => {
    if (!rejectingDoc) return;
    if (rejectionDocReason.trim().length < 10) {
      alert('Please provide a reason of at least 10 characters.');
      return;
    }

    setSubmittingDocRejection(true);
    try {
      await api.patch(`/api/v1/yojana/admin/documents/${rejectingDoc.id}/verify`, {
        status: 'REJECTED',
        rejectionReason: rejectionDocReason
      });
      setViewingDoc(null);
      setRejectingDoc(null);
      setRejectionDocReason('');
      await fetchApps();
    } catch (err) {
      console.error('Error rejecting document:', err);
    } finally {
      setSubmittingDocRejection(false);
    }
  };

  const handleConfirmAppRejection = async () => {
    if (!rejectingAppId) return;
    if (rejectionAppReason.trim().length < 10) {
      alert('Please provide a reason of at least 10 characters.');
      return;
    }

    setSubmittingAppRejection(true);
    try {
      await api.patch(`/api/v1/yojana/admin/applications/${rejectingAppId}/reject`, {
        rejectionReason: rejectionAppReason
      });
      setRejectingAppId(null);
      setRejectionAppReason('');
      await fetchApps();
    } catch (err) {
      console.error('Error rejecting application:', err);
    } finally {
      setSubmittingAppRejection(false);
    }
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

  const exportMisToCsv = () => {
    if (misStats.length === 0) return;
    const headers = [
      'Code', 'Name', 'Awaiting Review', 'DLC Queue', 
      'Approved', 'Milestone 1 Met', 'Completed', 'Rejected', 'Total Applications', 'Sanctioned Subsidy (INR)'
    ];
    const rows = misStats.map(item => [
      item.code,
      item.name,
      item.awaiting_review,
      item.dlc_queue,
      item.approved,
      item.milestone_1,
      item.completed,
      item.rejected,
      item.total,
      item.totalSubsidy
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `MatsyaMitra_MIS_Report_${misGroupBy}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Reset all cascading queue filters
  const resetAllFilters = () => {
    setSearchTerm('');
    setSelectedDistrict('');
    setSelectedBlock('');
    setSelectedPanchayat('');
    setSelectedStatus('');
    setSelectedYojana('');
    setPage(1);
  };

  return (
    <div className="flex flex-col gap-8 p-6 pb-24 max-w-6xl mx-auto w-full">

      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-glass-border/30 pb-5">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-teal-400 mb-1">
            Verification Controls
          </div>
          <h1 className="text-2xl font-bold text-ink-primary">Scheme Applications Portal</h1>
          <p className="text-xs text-ink-muted mt-1">
            Perform administrative audits, verify farmer documents, and review aggregate regional processing metrics.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-canvas-950/60 p-1.5 rounded-xl border border-glass-border">
          <button
            onClick={() => setActiveTab('queue')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'queue'
                ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                : 'text-ink-muted hover:text-ink-secondary border border-transparent'
            }`}
          >
            <ListChecks className="h-3.5 w-3.5" />
            Operational Queue
          </button>
          <button
            onClick={() => setActiveTab('mis')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'mis'
                ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                : 'text-ink-muted hover:text-ink-secondary border border-transparent'
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            MIS Dashboard
          </button>
        </div>
      </div>

      {activeTab === 'queue' ? (
        /* ════════════════════════════════════════════════════════════
            OPERATIONAL QUEUE TAB
        ════════════════════════════════════════════════════════════ */
        <div className="flex flex-col gap-6">

          {/* Filtering controls toolbar */}
          <GlassCard className="p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2 text-xs font-bold text-ink-muted uppercase tracking-wider">
              <Filter className="h-3.5 w-3.5" />
              Dynamic Query Filters
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Text Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search name / APP-id..."
                  value={searchTerm}
                  onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
                  className="w-full text-xs p-2.5 pl-8 rounded-xl bg-canvas-950/50 border border-glass-border text-ink-primary focus:outline-none focus:border-teal-500/50 placeholder-ink-muted"
                />
                <Search className="absolute left-2.5 top-3 h-3.5 w-3.5 text-ink-muted" />
              </div>

              {/* Yojana Type */}
              <select
                value={selectedYojana}
                onChange={e => { setSelectedYojana(e.target.value); setPage(1); }}
                className="text-xs p-2.5 rounded-xl bg-canvas-950/50 border border-glass-border text-ink-primary focus:outline-none focus:border-teal-500/50"
              >
                <option value="">All Yojanas</option>
                {schemes.map(s => <option key={s.code} value={s.code}>{s.code}</option>)}
              </select>

              {/* Status */}
              <select
                value={selectedStatus}
                onChange={e => { setSelectedStatus(e.target.value); setPage(1); }}
                className="text-xs p-2.5 rounded-xl bg-canvas-950/50 border border-glass-border text-ink-primary focus:outline-none focus:border-teal-500/50"
              >
                <option value="">All Statuses</option>
                {Object.keys(STATUS_META).map(k => <option key={k} value={k}>{STATUS_META[k].label}</option>)}
              </select>

              {/* District (Cascading Parent) */}
              <select
                value={selectedDistrict}
                onChange={e => { setSelectedDistrict(e.target.value); setPage(1); }}
                className="text-xs p-2.5 rounded-xl bg-canvas-950/50 border border-glass-border text-ink-primary focus:outline-none focus:border-teal-500/50"
              >
                <option value="">All Districts</option>
                {districts.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}
              </select>

              {/* Block (Cascading Child) */}
              <select
                disabled={!selectedDistrict}
                value={selectedBlock}
                onChange={e => { setSelectedBlock(e.target.value); setPage(1); }}
                className="text-xs p-2.5 rounded-xl bg-canvas-950/50 border border-glass-border text-ink-primary focus:outline-none focus:border-teal-500/50 disabled:opacity-40 disabled:pointer-events-none"
              >
                <option value="">All Blocks</option>
                {blocks.map(b => <option key={b.code} value={b.code}>{b.name}</option>)}
              </select>

              {/* Panchayat (Cascading Child) */}
              <select
                disabled={!selectedBlock}
                value={selectedPanchayat}
                onChange={e => { setSelectedPanchayat(e.target.value); setPage(1); }}
                className="text-xs p-2.5 rounded-xl bg-canvas-950/50 border border-glass-border text-ink-primary focus:outline-none focus:border-teal-500/50 disabled:opacity-40 disabled:pointer-events-none"
              >
                <option value="">All Panchayats</option>
                {panchayats.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
              </select>
            </div>

            <div className="flex justify-end border-t border-glass-border/20 pt-3">
              <button
                onClick={resetAllFilters}
                className="text-[10px] font-bold text-teal-400 hover:text-teal-300 transition-colors uppercase tracking-wider"
              >
                Clear Query Filters
              </button>
            </div>
          </GlassCard>

          {/* Operational application list */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-ink-muted">
              <Loader2 className="h-6 w-6 text-teal-400 animate-spin" />
              <span className="text-xs">Querying database...</span>
            </div>
          ) : applications.length === 0 ? (
            <GlassCard className="p-16 text-center">
              <div className="text-ink-muted text-xs">No records found matching current query parameters.</div>
            </GlassCard>
          ) : (
            <div className="flex flex-col gap-2">
              {applications.map(app => {
                const isExpanded = expandedApp === app.id;
                const isProcessing = processingId === app.id;
                const allDocsVerified = app.documents && app.documents.length > 0 && app.documents.every(d => d.status === 'verified');
                const isDone = app.status === 'Completed' || app.status === 'Rejected';

                return (
                  <div
                    key={app.id}
                    className={`rounded-xl border overflow-hidden transition-all duration-200 ${
                      isExpanded
                        ? 'border-teal-500/40 shadow-tileSelected ring-1 ring-teal-500/30'
                        : 'border-glass-border/60 shadow-tile hover:shadow-tileHover hover:border-glass-border'
                    }`}
                  >
                    {/* Collapsed Row */}
                    <button
                      className={`w-full text-left px-5 py-4 flex items-center gap-4 transition-colors ${
                        isExpanded ? 'bg-glass' : 'bg-canvas-900/50 hover:bg-glass-subtle'
                      }`}
                      onClick={() => setExpandedApp(isExpanded ? null : app.id)}
                    >
                      <div className="font-mono text-[10px] font-bold text-ink-primary w-36 flex-shrink-0">
                        {app.appNum}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-ink-primary">{app.farmerName}</div>
                        <div className="text-[10px] text-ink-muted mt-0.5 truncate">
                          {app.yojanaName} · {app.district}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <StatusBadge status={app.status} />
                        <span className="text-[10px] text-ink-muted hidden sm:block">{app.caste}</span>
                        {isExpanded
                          ? <ChevronUp className="h-4 w-4 text-ink-muted" />
                          : <ChevronDown className="h-4 w-4 text-ink-muted" />
                        }
                      </div>
                    </button>

                    {/* Expanded Detail Panel */}
                    {isExpanded && (
                      <div className="border-t border-glass-border/60 bg-canvas-950/60 p-6 animate-fadeIn">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                          {/* Profile */}
                          <div className="space-y-5">
                            <div>
                              <div className="text-[9px] font-bold text-ink-muted uppercase tracking-widest mb-3">
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

                            {app.projectDescription && (
                              <div className="p-3.5 rounded-xl border border-glass-border bg-canvas-950/20 text-xs">
                                <div className="font-bold text-ink-secondary mb-1">Project Proposal Note</div>
                                <div className="text-ink-muted leading-relaxed italic">"{app.projectDescription}"</div>
                              </div>
                            )}

                            {app.applicationRejectionReason && app.status === 'Rejected' && (
                              <div className="p-3.5 rounded-xl border border-red-500/20 bg-red-500/5 text-xs">
                                <div className="font-bold text-red-400 mb-1">Official Rejection Reason</div>
                                <div className="text-red-300/80 leading-relaxed">"{app.applicationRejectionReason}"</div>
                              </div>
                            )}

                            <div
                              className={`p-3.5 rounded-xl border ${
                                app.gpsMatch ? 'bg-teal-500/5 border-teal-500/20' : 'bg-rose-500/5 border-rose-500/20'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 text-xs font-bold text-ink-primary mb-1.5">
                                <MapPin className="h-3.5 w-3.5 text-teal-400" />
                                GPS Geofence Check
                              </div>
                              <div className="text-[10px] font-mono text-ink-muted mb-2">{app.gpsCoords}</div>
                              <div className={`flex items-center gap-1.5 text-xs font-bold ${app.gpsMatch ? 'text-teal-400' : 'text-rose-400'}`}>
                                {app.gpsMatch
                                  ? <><CheckCircle className="h-3.5 w-3.5" /> Passed — pond within eligible district</>
                                  : <><XCircle className="h-3.5 w-3.5" /> Failed — outside eligible boundary</>
                                }
                              </div>
                            </div>
                          </div>

                          {/* Documents */}
                          <div>
                            <div className="text-[9px] font-bold text-ink-muted uppercase tracking-widest mb-3">
                              Document Verification
                            </div>
                            <div className="flex flex-col gap-2">
                              {app.documents && app.documents.length > 0 ? (
                                app.documents.map((doc) => (
                                  <div
                                    key={doc.id}
                                    className="flex flex-col p-3.5 rounded-xl border border-glass-border/40 bg-canvas-950/30 gap-2.5"
                                  >
                                    <div className="flex items-center justify-between min-w-0">
                                      <div className="flex items-center gap-2 text-xs text-ink-secondary min-w-0">
                                        <FileText className="h-3.5 w-3.5 text-ink-muted flex-shrink-0" />
                                        <span className="font-semibold truncate">{doc.name}</span>
                                      </div>
                                      <div className="flex-shrink-0 ml-2">
                                        {doc.status === 'verified' ? (
                                          <span className="flex items-center gap-1 text-[10px] font-bold text-teal-400">
                                            <CheckCircle className="h-3 w-3" /> Verified
                                          </span>
                                        ) : doc.status === 'rejected' ? (
                                          <span className="flex items-center gap-1 text-[10px] font-bold text-rose-400">
                                            <XCircle className="h-3 w-3" /> Rejected
                                          </span>
                                        ) : (
                                          <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400">
                                            <Clock className="h-3 w-3" /> Pending Review
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    <div className="flex justify-between items-center text-[10px] pt-1.5 border-t border-glass-border/20">
                                      <span className="text-ink-muted font-mono truncate max-w-[140px]">{doc.fileName}</span>
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => handleOpenDocViewer(doc)}
                                          className="font-bold text-teal-400 hover:text-teal-300 transition-colors"
                                        >
                                          [View & Audit ▸]
                                        </button>
                                        {doc.status === 'pending' && (
                                          <>
                                            <button
                                              onClick={() => handleVerifyDocDirectly(doc.id)}
                                              className="font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
                                            >
                                              [✓ Verify]
                                            </button>
                                            <button
                                              onClick={() => setRejectingDoc(doc)}
                                              className="font-bold text-rose-400 hover:text-rose-300 transition-colors"
                                            >
                                              [✗ Reject]
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </div>

                                    {doc.status === 'rejected' && doc.rejectionReason && (
                                      <div className="mt-1 p-2 rounded bg-red-500/10 border border-red-500/15 text-[10px] text-red-300 leading-normal">
                                        <span className="font-bold">Reason:</span> "{doc.rejectionReason}"
                                      </div>
                                    )}
                                  </div>
                                ))
                              ) : (
                                <div className="text-xs text-ink-muted p-4 border border-dashed border-glass-border/40 rounded-xl text-center">
                                  No uploaded documents found.
                                </div>
                              )}
                            </div>

                            {!allDocsVerified && app.status === 'Awaiting Review' && (
                              <div className="mt-4 flex items-start gap-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-amber-300 leading-relaxed">
                                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                                All documents must be verified and marked as "Verified" before sending to DLC Queue.
                              </div>
                            )}
                          </div>

                          {/* Action controls */}
                          <div>
                            <div className="text-[9px] font-bold text-ink-muted uppercase tracking-widest mb-3">
                              Officer Actions
                            </div>
                            <div className="flex flex-col gap-2.5">
                              {app.status === 'Awaiting Review' && (
                                <button
                                  disabled={!allDocsVerified || isProcessing}
                                  onClick={() => handleStatusChange(app.id, 'DLC_QUEUE')}
                                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-semibold bg-sky-500/10 text-sky-300 border border-sky-500/30 hover:bg-sky-500 hover:text-slate-950 hover:border-sky-400 disabled:opacity-40 disabled:pointer-events-none transition-all active:scale-95 duration-200"
                                >
                                  {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
                                  Send to DLC Queue
                                </button>
                              )}

                              {app.status === 'DLC Queue' && (
                                <button
                                  disabled={isProcessing}
                                  onClick={() => handleStatusChange(app.id, 'APPROVED')}
                                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-semibold bg-violet-500/10 text-violet-300 border border-violet-500/30 hover:bg-violet-500 hover:text-slate-950 hover:border-violet-400 disabled:opacity-40 disabled:pointer-events-none transition-all active:scale-95 duration-200"
                                >
                                  {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                                  DLC — Approve Application
                                </button>
                              )}

                              {app.status === 'Approved' && (
                                <button
                                  disabled={isProcessing}
                                  onClick={() => handleStatusChange(app.id, 'MILESTONE_1_MET')}
                                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/30 hover:bg-rose-500 hover:text-slate-950 hover:border-rose-400 disabled:opacity-40 disabled:pointer-events-none transition-all active:scale-95 duration-200"
                                >
                                  {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />}
                                  Verify & Release Milestone 1
                                </button>
                              )}

                              {app.status === 'Milestone 1 Met' && (
                                <button
                                  disabled={isProcessing}
                                  onClick={() => handleStatusChange(app.id, 'MILESTONE_2_MET')}
                                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-semibold bg-teal-500/10 text-teal-300 border border-teal-500/30 hover:bg-teal-500 hover:text-slate-950 hover:border-teal-400 disabled:opacity-40 disabled:pointer-events-none transition-all active:scale-95 duration-200"
                                >
                                  {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                                  Verify & Release Final Payment
                                </button>
                              )}

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
                                  {notifSent.has(app.id) ? 'Notification Sent ✓' : 'Notify Farmer of Status'}
                                </button>
                              )}

                              {!isDone && (
                                <button
                                  disabled={isProcessing}
                                  onClick={() => setRejectingAppId(app.id)}
                                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-semibold bg-red-500/5 text-red-400 border border-red-500/20 hover:bg-red-500/10 disabled:opacity-40 disabled:pointer-events-none transition-all"
                                >
                                  {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                                  Reject Application
                                </button>
                              )}

                              {app.status === 'Completed' && (
                                <div className="text-center py-3 text-xs text-teal-400 font-semibold flex items-center justify-center gap-2">
                                  <CheckCircle className="h-4 w-4" />
                                  Full subsidy disbursed via DBT
                                </div>
                              )}
                              {app.status === 'Rejected' && (
                                <div className="text-center py-3 text-xs text-red-400 font-semibold flex items-center justify-center gap-2">
                                  <XCircle className="h-4 w-4" />
                                  Application rejected
                                </div>
                              )}
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

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center bg-canvas-900/50 p-4 rounded-xl border border-glass-border">
              <span className="text-xs text-ink-muted">
                Showing {applications.length} of {totalCount} applications
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-canvas-950 text-ink-secondary border border-glass-border disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="flex items-center text-xs font-mono text-ink-primary px-2">
                  Page {page} of {totalPages}
                </span>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-canvas-950 text-ink-secondary border border-glass-border disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ════════════════════════════════════════════════════════════
            MIS PERFORMANCE ANALYTICS TAB
        ════════════════════════════════════════════════════════════ */
        <div className="flex flex-col gap-6 animate-fadeIn">

          {/* MIS Quick stats block */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Applications', value: misStats.reduce((sum, s) => sum + s.total, 0), icon: FileText, color: 'text-teal-400 bg-teal-500/10' },
              { label: 'Pending Review', value: misStats.reduce((sum, s) => sum + s.awaiting_review, 0), icon: Clock, color: 'text-amber-400 bg-amber-500/10' },
              { label: 'Approved & Active', value: misStats.reduce((sum, s) => sum + s.approved + s.milestone_1 + s.completed, 0), icon: CheckCircle, color: 'text-emerald-400 bg-emerald-500/10' },
              { label: 'Total Sanctioned Subsidy', value: `₹${(misStats.reduce((sum, s) => sum + s.totalSubsidy, 0) / 10000000).toFixed(2)} Cr`, icon: Coins, color: 'text-violet-400 bg-violet-500/10' },
            ].map(card => {
              const Icon = card.icon;
              return (
                <GlassCard key={card.label} className="p-5 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">{card.label}</div>
                    <div className="text-xl font-bold font-mono text-ink-primary mt-1.5">{card.value}</div>
                  </div>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </GlassCard>
              );
            })}
          </div>

          {/* Group-by selectors & geography filter strip */}
          <GlassCard className="p-5 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            {/* Group-by level */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">Aggregation Geographical Level</label>
              <div className="flex bg-canvas-950/60 p-1 rounded-lg border border-glass-border">
                {[
                  { key: 'district', label: 'By District' },
                  { key: 'block', label: 'By Block' },
                  { key: 'panchayat', label: 'By Panchayat' },
                ].map(p => (
                  <button
                    key={p.key}
                    onClick={() => {
                      setMisGroupBy(p.key as any);
                      if (p.key === 'district') {
                        setMisDistrictFilter('');
                        setMisBlockFilter('');
                      } else if (p.key === 'block') {
                        setMisBlockFilter('');
                      }
                    }}
                    className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
                      misGroupBy === p.key
                        ? 'bg-teal-500/20 text-teal-400'
                        : 'text-ink-muted hover:text-ink-secondary'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Parent Filters in MIS */}
            <div className="flex flex-wrap gap-3">
              {misGroupBy !== 'district' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold text-ink-muted uppercase tracking-wider">Filter District</label>
                  <select
                    value={misDistrictFilter}
                    onChange={e => {
                      setMisDistrictFilter(e.target.value);
                      setMisBlockFilter('');
                    }}
                    className="text-xs p-2 rounded-xl bg-canvas-950/50 border border-glass-border text-ink-primary focus:outline-none focus:border-teal-500/50 min-w-[140px]"
                  >
                    <option value="">All Districts</option>
                    {districts.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}
                  </select>
                </div>
              )}

              {misGroupBy === 'panchayat' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold text-ink-muted uppercase tracking-wider">Filter Block</label>
                  <select
                    disabled={!misDistrictFilter}
                    value={misBlockFilter}
                    onChange={e => setMisBlockFilter(e.target.value)}
                    className="text-xs p-2 rounded-xl bg-canvas-950/50 border border-glass-border text-ink-primary focus:outline-none focus:border-teal-500/50 min-w-[140px] disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <option value="">All Blocks</option>
                    {blocks.map(b => <option key={b.code} value={b.code}>{b.name}</option>)}
                  </select>
                </div>
              )}

              {/* Export Button */}
              <div className="flex items-end self-stretch pt-5 md:pt-0">
                <ExportButton onClick={exportMisToCsv} label="Export CSV Report" />
              </div>
            </div>
          </GlassCard>

          {/* MIS Matrix Data Table */}
          {misLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-ink-muted">
              <Loader2 className="h-6 w-6 text-teal-400 animate-spin" />
              <span className="text-xs">Aggregating records...</span>
            </div>
          ) : misStats.length === 0 ? (
            <GlassCard className="p-16 text-center text-xs text-ink-muted">
              No aggregated statistics found matching parameters.
            </GlassCard>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-glass-border bg-canvas-900/50">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-canvas-950/80 border-b border-glass-border text-ink-secondary font-bold uppercase tracking-wider">
                    <th className="p-4 font-mono text-[9px]">LGD Code</th>
                    <th className="p-4">Geographic Area</th>
                    <th className="p-4 text-center">Review</th>
                    <th className="p-4 text-center">DLC Queue</th>
                    <th className="p-4 text-center">Approved</th>
                    <th className="p-4 text-center">Milestone 1</th>
                    <th className="p-4 text-center">Completed</th>
                    <th className="p-4 text-center">Rejected</th>
                    <th className="p-4 text-center font-bold">Total</th>
                    <th className="p-4 text-right">Subsidy Released</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-glass-border/30 text-ink-primary">
                  {misStats.map(row => (
                    <tr key={row.code} className="hover:bg-glass-subtle/50 transition-colors">
                      <td className="p-4 font-mono text-[10px] text-ink-muted">{row.code}</td>
                      <td className="p-4 font-bold">{row.name}</td>
                      <td className="p-4 text-center font-mono">{row.awaiting_review}</td>
                      <td className="p-4 text-center font-mono">{row.dlc_queue}</td>
                      <td className="p-4 text-center font-mono">{row.approved}</td>
                      <td className="p-4 text-center font-mono">{row.milestone_1}</td>
                      <td className="p-4 text-center font-mono">{row.completed}</td>
                      <td className="p-4 text-center font-mono text-red-400">{row.rejected}</td>
                      <td className="p-4 text-center font-mono font-bold bg-canvas-950/30">{row.total}</td>
                      <td className="p-4 text-right font-mono font-bold text-teal-400">
                        ₹{row.totalSubsidy.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          MODALS — PDF PREVIEWER & AUDIT FORMS
      ════════════════════════════════════════════════════════════ */}

      {/* PDF / Image Viewer Modal */}
      {viewingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-canvas-950/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-4xl h-[85vh] rounded-2xl border border-glass-border/60 bg-canvas-900 flex flex-col overflow-hidden shadow-popup">
            
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-glass-border bg-glass">
              <div>
                <h3 className="text-base font-bold text-ink-primary">{viewingDoc.name}</h3>
                <p className="text-xs text-ink-muted mt-0.5">Filename: {viewingDoc.fileName}</p>
              </div>
              <button
                onClick={() => setViewingDoc(null)}
                className="p-1.5 rounded-lg bg-canvas-800 border border-glass-border text-ink-muted hover:text-ink-secondary"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            {/* Document Iframe Viewer */}
            <div className="flex-1 bg-canvas-950 flex items-center justify-center relative">
              {fetchingDocUrl ? (
                <div className="flex flex-col items-center gap-3 text-ink-muted text-xs">
                  <Loader2 className="h-6 w-6 text-teal-400 animate-spin" />
                  Generating secure signed access token...
                </div>
              ) : viewingDocUrl ? (
                <iframe
                  src={viewingDocUrl}
                  className="w-full h-full border-0"
                  title="Document Preview"
                  sandbox="allow-scripts allow-same-origin"
                />
              ) : (
                <div className="text-xs text-red-400 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4" />
                  Failed to load secure document source link.
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="p-4 border-t border-glass-border bg-glass flex justify-between items-center">
              <span className="text-[10px] text-ink-muted">Aadhaar-seeded documents are audited under DBT guidelines.</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewingDoc(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-canvas-800 text-ink-muted hover:text-ink-secondary transition-colors"
                >
                  Close Viewer
                </button>
                {viewingDoc.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleVerifyDocDirectly(viewingDoc.id)}
                      className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors"
                    >
                      ✓ Verify & Pass
                    </button>
                    <button
                      onClick={() => setRejectingDoc(viewingDoc)}
                      className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-500/10 text-rose-300 border border-rose-500/30 hover:bg-rose-500/20 transition-colors"
                    >
                      ✗ Reject Document
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Rejection Modal */}
      {rejectingDoc && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-canvas-950/90 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-canvas-900 p-6 flex flex-col gap-4 shadow-popup">
            <h3 className="text-base font-bold text-ink-primary flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              Reject Document: {rejectingDoc.name}
            </h3>
            <p className="text-xs text-ink-secondary leading-relaxed">
              Please provide a detailed reason explaining why this document is rejected. The farmer will see this reason in their app and must re-upload a corrected file.
            </p>

            <div>
              <label className="text-[9px] font-bold text-ink-muted uppercase tracking-wider block mb-1.5">Rejection Reason (Required, min 10 chars)</label>
              <textarea
                value={rejectionDocReason}
                onChange={e => setRejectionDocReason(e.target.value)}
                placeholder="e.g. Scanned image is blurry. Please upload a clear PDF of the Caste Certificate."
                rows={4}
                className="w-full rounded-xl bg-canvas-950 border border-glass-border p-3 text-xs text-ink-primary placeholder-ink-muted focus:outline-none focus:border-red-500/50"
              />
            </div>

            <div className="flex justify-end gap-2 mt-2">
              <button
                disabled={submittingDocRejection}
                onClick={() => {
                  setRejectingDoc(null);
                  setRejectionDocReason('');
                }}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-canvas-800 text-ink-muted hover:text-ink-secondary disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                disabled={submittingDocRejection || rejectionDocReason.trim().length < 10}
                onClick={handleConfirmDocRejection}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-red-500/10 text-red-300 border border-red-500/30 hover:bg-red-500/20 disabled:opacity-30 flex items-center gap-1.5"
              >
                {submittingDocRejection && <Loader2 className="h-3 w-3 animate-spin" />}
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Application Rejection Modal */}
      {rejectingAppId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-canvas-950/90 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-canvas-900 p-6 flex flex-col gap-4 shadow-popup">
            <h3 className="text-base font-bold text-ink-primary flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              Reject Full Application
            </h3>
            <p className="text-xs text-ink-secondary leading-relaxed">
              This will permanently reject the entire application. The farmer will be notified in-app with the reason you specify below, and the application status will change to "Rejected".
            </p>

            <div>
              <label className="text-[9px] font-bold text-ink-muted uppercase tracking-wider block mb-1.5">Official Rejection Reason (Required, min 10 chars)</label>
              <textarea
                value={rejectionAppReason}
                onChange={e => setRejectionAppReason(e.target.value)}
                placeholder="e.g. Land deed coordinates do not match the pond surveyed. Application is rejected."
                rows={4}
                className="w-full rounded-xl bg-canvas-950 border border-glass-border p-3 text-xs text-ink-primary placeholder-ink-muted focus:outline-none focus:border-red-500/50"
              />
            </div>

            <div className="flex justify-end gap-2 mt-2">
              <button
                disabled={submittingAppRejection}
                onClick={() => {
                  setRejectingAppId(null);
                  setRejectionAppReason('');
                }}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-canvas-800 text-ink-muted hover:text-ink-secondary disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                disabled={submittingAppRejection || rejectionAppReason.trim().length < 10}
                onClick={handleConfirmAppRejection}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-red-500/10 text-red-300 border border-red-500/30 hover:bg-red-500/20 disabled:opacity-30 flex items-center gap-1.5"
              >
                {submittingAppRejection && <Loader2 className="h-3 w-3 animate-spin" />}
                Reject Application
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
