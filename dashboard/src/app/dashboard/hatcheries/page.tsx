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
  X,
  MapPin,
  Phone,
  User,
  Filter,
  Info,
  Sprout,
  Download,
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

interface HatcheryInfo {
  id: string;
  name: string;
  licenseNo: string;
  owner: string;
  phone: string;
  district: string;
  block: string;
  capacity: string;
  activeBatches: number;
  status: 'Active' | 'Seasonal Pause' | 'Inspection Pending';
}

// Mock Data
const HATCHERIES_DIRECTORY: HatcheryInfo[] = [
  { id: 'h1', name: 'Patna Central Hatchery',   licenseNo: 'BH-HAT-001', owner: 'Bihar State Fisheries Corp',   phone: '9876543000', district: 'Patna',      block: 'Phulwari',  capacity: '10M fry/season',  activeBatches: 2, status: 'Active'             },
  { id: 'h2', name: 'Mithila Matsya Hatchery',   licenseNo: 'BH-HAT-002', owner: 'Mithila Aqua Pvt. Ltd.',     phone: '9988770011', district: 'Madhubani', block: 'Benipatti', capacity: '8M fry/season',   activeBatches: 1, status: 'Active'             },
  { id: 'h3', name: 'Gaya Fishery Seed',          licenseNo: 'BH-HAT-003', owner: 'Gaya District Co-op',        phone: '9122330055', district: 'Gaya',       block: 'Sherghati', capacity: '6M fry/season',   activeBatches: 1, status: 'Active'             },
  { id: 'h4', name: 'Kosi River Hatchery',        licenseNo: 'BH-HAT-004', owner: 'Kosi Agri Ventures',         phone: '9512349876', district: 'Supaul',     block: 'Triveniganj', capacity: '12M fry/season', activeBatches: 1, status: 'Active'           },
  { id: 'h5', name: 'Muzaffarpur Seed Centre',    licenseNo: 'BH-HAT-005', owner: 'J.P. Fisheries Pvt. Ltd.',   phone: '9002154000', district: 'Muzaffarpur',block: 'Kanti',     capacity: '5M fry/season',   activeBatches: 0, status: 'Seasonal Pause'    },
  { id: 'h6', name: 'Bhagalpur Fingerling Farm',  licenseNo: 'BH-HAT-006', owner: 'Bhagalpur Fish Seed Co.',   phone: '9654329977', district: 'Bhagalpur',  block: 'Sabour',    capacity: '7M fry/season',   activeBatches: 0, status: 'Inspection Pending'},
];

type HatchModal = 'hatcheries' | 'batches' | 'seedYield' | 'demandDeficit' | null;
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

// CSV Export helpers
function exportHatcheriesCSV() {
  const headers = ['Hatchery ID', 'Name', 'License No', 'Owner', 'Phone', 'District', 'Block', 'Capacity', 'Active Batches', 'Status'];
  
  const escapeCSV = (val: any): string => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = HATCHERIES_DIRECTORY.map((h) => [
    h.id,
    h.name,
    h.licenseNo,
    h.owner,
    h.phone,
    h.district,
    h.block,
    h.capacity,
    h.activeBatches,
    h.status,
  ].map(escapeCSV));

  const csvContent = [headers.map(escapeCSV), ...rows].map((r) => r.join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `matsyamitra_hatcheries_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function exportBatchesCSV() {
  const headers = ['Batch ID', 'Batch Number', 'Hatchery Name', 'Species', 'Variant', 'Stage', 'Days In Stage', 'Broodstock Male', 'Broodstock Female', 'Estimated Count', 'Expected Ready Date'];

  const escapeCSV = (val: any): string => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = BATCH_DATA.map((b) => [
    b.id,
    b.batchNumber,
    b.hatcheryName,
    b.species,
    b.variant,
    b.stage,
    b.daysInStage,
    b.broodstockM,
    b.broodstockF,
    b.estimatedCount,
    b.expectedReadyDate,
  ].map(escapeCSV));

  const csvContent = [headers.map(escapeCSV), ...rows].map((r) => r.join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `matsyamitra_active_batches_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function exportAvailableSeedYieldCSV() {
  const headers = ['Batch Number', 'Hatchery Name', 'Species', 'Variant', 'Stage', 'Estimated Count', 'Expected Ready Date'];

  const escapeCSV = (val: any): string => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const contributingBatches = BATCH_DATA.filter((b) => b.stage === 'Fingerling Ready' || b.stage === 'Rearing');

  const rows = contributingBatches.map((b) => [
    b.batchNumber,
    b.hatcheryName,
    b.species,
    b.variant,
    b.stage,
    b.estimatedCount,
    b.expectedReadyDate,
  ].map(escapeCSV));

  const csvContent = [headers.map(escapeCSV), ...rows].map((r) => r.join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `matsyamitra_available_seed_yield_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function HatcheriesPage() {
  const [searchTerm, setSearchTerm]         = useState('');
  const [selectedStage, setSelectedStage]   = useState<string>('all');
  const [activeHatchModal, setActiveHatchModal] = useState<HatchModal>(null);
  const [selectedBatchDetail, setSelectedBatchDetail] = useState<Batch | null>(null);
  const [selectedHatcheryDetail, setSelectedHatcheryDetail] = useState<HatcheryInfo | null>(null);

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

      {/* Overview Bento Grid — all clickable */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassCard className="p-4 flex items-center gap-3 cursor-pointer hover:border-teal-500/40 hover:bg-teal-500/5 transition-all group"
          onClick={() => setActiveHatchModal('hatcheries')}>
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-teal-500/10 text-teal-400 group-hover:bg-teal-500/20 transition-colors">
            <Waves className="h-5 w-5" />
          </span>
          <div>
            <div className="text-2xl font-mono font-bold text-ink-primary">12</div>
            <div className="text-xs text-ink-muted">Active Hatcheries</div>
            <div className="text-[10px] text-teal-400 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">View directory ↗</div>
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center gap-3 cursor-pointer hover:border-sky-500/40 hover:bg-sky-500/5 transition-all group"
          onClick={() => setActiveHatchModal('batches')}>
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-sky-500/10 text-sky-400 group-hover:bg-sky-500/20 transition-colors">
            <Layers className="h-5 w-5" />
          </span>
          <div>
            <div className="text-2xl font-mono font-bold text-ink-primary">42</div>
            <div className="text-xs text-ink-muted">Active Batches</div>
            <div className="text-[10px] text-sky-400 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">View all batches ↗</div>
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center gap-3 cursor-pointer hover:border-indigo-500/40 hover:bg-indigo-500/5 transition-all group"
          onClick={() => setActiveHatchModal('seedYield')}>
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/20 transition-colors">
            <Package className="h-5 w-5" />
          </span>
          <div>
            <div className="text-2xl font-mono font-bold text-ink-primary">1.8M</div>
            <div className="text-xs text-ink-muted">Available Seed Yield</div>
            <div className="text-[10px] text-indigo-400 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">How is this calculated? ↗</div>
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center gap-3 cursor-pointer hover:border-amber-500/40 hover:bg-amber-500/5 transition-all group"
          onClick={() => setActiveHatchModal('demandDeficit')}>
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20 transition-colors">
            <AlertCircle className="h-5 w-5" />
          </span>
          <div>
            <div className="text-2xl font-mono font-bold text-ink-primary">4.9M</div>
            <div className="text-xs text-ink-muted">Statewide Demand Deficit</div>
            <div className="text-[10px] text-amber-400 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">District breakdown ↗</div>
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
                    <tr key={batch.id} 
                        onClick={() => setSelectedBatchDetail(batch)}
                        className="border-b border-glass-border/30 last:border-0 hover:bg-glass-subtle transition-colors cursor-pointer">
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

      {/* ── Hatcheries KPI Modals ────────────────────────────── */}
      {activeHatchModal && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
           onClick={(e) => { if (e.target === e.currentTarget) setActiveHatchModal(null); }}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setActiveHatchModal(null)} />
        <GlassCard variant="solid" className="relative z-10 w-full max-w-2xl p-6 flex flex-col gap-5 shadow-glow border-teal-500/30 max-h-[88vh] overflow-hidden">

          {/* Modal header */}
          <div className="flex justify-between items-start border-b border-glass-border/40 pb-4 shrink-0">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-400">Hatcheries Dashboard</div>
              <h2 className="text-lg font-bold text-ink-primary mt-1">
                {activeHatchModal === 'hatcheries'    && 'Registered Hatchery Directory'}
                {activeHatchModal === 'batches'       && 'All Active Batches — Full Pipeline'}
                {activeHatchModal === 'seedYield'     && 'Available Seed Yield — How It\'s Calculated'}
                {activeHatchModal === 'demandDeficit' && 'Statewide Demand Deficit — District Breakdown'}
              </h2>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {activeHatchModal === 'hatcheries' && (
                <button onClick={exportHatcheriesCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/25 text-xs font-bold hover:bg-white hover:text-slate-950 hover:border-white transition-all duration-200">
                  <Download className="h-3.5 w-3.5" /> Export CSV
                </button>
              )}
              {activeHatchModal === 'batches' && (
                <button onClick={exportBatchesCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/25 text-xs font-bold hover:bg-white hover:text-slate-950 hover:border-white transition-all duration-200">
                  <Download className="h-3.5 w-3.5" /> Export CSV
                </button>
              )}
              {activeHatchModal === 'seedYield' && (
                <button onClick={exportAvailableSeedYieldCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/25 text-xs font-bold hover:bg-white hover:text-slate-950 hover:border-white transition-all duration-200">
                  <Download className="h-3.5 w-3.5" /> Export CSV
                </button>
              )}
              <button onClick={() => setActiveHatchModal(null)}
                className="p-1.5 rounded-lg hover:bg-glass border border-transparent hover:border-glass-border text-ink-secondary transition-all">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* ── Hatchery Directory ── */}
          {activeHatchModal === 'hatcheries' && (
            <div className="overflow-y-auto space-y-3 flex-1 pr-1">
              {HATCHERIES_DIRECTORY.map((h) => (
                <div key={h.id} 
                     onClick={() => {
                       setSelectedHatcheryDetail(h);
                       setActiveHatchModal(null);
                     }}
                     className="p-4 rounded-xl border border-glass-border bg-canvas-950/30 space-y-2 cursor-pointer hover:border-teal-500/40 hover:bg-teal-500/5 transition-all">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <Waves className="h-4 w-4 text-teal-400 shrink-0" />
                      <div>
                        <div className="font-bold text-ink-primary">{h.name}</div>
                        <div className="text-xs text-ink-secondary">{h.owner}</div>
                      </div>
                    </div>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                      h.status === 'Active'             ? 'bg-teal-500/10 text-teal-400' :
                      h.status === 'Seasonal Pause'     ? 'bg-amber-500/10 text-amber-400' :
                                                          'bg-rose-500/10 text-rose-400'}`}>{h.status}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[10px]">
                    <div className="p-2 rounded bg-canvas-950/40 border border-glass-border">
                      <div className="text-ink-muted">License</div>
                      <div className="font-mono font-bold text-ink-primary">{h.licenseNo}</div>
                    </div>
                    <div className="p-2 rounded bg-canvas-950/40 border border-glass-border">
                      <div className="text-ink-muted">Location</div>
                      <div className="font-semibold text-ink-primary">{h.district}, {h.block}</div>
                    </div>
                    <div className="p-2 rounded bg-canvas-950/40 border border-glass-border">
                      <div className="text-ink-muted">Capacity</div>
                      <div className="font-semibold text-teal-400">{h.capacity}</div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-[10px]">
                    <a href={`tel:${h.phone}`} className="flex items-center gap-1 text-sky-400 hover:underline font-mono">
                      <Phone className="h-3 w-3" />{h.phone}
                    </a>
                    <span className="text-ink-muted">{h.activeBatches} active batch{h.activeBatches !== 1 ? 'es' : ''}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Active Batches ── */}
          {activeHatchModal === 'batches' && (
            <div className="overflow-y-auto flex-1 pr-1">
              <div className="text-xs text-ink-muted mb-3 p-3 rounded-lg border border-sky-500/20 bg-sky-500/5">
                📦 Batches progress through 6 stages: Spawning → Hatching → Yolk Absorption → Nursery → Rearing → Fingerling Ready. Data is entered by hatchery operators through the MatsyaMitra app.
              </div>
              <div className="space-y-3">
                {BATCH_DATA.map((batch) => {
                  const stages = ['Spawning','Hatching','Yolk Absorption','Nursery','Rearing','Fingerling Ready'];
                  const idx = stages.indexOf(batch.stage);
                  return (
                    <div key={batch.id} className="p-4 rounded-xl border border-glass-border bg-canvas-950/30 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-mono font-bold text-teal-400">{batch.batchNumber}</div>
                          <div className="text-xs text-ink-secondary">{batch.hatcheryName}</div>
                        </div>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          batch.variant === 'Jayanti Rohu' ? 'bg-teal-500/10 text-teal-400' :
                          batch.variant === 'Amrita Katla' ? 'bg-sky-500/10 text-sky-400' :
                                                              'bg-glass-strong text-ink-muted'}`}>{batch.variant}</span>
                      </div>
                      {/* Stage progress bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-ink-muted">
                          <span>{batch.stage}</span>
                          <span className="font-mono">{batch.daysInStage}d in stage</span>
                        </div>
                        <div className="flex gap-0.5">
                          {stages.map((s, i) => (
                            <div key={s} className={`h-1.5 flex-1 rounded-full ${
                              i < idx   ? 'bg-teal-500' :
                              i === idx ? 'bg-sky-400 animate-pulse' :
                                          'bg-glass-strong'}`} />
                          ))}
                        </div>
                      </div>
                      <div className="flex justify-between text-[10px] text-ink-muted font-mono">
                        <span>Est. {batch.estimatedCount.toLocaleString()} pcs</span>
                        <span>Ready: {batch.expectedReadyDate}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Seed Yield Explanation ── */}
          {activeHatchModal === 'seedYield' && (
            <div className="space-y-4 overflow-y-auto flex-1">
              <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm font-bold text-ink-primary">Available Seed Yield</span>
                  <span className="text-3xl font-mono font-bold text-indigo-400">1.8M pcs</span>
                </div>
                <div className="text-xs text-ink-muted">
                  This number is <strong className="text-indigo-400">automatically calculated</strong> — it is the sum of
                  <code className="mx-1 px-1 py-0.5 rounded bg-canvas-950/60 text-teal-300 text-[10px]">estimatedCount</code>
                  for all batches currently at <strong>Fingerling Ready</strong> or
                  <strong> Rearing</strong> stage within 30 days of their expected ready date.
                </div>
              </div>

              <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Contributing Batches</div>
              {BATCH_DATA.filter((b) => b.stage === 'Fingerling Ready' || b.stage === 'Rearing').map((batch) => (
                <div key={batch.id} 
                     onClick={() => {
                       setSelectedBatchDetail(batch);
                       setActiveHatchModal(null);
                     }}
                     className="p-3 rounded-lg border border-glass-border bg-canvas-950/30 flex justify-between items-center text-xs cursor-pointer hover:border-teal-500/40 hover:bg-teal-500/5 transition-all">
                  <div>
                    <div className="font-mono font-bold text-teal-400">{batch.batchNumber}</div>
                    <div className="text-ink-muted">
                      <span className="hover:underline text-indigo-400 font-semibold cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              const h = HATCHERIES_DIRECTORY.find(h => h.name === batch.hatcheryName);
                              if (h) {
                                setSelectedHatcheryDetail(h);
                                setActiveHatchModal(null);
                              }
                            }}>
                        {batch.hatcheryName}
                      </span> · {batch.stage}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-ink-primary">{batch.estimatedCount.toLocaleString()} pcs</div>
                    <div className="text-ink-muted">Ready: {batch.expectedReadyDate}</div>
                  </div>
                </div>
              ))}

              <div className="p-3 rounded-lg border border-teal-500/20 bg-teal-500/5 text-xs text-ink-secondary space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-teal-400">How hatcheries enter this data</div>
                <div>Hatchery operators log in to the MatsyaMitra app with a <strong className="text-teal-400">Hatchery</strong> account type. They create batches by entering:
                  broodstock count, spawn date, species &amp; variant, and update the stage as the batch progresses.
                  The estimated fingerling count is entered when the batch reaches the Rearing stage based on observed spawn survival.</div>
              </div>
            </div>
          )}

          {/* ── Demand Deficit Explanation ── */}
          {activeHatchModal === 'demandDeficit' && (
            <div className="space-y-4 overflow-y-auto flex-1">
              <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-3">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm font-bold text-ink-primary">Statewide Demand Deficit</span>
                  <span className="text-3xl font-mono font-bold text-amber-400">4.9M pcs</span>
                </div>
                <div className="text-xs text-ink-muted leading-relaxed">
                  <strong className="text-amber-400">This is a computed field — not manually entered by any user.</strong><br />
                  It is calculated as: <code className="mx-1 px-1 py-0.5 rounded bg-canvas-950/60 text-teal-300 text-[10px]">Total Demand − Total Available Supply</code><br /><br />
                  <strong>Demand</strong> = Registered farmers × avg pond area × govt. recommended stocking density
                  (read dynamically per species from the knowledge base, e.g. 20,000/ha for Rohu, 10,000/ha for Catla).
                  District-level override targets can be uploaded by the admin.<br /><br />
                  <strong>Supply</strong> = Sum of estimatedCount from all near-ready hatchery batches.
                </div>
              </div>

              <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">District-wise Demand vs. Supply</div>
              <div className="space-y-3">
                {GAP_DATA.map((row) => {
                  const supplyNum  = parseFloat(row.supply);
                  const demandNum  = parseFloat(row.demand);
                  const supplyPct  = Math.min((supplyNum / demandNum) * 100, 100);
                  return (
                    <div key={row.district} className="p-3 rounded-xl border border-glass-border bg-canvas-950/30 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-ink-primary">{row.district}</span>
                        <span className={`font-mono font-bold ${
                          row.severity === 'high' ? 'text-rose-400' :
                          row.severity === 'low'  ? 'text-amber-400' : 'text-teal-400'}`}>
                          {row.gap} {row.status}
                        </span>
                      </div>
                      <div className="w-full bg-glass-strong h-2 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${
                          row.status === 'Deficit' ? 'bg-gradient-to-r from-rose-500 to-amber-400' : 'bg-gradient-to-r from-teal-500 to-sky-400'
                        }`} style={{ width: `${supplyPct}%` }} />
                      </div>
                      <div className="flex justify-between text-[10px] text-ink-muted font-mono">
                        <span>Supply: <strong className="text-ink-secondary">{row.supply}</strong></span>
                        <span>Demand: <strong className="text-ink-secondary">{row.demand}</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 text-xs text-ink-secondary">
                💡 <strong className="text-amber-400">Admin action:</strong> Stocking densities are read
                automatically from the species database. Upload the Bihar Fisheries Department's
                annual stocking override CSV under Settings → District Seed Demand to override defaults.
              </div>
            </div>
          )}

        </GlassCard>
      </div>
      )}

      {/* Batch Detail Modal */}
      {selectedBatchDetail && (() => {
        const batch = selectedBatchDetail;
        const hatchery = HATCHERIES_DIRECTORY.find(h => h.name === batch.hatcheryName);
        
        // Mock stage details for progress/timeline
        const stagesInfo = [
          { name: 'Spawning', date: 'Mon, Jun 01', entry: '500,000 eggs', exit: '410,000 spawn', survival: '82.0%' },
          { name: 'Hatching', date: 'Tue, Jun 02', entry: '410,000 spawn', exit: '390,000 fry', survival: '95.1%' },
          { name: 'Yolk Absorption', date: 'Thu, Jun 04', entry: '390,000 fry', exit: '380,000 fry', survival: '97.4%' },
          { name: 'Nursery', date: 'Sun, Jun 07', entry: '380,000 fry', exit: '310,000 advanced fry', survival: '81.5%' },
          { name: 'Rearing', date: 'Sat, Jun 27', entry: '310,000 advanced fry', exit: '250,000 fingerlings', survival: '80.6%' },
          { name: 'Fingerling Ready', date: 'Sun, Jul 12', entry: '250,000 fingerlings', exit: '242,500 pcs', survival: '97.0%' },
        ];

        const stagesList = ['Spawning','Hatching','Yolk Absorption','Nursery','Rearing','Fingerling Ready'];
        const currentStageIdx = stagesList.findIndex(s => s.toLowerCase() === batch.stage.toLowerCase());
        
        // Calculate actual overall survival if batch is completed
        const isCompleted = batch.stage === 'Fingerling Ready';
        const actualCount = isCompleted ? 242500 : null;
        const actualSurvival = isCompleted ? '48.5%' : null;
        const estimatedSurvival = '50.0%';

        return (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4"
               onClick={(e) => { if (e.target === e.currentTarget) setSelectedBatchDetail(null); }}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedBatchDetail(null)} />
            <GlassCard className="relative z-10 w-full max-w-xl p-6 flex flex-col gap-4 shadow-glow border-sky-500/30 max-h-[90vh] overflow-y-auto">
              
              {/* Header */}
              <div className="flex justify-between items-start border-b border-glass-border/40 pb-3 shrink-0">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-400">Batch Timeline Tracking</div>
                  <h2 className="text-lg font-mono font-bold text-ink-primary mt-1 flex items-center gap-2">
                    {batch.batchNumber}
                    <span className="text-xs font-sans font-semibold px-2 py-0.5 rounded bg-teal-500/10 text-teal-400">
                      {batch.variant}
                    </span>
                  </h2>
                  <div className="text-xs text-ink-muted mt-0.5">Species: {batch.species}</div>
                </div>
                <button onClick={() => setSelectedBatchDetail(null)}
                  className="p-1.5 rounded-lg hover:bg-glass border border-transparent hover:border-glass-border text-ink-secondary transition-all">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Hatchery Owner info */}
              <div className="p-3.5 rounded-xl border border-glass-border bg-canvas-950/20 space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Hatchery &amp; Operator Details</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <div>
                    <span className="text-ink-muted block text-[10px]">Hatchery</span>
                    <span className="font-semibold text-sky-400 hover:underline cursor-pointer"
                          onClick={() => {
                            if (hatchery) {
                              setSelectedHatcheryDetail(hatchery);
                              setSelectedBatchDetail(null);
                            }
                          }}>
                      {batch.hatcheryName}
                    </span>
                  </div>
                  <div>
                    <span className="text-ink-muted block text-[10px]">License Number</span>
                    <span className="font-mono text-ink-primary">{hatchery?.licenseNo ?? 'BH-HAT-0XX'}</span>
                  </div>
                  <div>
                    <span className="text-ink-muted block text-[10px]">Operator / Owner</span>
                    <span className="text-ink-primary font-medium">{hatchery?.owner ?? 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-ink-muted block text-[10px]">Contact</span>
                    <a href={`tel:${hatchery?.phone}`} className="text-sky-400 font-mono hover:underline flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {hatchery?.phone ?? 'N/A'}
                    </a>
                  </div>
                </div>
              </div>

              {/* Comparison summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-glass-border bg-canvas-950/40">
                  <span className="text-[9px] font-semibold text-ink-muted uppercase block">Estimated Count</span>
                  <div className="text-base font-mono font-bold text-ink-primary mt-1">{batch.estimatedCount.toLocaleString()} pcs</div>
                  <span className="text-[10px] text-ink-muted font-mono mt-0.5 block">Est. Survival: {estimatedSurvival}</span>
                </div>
                <div className={`p-3 rounded-lg border ${isCompleted ? 'border-teal-500/20 bg-teal-500/5' : 'border-glass-border bg-canvas-950/20'}`}>
                  <span className="text-[9px] font-semibold text-ink-muted uppercase block">Actual Yield</span>
                  <div className="text-base font-mono font-bold text-ink-primary mt-1">
                    {actualCount ? `${actualCount.toLocaleString()} pcs` : 'TBD (In Progress)'}
                  </div>
                  <span className="text-[10px] text-ink-muted font-mono mt-0.5 block">
                    {actualSurvival ? `Actual Survival: ${actualSurvival}` : `Expected: ${batch.expectedReadyDate}`}
                  </span>
                </div>
              </div>

              {/* Timeline list */}
              <div className="space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Lifecycle Stage Logs</div>
                <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-glass-strong">
                  {stagesInfo.map((s, i) => {
                    const isPassed = i <= currentStageIdx;
                    const isCurrentStage = i === currentStageIdx;
                    return (
                      <div key={s.name} className="flex gap-4 items-start pl-8 relative">
                        <div className={`absolute left-1.5 top-1.5 w-3.5 h-3.5 rounded-full border-2 ${
                          isCurrentStage ? 'bg-sky-400 border-sky-400 scale-110 animate-pulse' :
                          isPassed ? 'bg-teal-500 border-teal-500' :
                          'bg-canvas-950 border-glass-border'
                        }`} />
                        <div className="flex-1 flex justify-between items-baseline">
                          <div>
                            <div className={`text-xs font-semibold ${isPassed ? 'text-ink-primary' : 'text-ink-muted'}`}>
                              {s.name}
                            </div>
                            {isPassed && (
                              <div className="text-[10px] text-ink-muted font-mono mt-0.5">
                                Entry: {s.entry} · Exit: {s.exit}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] font-mono text-ink-muted">{s.date}</span>
                            {isPassed && (
                              <span className="text-[10px] font-mono text-teal-400 font-bold block">
                                Survival: {s.survival}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </GlassCard>
          </div>
        );
      })()}

      {/* Hatchery Profile Modal */}
      {selectedHatcheryDetail && (() => {
        const h = selectedHatcheryDetail;
        const hatcheryBatches = BATCH_DATA.filter(b => b.hatcheryName === h.name);

        return (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4"
               onClick={(e) => { if (e.target === e.currentTarget) setSelectedHatcheryDetail(null); }}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedHatcheryDetail(null)} />
            <GlassCard className="relative z-10 w-full max-w-xl p-6 flex flex-col gap-4 shadow-glow border-teal-500/30 max-h-[90vh] overflow-y-auto">
              
              {/* Header */}
              <div className="flex justify-between items-start border-b border-glass-border/40 pb-3 shrink-0">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-400">Registered Hatchery Profile</div>
                  <h2 className="text-lg font-bold text-ink-primary mt-1 flex items-center gap-2">
                    {h.name}
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                      h.status === 'Active' ? 'bg-teal-500/10 text-teal-400' : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {h.status}
                    </span>
                  </h2>
                </div>
                <button onClick={() => setSelectedHatcheryDetail(null)}
                  className="p-1.5 rounded-lg hover:bg-glass border border-transparent hover:border-glass-border text-ink-secondary transition-all">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Profile Details Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg border border-glass-border bg-canvas-950/20">
                  <span className="text-ink-muted text-[10px] block">Owner/Operator</span>
                  <span className="font-semibold text-ink-primary mt-0.5 block">{h.owner}</span>
                </div>
                <div className="p-3 rounded-lg border border-glass-border bg-canvas-950/20">
                  <span className="text-ink-muted text-[10px] block">License Number</span>
                  <span className="font-mono font-semibold text-ink-primary mt-0.5 block">{h.licenseNo}</span>
                </div>
                <div className="p-3 rounded-lg border border-glass-border bg-canvas-950/20">
                  <span className="text-ink-muted text-[10px] block">Geographic Location</span>
                  <span className="font-semibold text-ink-primary mt-0.5 block">{h.district} District, {h.block} Block</span>
                </div>
                <div className="p-3 rounded-lg border border-glass-border bg-canvas-950/20">
                  <span className="text-ink-muted text-[10px] block">Capacity</span>
                  <span className="font-semibold text-teal-400 mt-0.5 block">{h.capacity}</span>
                </div>
              </div>

              {/* Contact section */}
              <div className="flex justify-between items-center p-3 rounded-lg border border-glass-border bg-canvas-950/40 text-xs">
                <div>
                  <span className="text-ink-muted text-[10px] block">Contact Number</span>
                  <a href={`tel:${h.phone}`} className="font-mono font-semibold text-sky-400 hover:underline flex items-center gap-1 mt-0.5">
                    <Phone className="h-3 w-3" /> {h.phone}
                  </a>
                </div>
                <div className="text-right">
                  <span className="text-ink-muted text-[10px] block">Active Batches</span>
                  <span className="font-bold text-ink-primary mt-0.5 block">{h.activeBatches} Batches</span>
                </div>
              </div>

              {/* Active Batches */}
              <div className="space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Active Production Batches</div>
                {hatcheryBatches.length === 0 ? (
                  <div className="text-xs text-ink-muted italic py-2">No active batches in progress.</div>
                ) : (
                  <div className="space-y-2">
                    {hatcheryBatches.map(b => (
                      <div key={b.id} 
                           onClick={() => {
                             setSelectedBatchDetail(b);
                             setSelectedHatcheryDetail(null);
                           }}
                           className="p-3 rounded-lg border border-glass-border bg-canvas-950/20 flex justify-between items-center text-xs cursor-pointer hover:border-teal-500/40 transition-colors">
                        <div>
                          <div className="font-mono font-bold text-teal-400">{b.batchNumber}</div>
                          <div className="text-ink-muted">{b.species} ({b.variant}) · {b.stage}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-bold text-ink-primary">{b.estimatedCount.toLocaleString()} pcs</div>
                          <div className="text-ink-muted">Ready: {b.expectedReadyDate}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </GlassCard>
          </div>
        );
      })()}
    </div>
  );
}
