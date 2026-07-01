'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  CheckCircle,
  ArrowUpRight,
  DollarSign,
  Briefcase,
  Layers,
  Percent,
  Loader2,
  X,
  PieChart,
  Users,
  BarChart2,
  Download,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { api } from '@/lib/api';
import { ApiEnvelope } from '@/lib/types';

// Types
interface DbtTransaction {
  id: string;
  utr: string;
  farmerName: string;
  yojana: string;
  bankSeeding: 'Seeded & Verified' | 'Processing';
  amount: string;
  status: 'Success' | 'Processing' | 'Failed';
  date: string;
}

interface StatsData {
  totalBudget: string;
  totalDisbursed: string;
  pendingDlc: string;
  utilizationRate: string;
  transactions: DbtTransaction[];
}

interface Application {
  id: string;
  farmerName: string;
  caste: 'General' | 'EBC' | 'SC' | 'ST';
}

const BASE_TARGETS = [
  { label: 'General Caste Allocation (₹12.0 Cr)', current: 9.8, target: 12.0, caste: 'General' },
  { label: 'EBC Caste Allocation (₹15.0 Cr)', current: 11.2, target: 15.0, caste: 'EBC' },
  { label: 'SC Caste Allocation (₹10.5 Cr)', current: 8.5, target: 10.5, caste: 'SC' },
  { label: 'ST Caste Allocation (₹5.0 Cr)', current: 3.2, target: 5.0, caste: 'ST' },
];

// ── Static breakdown data for modals ────────────────────────────
const SCHEME_BREAKDOWN = [
  { scheme: 'TMVSY', district: 'Patna',      allocated: '₹8.2 Cr',  disbursed: '₹5.1 Cr' },
  { scheme: 'TMVSY', district: 'Gaya',       allocated: '₹6.5 Cr',  disbursed: '₹4.2 Cr' },
  { scheme: 'TMVSY', district: 'Madhubani',  allocated: '₹7.1 Cr',  disbursed: '₹4.8 Cr' },
  { scheme: 'JKSY',  district: 'Patna',      allocated: '₹4.0 Cr',  disbursed: '₹2.9 Cr' },
  { scheme: 'JKSY',  district: 'Muzaffarpur',allocated: '₹3.5 Cr',  disbursed: '₹2.1 Cr' },
  { scheme: 'MPVY',  district: 'Darbhanga',  allocated: '₹5.2 Cr',  disbursed: '₹3.4 Cr' },
  { scheme: 'MPVY',  district: 'Bhagalpur',  allocated: '₹4.1 Cr',  disbursed: '₹2.6 Cr' },
];

const CASTE_BREAKDOWN = [
  { caste: 'General', beneficiaries: 320, disbursed: '₹9.8 Cr',  target: '₹12.0 Cr', pct: 81 },
  { caste: 'EBC',     beneficiaries: 480, disbursed: '₹11.2 Cr', target: '₹15.0 Cr', pct: 74 },
  { caste: 'SC',      beneficiaries: 290, disbursed: '₹8.5 Cr',  target: '₹10.5 Cr', pct: 80 },
  { caste: 'ST',      beneficiaries: 95,  disbursed: '₹3.2 Cr',  target: '₹5.0 Cr',  pct: 64 },
];

const PENDING_DLC_LIST = [
  { appNum: 'TMVSY/24-25/001', farmer: 'Lallan Yadav',         district: 'Madhubani', scheme: 'TMVSY', amount: '₹7.07L', waitDays: 14 },
  { appNum: 'JKSY/24-25/008',  farmer: 'Devendra Kumar Ojha',  district: 'Gaya',      scheme: 'JKSY',  amount: '₹4.34L', waitDays: 8  },
  { appNum: 'MPVY/24-25/012',  farmer: 'Binod Kumar Sah',      district: 'Muzaffarpur',scheme: 'MPVY', amount: '₹7.87L', waitDays: 21 },
  { appNum: 'TMVSY/24-25/019', farmer: 'Shyam Kishore Mandal', district: 'Bhagalpur', scheme: 'TMVSY', amount: '₹7.07L', waitDays: 3  },
];

type ModalType = 'budget' | 'disbursed' | 'dlc' | 'rate' | null;

// ── Breakdown Modal ──────────────────────────────────────────────
function BreakdownModal({ type, onClose, stats, apps, targets }: {
  type: ModalType;
  onClose: () => void;
  stats: StatsData | null;
  apps: Application[];
  targets: any[];
}) {
  if (!type) return null;

  const titles: Record<Exclude<ModalType, null>, string> = {
    budget:    'Total Budget Allocated — Scheme & District Breakdown',
    disbursed: 'Total DBT Disbursed — Social Category Breakdown',
    dlc:       'Pending DLC Approvals — Application Queue',
    rate:      'Budget Utilization — Allocated vs. Disbursed',
  };

  const handleExportModalData = () => {
    const escapeCSV = (val: any): string => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    let headers: string[] = [];
    let rows: string[][] = [];
    let fileName = '';

    if (type === 'budget') {
      fileName = 'matsyamitra_budget_allocated';
      headers = ['Scheme', 'District', 'Allocated Budget', 'Disbursed Budget'];
      rows = SCHEME_BREAKDOWN.map(row => [
        row.scheme,
        row.district,
        row.allocated,
        row.disbursed
      ].map(escapeCSV));
      rows.push(['Grand Total', 'All Districts', stats?.totalBudget || '₹38.6 Cr', stats?.totalDisbursed || '₹27.1 Cr'].map(escapeCSV));
    } else if (type === 'disbursed') {
      fileName = 'matsyamitra_dbt_disbursed_social';
      headers = ['Social Category', 'Beneficiaries Count', 'Disbursed (Cr)', 'Target Budget (Cr)', 'Utilization Rate'];
      rows = (targets || []).map(row => {
        const matchingCaste = CASTE_BREAKDOWN.find(c => c.caste === row.caste);
        const beneficiaries = matchingCaste ? matchingCaste.beneficiaries : 0;
        return [
          row.caste,
          String(beneficiaries),
          `₹${row.current.toFixed(4)} Cr`,
          `₹${row.target.toFixed(1)} Cr`,
          `${row.pct}%`
        ];
      }).map(r => r.map(escapeCSV));
    } else if (type === 'dlc') {
      fileName = 'matsyamitra_pending_dlc_approvals';
      headers = ['Application Number', 'Farmer Name', 'District', 'Scheme', 'Amount', 'Waiting Days'];
      rows = PENDING_DLC_LIST.map(app => [
        app.appNum,
        app.farmer,
        app.district,
        app.scheme,
        app.amount,
        `${app.waitDays} days`
      ].map(escapeCSV));
    } else if (type === 'rate') {
      fileName = 'matsyamitra_budget_utilization_analysis';
      headers = ['Report Section', 'Key Metric / Dimension', 'Allocated', 'Disbursed / Current', 'Utilization Rate / Details'];
      
      rows.push(
        ['Overall Summary', 'Total Budget (FY 24-25)', stats?.totalBudget || '₹38.6 Cr', stats?.totalDisbursed || '₹27.1 Cr', stats?.utilizationRate || '70.2%'].map(escapeCSV),
        ['Overall Summary', 'Remaining Balance', '₹11.5 Cr', '-', 'To be disbursed for DLC queue / milestones'].map(escapeCSV),
        ['', '', '', '', ''].map(escapeCSV)
      );

      rows.push(['Social Category Breakdown', 'Category Name', 'Target Budget', 'Disbursed', 'Utilization Rate'].map(escapeCSV));
      (targets || []).forEach(row => {
        rows.push([
          'Social Category Breakdown',
          row.caste,
          `₹${row.target.toFixed(1)} Cr`,
          `₹${row.current.toFixed(4)} Cr`,
          `${row.pct}%`
        ].map(escapeCSV));
      });
      rows.push(['', '', '', '', ''].map(escapeCSV));

      rows.push(['Scheme & District Breakdown', 'Scheme - District', 'Allocated', 'Disbursed', 'Utilization Rate'].map(escapeCSV));
      SCHEME_BREAKDOWN.forEach(row => {
        const allocatedVal = parseFloat(row.allocated.replace(/[^0-9.]/g, '')) || 0;
        const disbursedVal = parseFloat(row.disbursed.replace(/[^0-9.]/g, '')) || 0;
        const pct = allocatedVal > 0 ? ((disbursedVal / allocatedVal) * 100).toFixed(1) + '%' : '0%';
        rows.push([
          'Scheme & District Breakdown',
          `${row.scheme} - ${row.district}`,
          row.allocated,
          row.disbursed,
          pct
        ].map(escapeCSV));
      });
    }

    const csvContent = [headers.map(escapeCSV), ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <GlassCard className="relative z-10 w-full max-w-2xl p-6 shadow-popup border-teal-500/30 max-h-[85vh] overflow-y-auto flex flex-col gap-5">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-glass-border/40 pb-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-400">Financial Detail</div>
            <h2 className="text-lg font-bold text-ink-primary mt-1">{titles[type]}</h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportModalData}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/20 transition-all text-xs font-semibold"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-glass border border-transparent hover:border-glass-border text-ink-secondary transition-all">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Budget breakdown */}
        {type === 'budget' && (
          <div className="space-y-3">
            <div className="text-xs text-ink-muted">Total allocated across all schemes and districts for FY 2024-25. All values in Crore Rupees (₹ Cr).</div>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="text-ink-muted font-bold text-[10px] uppercase tracking-wider border-b border-glass-border">
                  <th className="py-2 text-left">Scheme</th>
                  <th className="py-2 text-left">District</th>
                  <th className="py-2 text-right">Allocated</th>
                  <th className="py-2 text-right">Disbursed</th>
                </tr>
              </thead>
              <tbody>
                {SCHEME_BREAKDOWN.map((row, i) => (
                  <tr key={i} className="border-b border-glass-border/30 last:border-0 hover:bg-glass-subtle transition-colors">
                    <td className="py-2.5"><span className="font-mono text-[10px] font-bold bg-teal-500/10 text-teal-400 px-1.5 py-0.5 rounded">{row.scheme}</span></td>
                    <td className="py-2.5 text-ink-secondary">{row.district}</td>
                    <td className="py-2.5 text-right font-mono font-bold text-ink-primary">{row.allocated}</td>
                    <td className="py-2.5 text-right font-mono text-teal-400">{row.disbursed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-right text-xs font-bold text-ink-primary border-t border-glass-border pt-2 font-mono">
              Grand Total Allocated: <span className="text-teal-400">{stats?.totalBudget ?? '₹38.6 Cr'}</span>
            </div>
          </div>
        )}

        {/* DBT by caste */}
        {type === 'disbursed' && (
          <div className="space-y-4">
            <div className="text-xs text-ink-muted">Direct Benefit Transfers categorised by social reservation group (as per Bihar State Fisheries policy).</div>
            {(targets || []).map((row) => {
              const matchingCaste = CASTE_BREAKDOWN.find(c => c.caste === row.caste);
              const beneficiaries = matchingCaste ? matchingCaste.beneficiaries : 0;
              return (
                <div key={row.caste} className="p-4 rounded-xl border border-glass-border bg-canvas-950/40 space-y-2.5">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-sm font-bold text-ink-primary">{row.caste} Category</span>
                      <div className="text-[10px] text-ink-muted mt-0.5">{beneficiaries} beneficiaries</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm font-bold text-teal-400">₹{row.current.toFixed(2)} Cr</div>
                      <div className="text-[10px] text-ink-muted">of ₹{row.target.toFixed(1)} Cr</div>
                    </div>
                  </div>
                  <div className="w-full bg-glass-strong h-1.5 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-teal-500 to-sky-400 rounded-full" style={{ width: `${row.pct}%` }} />
                  </div>
                  <div className="text-right text-[10px] font-mono text-teal-400 font-bold">{row.pct}% utilized</div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pending DLC */}
        {type === 'dlc' && (
          <div className="space-y-3">
            <div className="text-xs text-ink-muted">Applications currently awaiting District Level Committee (DLC) review and approval before subsidy disbursement.</div>
            <div className="space-y-2.5">
              {PENDING_DLC_LIST.map((app) => (
                <div key={app.appNum} className="p-3 rounded-xl border border-glass-border bg-canvas-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="font-mono text-xs font-bold text-ink-primary">{app.appNum}</div>
                    <div className="text-xs text-ink-secondary mt-0.5">{app.farmer} · {app.district}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-teal-400">{app.amount}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      app.waitDays > 14 ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {app.waitDays}d waiting
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center text-xs font-semibold text-amber-400 bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
              {PENDING_DLC_LIST.length} applications pending DLC approval · Total value: ₹27.35L
            </div>
          </div>
        )}

        {/* Utilization rate */}
        {type === 'rate' && (
          <div className="space-y-4">
            <div className="text-xs text-ink-muted">Budget utilization compares approved allocated fund targets against actual disbursements processed through the DBT system.</div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-glass-border bg-canvas-950/40 text-center space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Total Allocated</div>
                <div className="text-2xl font-mono font-bold text-ink-primary">{stats?.totalBudget ?? '₹38.6 Cr'}</div>
                <div className="text-[10px] text-ink-muted">FY 2024-25 budget</div>
              </div>
              <div className="p-4 rounded-xl border border-glass-border bg-canvas-950/40 text-center space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Total Disbursed</div>
                <div className="text-2xl font-mono font-bold text-teal-400">{stats?.totalDisbursed ?? '₹27.1 Cr'}</div>
                <div className="text-[10px] text-ink-muted">via DBT transfers</div>
              </div>
            </div>
            <div className="p-4 rounded-xl border border-teal-500/20 bg-teal-500/5 space-y-3">
              <div className="flex justify-between items-baseline">
                <span className="text-sm font-bold text-ink-primary">Overall Utilization</span>
                <span className="text-2xl font-mono font-bold text-teal-400">{stats?.utilizationRate ?? '70.2%'}</span>
              </div>
              <div className="w-full bg-glass-strong h-3 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-teal-500 to-sky-400 rounded-full transition-all"
                  style={{ width: stats?.utilizationRate ?? '70.2%' }}
                />
              </div>
              <div className="text-xs text-ink-muted">Remaining unspent budget: ₹11.5 Cr — to be disbursed against pending DLC applications and upcoming milestones.</div>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
}

export default function SubsidiesPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  const loadStats = useCallback(async () => {
    try {
      const res = await api.get<ApiEnvelope<StatsData>>('/api/v1/yojana/admin/stats');
      if (res.success) {
        setStats(res.data);
      }

      const appsRes = await api.get<ApiEnvelope<Application[]>>('/api/v1/yojana/admin/applications');
      if (appsRes.success) {
        setApps(appsRes.data);
      }
    } catch (err) {
      console.error('Failed to load subsidies stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  // Calculate dynamic category utilization based on live database transactions
  const getDynamicTargets = () => {
    if (!stats) return BASE_TARGETS.map(t => ({ ...t, pct: Math.round((t.current / t.target) * 100) }));

    return BASE_TARGETS.map((target) => {
      let extraCr = 0;
      stats.transactions.forEach((txn) => {
        if (txn.bankSeeding === 'Seeded & Verified' && txn.status === 'Success') {
          // Look up farmer caste
          const matchedApp = apps.find((a) => a.farmerName === txn.farmerName);
          if (matchedApp && matchedApp.caste === target.caste) {
            const numericAmount = parseFloat(txn.amount.replace(/[^0-9.]/g, '')) || 0;
            extraCr += numericAmount / 10000000; // Convert to Crores
          }
        }
      });

      const current = target.current + extraCr;
      const pct = Math.min(100, parseFloat(((current / target.target) * 100).toFixed(1)));
      return {
        ...target,
        current: parseFloat(current.toFixed(4)),
        pct,
      };
    });
  };

  const handleExportDbtLogs = () => {
    if (!stats || !stats.transactions) return;

    const headers = [
      'UTR Reference Number',
      'Recipient Name',
      'Scheme / Yojana',
      'Bank Seeding Status',
      'Amount',
      'Transaction Status',
      'Date'
    ];

    const escapeCSV = (val: any): string => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = stats.transactions.map((txn) => [
      txn.utr,
      txn.farmerName,
      txn.yojana,
      txn.bankSeeding,
      txn.amount,
      txn.status,
      txn.date
    ].map(escapeCSV));

    const csvContent = [headers.map(escapeCSV), ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `matsyamitra_dbt_transaction_logs_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const targets = getDynamicTargets();

  return (
    <div className="flex flex-col gap-6 p-6 h-full overflow-y-auto">
      {/* Header */}
      <div>
        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-teal-400">
          Financial Ledger
        </div>
        <h1 className="text-2xl font-bold text-ink-primary">Subsidies & DBT Tracking</h1>
      </div>

      {loading || !stats ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-ink-secondary">
          <Loader2 className="h-8 w-8 text-teal-400 animate-spin" />
          <span className="text-sm font-semibold">Loading stats & transactions...</span>
        </div>
      ) : (
        <>
          {/* Financial Counters — clickable to open breakdown modals */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <GlassCard
              className="p-4 flex items-center gap-3 cursor-pointer hover:border-teal-500/40 hover:bg-teal-500/5 transition-all group"
              onClick={() => setActiveModal('budget')}
            >
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-teal-500/10 text-teal-400 group-hover:bg-teal-500/20 transition-colors">
                <DollarSign className="h-5 w-5" />
              </span>
              <div>
                <div className="text-2xl font-mono font-bold text-ink-primary">{stats.totalBudget}</div>
                <div className="text-xs text-ink-muted">Total Budget Allocated</div>
                <div className="text-[10px] text-teal-400 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">Click to see breakdown ↗</div>
              </div>
            </GlassCard>

            <GlassCard
              className="p-4 flex items-center gap-3 cursor-pointer hover:border-sky-500/40 hover:bg-sky-500/5 transition-all group"
              onClick={() => setActiveModal('disbursed')}
            >
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-sky-500/10 text-sky-400 group-hover:bg-sky-500/20 transition-colors">
                <CreditCard className="h-5 w-5" />
              </span>
              <div>
                <div className="text-2xl font-mono font-bold text-ink-primary">{stats.totalDisbursed}</div>
                <div className="text-xs text-ink-muted">Total DBT Disbursed</div>
                <div className="text-[10px] text-sky-400 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">Click to see breakdown ↗</div>
              </div>
            </GlassCard>

            <GlassCard
              className="p-4 flex items-center gap-3 cursor-pointer hover:border-indigo-500/40 hover:bg-indigo-500/5 transition-all group"
              onClick={() => setActiveModal('dlc')}
            >
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/20 transition-colors">
                <Layers className="h-5 w-5" />
              </span>
              <div>
                <div className="text-2xl font-mono font-bold text-ink-primary">{stats.pendingDlc}</div>
                <div className="text-xs text-ink-muted">Pending DLC Approvals</div>
                <div className="text-[10px] text-indigo-400 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">Click to view queue ↗</div>
              </div>
            </GlassCard>

            <GlassCard
              className="p-4 flex items-center gap-3 cursor-pointer hover:border-purple-500/40 hover:bg-purple-500/5 transition-all group"
              onClick={() => setActiveModal('rate')}
            >
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20 transition-colors">
                <Percent className="h-5 w-5" />
              </span>
              <div>
                <div className="text-2xl font-mono font-bold text-ink-primary">{stats.utilizationRate}</div>
                <div className="text-xs text-ink-muted">Budget Utilization Rate</div>
                <div className="text-[10px] text-purple-400 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">Click to see analysis ↗</div>
              </div>
            </GlassCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Budget and Capital Assets */}
            <div className="lg:col-span-1 flex flex-col gap-6">
              {/* Target Compliance progress */}
              <GlassCard className="p-5 flex flex-col gap-4">
                <h3 className="text-sm font-bold text-ink-primary flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-teal-400" />
                  Social Category Budget Utilization
                </h3>
                <div className="space-y-4 flex-1">
                  {targets.map((t) => (
                    <div key={t.label} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-ink-primary">{t.label}</span>
                        <span className="text-teal-400 font-mono">{t.pct}%</span>
                      </div>
                      <div className="w-full bg-glass-strong h-2 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-teal-500 to-sky-400 rounded-full"
                          style={{ width: `${t.pct}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-ink-muted font-mono">
                        <span>Current: ₹{t.current.toFixed(2)} Cr</span>
                        <span>Target: ₹{t.target.toFixed(1)} Cr</span>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>

              {/* Capital Asset Inventory & Depreciation Panel */}
              <GlassCard className="p-5 flex flex-col gap-4">
                <div>
                  <h3 className="text-sm font-bold text-ink-primary flex items-center gap-2">
                    <Layers className="h-4 w-4 text-teal-400" />
                    Statewide Capital Assets & Depreciation
                  </h3>
                  <span className="text-[10px] text-ink-muted mt-1 block">
                    Subsidized infrastructure tracking (straight-line depreciation).
                  </span>
                </div>

                <div className="space-y-3.5 text-xs flex-1">
                  <div className="p-3 rounded-lg border border-glass-border bg-canvas-950/40 text-center grid grid-cols-2 gap-2">
                    <div className="border-r border-glass-border/30">
                      <div className="text-[10px] text-ink-muted uppercase">Total Capitalized</div>
                      <div className="text-base font-mono font-bold text-ink-primary mt-0.5">₹2.63 Cr</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-ink-muted uppercase">Annual Depr.</div>
                      <div className="text-base font-mono font-bold text-rose-400 mt-0.5">₹54.7L</div>
                    </div>
                  </div>

                  <div className="space-y-2.5 max-h-[220px] overflow-y-auto font-mono text-[11px]">
                    <div className="flex justify-between font-bold text-[9px] text-ink-muted uppercase tracking-wider border-b border-glass-border pb-1">
                      <span>Subsidized Item (Qty)</span>
                      <span>Cap Value</span>
                      <span>Annual Depr.</span>
                    </div>

                    <div className="space-y-2">
                      <AssetRow name="Paddle Aerators (420)" cost="₹1.26 Cr" depr="₹22.68L" life="5y" />
                      <AssetRow name="Diesel Pumps (310)" cost="₹46.5L" depr="₹6.31L" life="7y" />
                      <AssetRow name="Biofloc Tanks (180)" cost="₹72.0L" depr="₹16.20L" life="4y" />
                      <AssetRow name="Drag & Gill Nets (640)" cost="₹19.2L" depr="₹9.60L" life="2y" />
                    </div>
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* Right: Direct Benefit Transfer Transaction Log */}
            <GlassCard className="p-5 lg:col-span-2 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-ink-primary flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-teal-400" />
                  Direct Benefit Transfer Logs
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportDbtLogs}
                    className="flex items-center gap-1.5 px-3 py-1.2 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/20 transition-all text-xs font-semibold"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Export CSV
                  </button>
                  <span className="text-[10px] font-mono font-bold bg-teal-500/10 text-teal-400 border border-teal-500/20 px-2 py-0.5 rounded">
                    Live Bank Feed
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
                {stats.transactions.length === 0 ? (
                  <div className="text-center text-xs text-ink-muted py-10 font-medium">
                    No transactions processed yet.
                  </div>
                ) : (
                  <table className="w-full text-sm text-left border-collapse">
                    <thead>
                      <tr className="text-ink-muted font-bold text-[10px] uppercase tracking-wider sticky top-0 z-10 border-b border-glass-border">
                        <th className="bg-canvas-950 py-3 text-left">UTR Reference</th>
                        <th className="bg-canvas-950 py-3 text-left">Recipient</th>
                        <th className="bg-canvas-950 py-3 text-left">Bank Seeding</th>
                        <th className="bg-canvas-950 py-3 text-right">Amount</th>
                        <th className="bg-canvas-950 py-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.transactions.map((txn) => (
                        <tr key={txn.id} className="border-b border-glass-border/30 last:border-0 hover:bg-glass-subtle transition-colors">
                          <td className="py-3 font-mono text-xs text-ink-secondary">
                            <div className="flex items-center gap-1">
                              {txn.utr}
                              <ArrowUpRight className="h-3 w-3 text-ink-muted" />
                            </div>
                            <div className="text-[10px] text-ink-muted">{txn.date}</div>
                          </td>
                          <td className="py-3">
                            <div className="font-semibold text-ink-primary">{txn.farmerName}</div>
                            <div className="text-[10px] text-ink-muted">{txn.yojana}</div>
                          </td>
                          <td className="py-3 text-xs">
                            <span className={`inline-flex items-center gap-1.5 font-semibold ${
                              txn.bankSeeding === 'Seeded & Verified'
                                ? 'text-teal-400'
                                : 'text-amber-400'
                            }`}>
                              <CheckCircle className="h-3.5 w-3.5" />
                              {txn.bankSeeding}
                            </span>
                          </td>
                          <td className="py-3 text-right font-mono font-bold text-ink-primary">
                            {txn.amount}
                          </td>
                          <td className="py-3 text-right">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              txn.status === 'Success'
                                ? 'bg-teal-500/10 text-teal-400 border border-teal-500/25'
                                : txn.status === 'Processing'
                                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/25'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/25'
                            }`}>
                              {txn.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </GlassCard>
          </div>
        </>
      )}

      {/* Breakdown Modal */}
      {activeModal && (
        <BreakdownModal
          type={activeModal}
          onClose={() => setActiveModal(null)}
          stats={stats}
          apps={apps}
          targets={targets}
        />
      )}
    </div>
  );
}

function AssetRow({ name, cost, depr, life }: { name: string; cost: string; depr: string; life: string }) {
  return (
    <div className="flex justify-between text-ink-secondary hover:text-ink-primary py-0.5 transition-colors">
      <div className="truncate w-40 flex items-center gap-1">
        <span className="text-[8px] text-teal-400">■</span>
        <span>{name}</span>
      </div>
      <span className="w-16 text-right font-medium">{cost}</span>
      <span className="w-20 text-right text-rose-400 font-bold">{depr} <span className="text-[8px] text-ink-muted font-normal">({life})</span></span>
    </div>
  );
}
