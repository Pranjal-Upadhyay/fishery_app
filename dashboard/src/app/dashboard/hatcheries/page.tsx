'use client';

import { useState } from 'react';
import {
  Waves,
  Calendar,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  QrCode,
  Package,
  Layers,
  Search,
  CheckCircle,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';

// Types
interface Batch {
  id: string;
  batchNumber: string;
  hatcheryName: string;
  species: string;
  variant: 'Jayanti Rohu' | 'Amrita Katla' | 'Standard';
  stage: 'Spawning' | 'Hatching' | 'Yolk Absorption' | 'Nursery' | 'Rearing' | 'Fingerling Ready';
  daysInStage: number;
  broodstockM: number;
  broodstockF: number;
  expectedReadyDate: string;
  estimatedCount: number;
}

interface Sale {
  id: string;
  txnRef: string;
  buyerName: string;
  buyerPhone: string;
  species: string;
  quantity: string;
  totalAmount: string;
  status: 'delivered' | 'pending';
  date: string;
}

// Mock Data
const BATCH_DATA: Batch[] = [
  { id: '1', batchNumber: 'HB-2026-001', hatcheryName: 'Patna Central Hatchery', species: 'Rohu', variant: 'Jayanti Rohu', stage: 'Rearing', daysInStage: 45, broodstockM: 50, broodstockF: 50, expectedReadyDate: '2026-06-25', estimatedCount: 250000 },
  { id: '2', batchNumber: 'HB-2026-002', hatcheryName: 'Mithila Matsya Hatchery', species: 'Katla', variant: 'Amrita Katla', stage: 'Fingerling Ready', daysInStage: 75, broodstockM: 40, broodstockF: 40, expectedReadyDate: '2026-06-08', estimatedCount: 180000 },
  { id: '3', batchNumber: 'HB-2026-003', hatcheryName: 'Gaya Fishery Seed', species: 'Rohu', variant: 'Standard', stage: 'Nursery', daysInStage: 15, broodstockM: 30, broodstockF: 30, expectedReadyDate: '2026-07-20', estimatedCount: 300000 },
  { id: '4', batchNumber: 'HB-2026-004', hatcheryName: 'Kosi River Hatchery', species: 'Mrigal', variant: 'Standard', stage: 'Hatching', daysInStage: 1, broodstockM: 20, broodstockF: 25, expectedReadyDate: '2026-09-02', estimatedCount: 500000 },
  { id: '5', batchNumber: 'HB-2026-005', hatcheryName: 'Patna Central Hatchery', species: 'Katla', variant: 'Amrita Katla', stage: 'Spawning', daysInStage: 0, broodstockM: 60, broodstockF: 60, expectedReadyDate: '2026-09-15', estimatedCount: 400000 },
];

const GAP_DATA = [
  { district: 'Patna', demand: '5.2M', supply: '3.5M', gap: '-1.7M', status: 'Deficit', severity: 'high' },
  { district: 'Gaya', demand: '4.0M', supply: '3.8M', gap: '-0.2M', status: 'Deficit', severity: 'low' },
  { district: 'Madhubani', demand: '6.5M', supply: '7.2M', gap: '+0.7M', status: 'Surplus', severity: 'ok' },
  { district: 'Muzaffarpur', demand: '4.8M', supply: '3.0M', gap: '-1.8M', status: 'Deficit', severity: 'high' },
  { district: 'Darbhanga', demand: '5.5M', supply: '5.2M', gap: '-0.3M', status: 'Deficit', severity: 'low' },
];

const SALES_DATA: Sale[] = [
  { id: '1', txnRef: 'TXN-17808-A4C', buyerName: 'Ramesh Prasad Singh', buyerPhone: '9845012345', species: 'Jayanti Rohu', quantity: '50,000 pcs', totalAmount: '₹60,000', status: 'delivered', date: '2026-06-05' },
  { id: '2', txnRef: 'TXN-17809-B2F', buyerName: 'Lallan Yadav', buyerPhone: '9547821690', species: 'Amrita Katla', quantity: '35,000 pcs', totalAmount: '₹49,000', status: 'pending', date: '2026-06-07' },
  { id: '3', txnRef: 'TXN-17810-C3X', buyerName: 'Binod Kumar Sah', buyerPhone: '9888123477', species: 'Standard Rohu', quantity: '20,000 pcs', totalAmount: '₹20,000', status: 'delivered', date: '2026-06-03' },
];

export default function HatcheriesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStage, setSelectedStage] = useState<string>('all');

  // Filter logic
  const filteredBatches = BATCH_DATA.filter((batch) => {
    const matchesSearch =
      batch.batchNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      batch.hatcheryName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      batch.species.toLowerCase().includes(searchTerm.toLowerCase()) ||
      batch.variant.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStage = selectedStage === 'all' || batch.stage === selectedStage;
    return matchesSearch && matchesStage;
  });

  return (
    <div className="flex flex-col gap-6 p-6 h-full overflow-y-auto">
      {/* Header */}
      <div>
        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-teal-400">
          Supply Chain
        </div>
        <h1 className="text-2xl font-bold text-ink-primary">Hatcheries Tracking</h1>
      </div>

      {/* Overview Bento Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassCard className="p-4 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-teal-500/10 text-teal-400">
            <Waves className="h-5 w-5" />
          </span>
          <div>
            <div className="text-2xl font-mono font-bold text-ink-primary">12</div>
            <div className="text-xs text-ink-muted">Active Hatcheries</div>
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-sky-500/10 text-sky-400">
            <Layers className="h-5 w-5" />
          </span>
          <div>
            <div className="text-2xl font-mono font-bold text-ink-primary">42</div>
            <div className="text-xs text-ink-muted">Active Batches</div>
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-indigo-500/10 text-indigo-400">
            <Package className="h-5 w-5" />
          </span>
          <div>
            <div className="text-2xl font-mono font-bold text-ink-primary">1.8M</div>
            <div className="text-xs text-ink-muted">Available Seed Yield</div>
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-amber-500/10 text-amber-400">
            <AlertCircle className="h-5 w-5" />
          </span>
          <div>
            <div className="text-2xl font-mono font-bold text-ink-primary">4.9M</div>
            <div className="text-xs text-ink-muted">Statewide Demand Deficit</div>
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Seed Supply/Demand Gap Analysis */}
        <GlassCard className="p-5 lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-ink-primary flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-rose-400" />
              District Supply/Demand Gaps
            </h3>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
              Demand Season
            </span>
          </div>

          <div className="space-y-4">
            {GAP_DATA.map((row) => (
              <div key={row.district} className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-ink-primary">{row.district}</span>
                  <span className={`font-mono font-bold ${row.severity === 'high' ? 'text-rose-400' : row.severity === 'low' ? 'text-amber-400' : 'text-teal-400'}`}>
                    {row.gap} {row.status === 'Deficit' ? 'Deficit' : 'Surplus'}
                  </span>
                </div>
                {/* Visual side-by-side bar */}
                <div className="flex h-3 rounded-full overflow-hidden bg-glass-strong">
                  {/* Demand bar (grey background) */}
                  <div
                    className={`h-full ${row.status === 'Deficit' ? 'bg-rose-500/20' : 'bg-teal-500/20'}`}
                    style={{ width: '100%' }}
                  />
                  {/* Supply percentage */}
                  <div
                    className={`h-full -ml-full ${row.status === 'Deficit' ? 'bg-rose-500' : 'bg-teal-500'}`}
                    style={{ width: `${(parseFloat(row.supply) / parseFloat(row.demand)) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] text-ink-muted font-mono">
                  <span>Supply: {row.supply}</span>
                  <span>Demand: {row.demand}</span>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Batch Stage Timeline Tracking */}
        <GlassCard className="p-5 lg:col-span-2">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
              <input
                type="text"
                placeholder="Search batch #, hatchery, variant..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-canvas-950/80 border border-glass-border focus:border-teal-500/50 rounded-lg pl-9 pr-4 py-2 text-sm text-ink-primary placeholder-ink-muted outline-none transition-colors"
              />
            </div>
            <div className="relative">
              <select
                value={selectedStage}
                onChange={(e) => setSelectedStage(e.target.value)}
                className="appearance-none bg-canvas-950/80 border border-glass-border text-ink-secondary text-xs rounded-lg pl-3 pr-8 py-2.5 outline-none focus:border-teal-500/50 transition-colors"
              >
                <option value="all">All Stages</option>
                <option value="Spawning">Spawning</option>
                <option value="Hatching">Hatching</option>
                <option value="Yolk Absorption">Yolk Absorption</option>
                <option value="Nursery">Nursery</option>
                <option value="Rearing">Rearing</option>
                <option value="Fingerling Ready">Fingerling Ready</option>
              </select>
              <AlertCircle className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none text-ink-muted" />
            </div>
          </div>

          <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="text-ink-muted font-bold text-[10px] uppercase tracking-wider sticky top-0 z-10 border-b border-glass-border">
                  <th className="bg-canvas-950 py-3 text-left">Batch details</th>
                  <th className="bg-canvas-950 py-3 text-left">Broodstock</th>
                  <th className="bg-canvas-950 py-3 text-left">Current Stage</th>
                  <th className="bg-canvas-950 py-3 text-right">Yield Ready</th>
                </tr>
              </thead>
              <tbody>
                {filteredBatches.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-ink-muted">
                      No batches matched the search criteria
                    </td>
                  </tr>
                ) : (
                  filteredBatches.map((batch) => (
                    <tr key={batch.id} className="border-b border-glass-border/30 last:border-0 hover:bg-glass-subtle transition-colors">
                      <td className="py-3">
                        <div className="font-semibold text-ink-primary flex items-center gap-1.5">
                          {batch.batchNumber}
                          <span className={`text-[9px] font-bold px-1.5 py-0.25 rounded ${batch.variant === 'Jayanti Rohu' ? 'bg-teal-500/10 text-teal-400' : batch.variant === 'Amrita Katla' ? 'bg-sky-500/10 text-sky-400' : 'bg-glass-strong text-ink-muted'}`}>
                            {batch.variant}
                          </span>
                        </div>
                        <div className="text-xs text-ink-muted">{batch.hatcheryName}</div>
                      </td>
                      <td className="py-3 font-mono text-xs">
                        <div className="text-ink-secondary">♂ {batch.broodstockM} | ♀ {batch.broodstockF}</div>
                        <div className="text-ink-muted">Species: {batch.species}</div>
                      </td>
                      <td className="py-3">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          batch.stage === 'Fingerling Ready'
                            ? 'bg-teal-500/15 text-teal-300 border border-teal-500/35 animate-pulse'
                            : batch.stage === 'Rearing'
                            ? 'bg-sky-500/10 text-sky-400 border border-sky-500/25'
                            : 'bg-glass-strong text-ink-muted border border-glass-border'
                        }`}>
                          {batch.stage}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <div className="font-mono font-semibold text-ink-primary">
                          {batch.estimatedCount.toLocaleString()} pcs
                        </div>
                        <div className="text-xs text-ink-muted flex items-center justify-end gap-1 font-mono">
                          <Calendar className="h-3 w-3" />
                          {batch.expectedReadyDate}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>

      {/* B2B Marketplace Transactions Logs */}
      <GlassCard className="p-5">
        <h3 className="text-sm font-bold text-ink-primary flex items-center gap-2 mb-4">
          <QrCode className="h-4 w-4 text-teal-400" />
          B2B Seed Marketplace Logs
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b border-glass-border text-ink-muted font-bold text-xs uppercase tracking-wider">
                <th className="pb-3">Transaction reference</th>
                <th className="pb-3">Buyer</th>
                <th className="pb-3">Quantity</th>
                <th className="pb-3">Total Amount</th>
                <th className="pb-3">Date</th>
                <th className="pb-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {SALES_DATA.map((sale) => (
                <tr key={sale.id} className="border-b border-glass-border/30 last:border-0 hover:bg-glass-subtle transition-colors">
                  <td className="py-3 font-mono font-semibold text-teal-300 flex items-center gap-1.5">
                    <QrCode className="h-3.5 w-3.5 text-teal-400" />
                    {sale.txnRef}
                  </td>
                  <td className="py-3">
                    <div className="font-semibold text-ink-primary">{sale.buyerName}</div>
                    <div className="text-xs text-ink-muted font-mono">{sale.buyerPhone}</div>
                  </td>
                  <td className="py-3">
                    <div className="text-ink-secondary">{sale.quantity}</div>
                    <div className="text-xs text-ink-muted">{sale.species}</div>
                  </td>
                  <td className="py-3 font-mono font-semibold text-ink-primary">
                    {sale.totalAmount}
                  </td>
                  <td className="py-3 font-mono text-xs text-ink-muted">
                    {sale.date}
                  </td>
                  <td className="py-3 text-right">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      sale.status === 'delivered'
                        ? 'bg-teal-500/10 text-teal-400'
                        : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {sale.status === 'delivered' && <CheckCircle className="h-3 w-3" />}
                      {sale.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
