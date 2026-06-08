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

export default function SubsidiesPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

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
          {/* Financial Counters */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <GlassCard className="p-4 flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-teal-500/10 text-teal-400">
                <DollarSign className="h-5 w-5" />
              </span>
              <div>
                <div className="text-2xl font-mono font-bold text-ink-primary">{stats.totalBudget}</div>
                <div className="text-xs text-ink-muted">Total Budget Allocated</div>
              </div>
            </GlassCard>

            <GlassCard className="p-4 flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-sky-500/10 text-sky-400">
                <CreditCard className="h-5 w-5" />
              </span>
              <div>
                <div className="text-2xl font-mono font-bold text-ink-primary">{stats.totalDisbursed}</div>
                <div className="text-xs text-ink-muted">Total DBT Disbursed</div>
              </div>
            </GlassCard>

            <GlassCard className="p-4 flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-indigo-500/10 text-indigo-400">
                <Layers className="h-5 w-5" />
              </span>
              <div>
                <div className="text-2xl font-mono font-bold text-ink-primary">{stats.pendingDlc}</div>
                <div className="text-xs text-ink-muted">Pending DLC Approvals</div>
              </div>
            </GlassCard>

            <GlassCard className="p-4 flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-purple-500/10 text-purple-400">
                <Percent className="h-5 w-5" />
              </span>
              <div>
                <div className="text-2xl font-mono font-bold text-ink-primary">{stats.utilizationRate}</div>
                <div className="text-xs text-ink-muted">Budget Utilization Rate</div>
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
                <span className="text-[10px] font-mono font-bold bg-teal-500/10 text-teal-400 border border-teal-500/20 px-2 py-0.5 rounded">
                  Live Bank Feed
                </span>
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
