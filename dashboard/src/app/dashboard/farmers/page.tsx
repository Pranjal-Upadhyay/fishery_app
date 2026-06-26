'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Users,
  Search,
  Download,
  AlertTriangle,
  ChevronRight,
  TrendingDown,
  Filter,
  X,
  Phone,
  MapPin,
  Clock,
  Droplets,
  Activity,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';

// Types
interface Pond {
  name: string;
  type: 'Nursery' | 'Grow-out';
  areaHa: number;
  system: string;
  species: string;
  waterSource: string;
}

interface Farmer {
  id: string;
  name: string;
  phone: string;
  district: string;
  block: string;
  stage: 'Registered' | 'Profile Complete' | 'First Pond Added' | 'Active Cycle' | 'Water Logging';
  daysStuck: number;
  ponds?: Pond[];
}

// Mock Data
const FUNNEL_DATA = [
  { name: 'Registered', count: 1240, color: 'from-teal-500/30 to-teal-400/20', pct: 100 },
  { name: 'Profile Complete', count: 980, color: 'from-sky-500/30 to-sky-400/20', pct: 79 },
  { name: 'First Pond Added', count: 640, color: 'from-indigo-500/30 to-indigo-400/20', pct: 51 },
  { name: 'Active Cycle', count: 420, color: 'from-purple-500/30 to-purple-400/20', pct: 33 },
  { name: 'Water Logging', count: 180, color: 'from-fuchsia-500/30 to-fuchsia-400/20', pct: 14 },
];

const DISTRICT_DATA = [
  { district: 'Patna', registered: 240, active: 45, dropOff: '48%' },
  { district: 'Gaya', registered: 190, active: 32, dropOff: '53%' },
  { district: 'Madhubani', registered: 210, active: 38, dropOff: '45%' },
  { district: 'Muzaffarpur', registered: 170, active: 22, dropOff: '61%' },
  { district: 'Bhagalpur', registered: 140, active: 18, dropOff: '58%' },
  { district: 'Darbhanga', registered: 160, active: 25, dropOff: '51%' },
];

const MOCK_FARMERS: Farmer[] = [
  {
    id: '1', name: 'Ramesh Prasad Singh', phone: '9845012345', district: 'Patna', block: 'Phulwari Sharif', stage: 'Registered', daysStuck: 32,
    ponds: [
      { name: 'Pond A - Nursery', type: 'Nursery', areaHa: 0.8, system: 'Earthen', species: 'Standard Rohu', waterSource: 'Perennial' },
    ],
  },
  {
    id: '2', name: 'Sanjay Kumar Yadav', phone: '9744123456', district: 'Madhubani', block: 'Benipatti', stage: 'Profile Complete', daysStuck: 45,
    ponds: [
      { name: 'Pond B - Growout', type: 'Grow-out', areaHa: 1.2, system: 'Earthen', species: 'Jayanti Rohu', waterSource: 'Seasonal' },
    ],
  },
  {
    id: '3', name: 'Amit Kumar Chaudhary', phone: '9512345678', district: 'Gaya', block: 'Sherghati', stage: 'First Pond Added', daysStuck: 5,
    ponds: [
      { name: 'Nursery Pond 2', type: 'Nursery', areaHa: 0.5, system: 'Earthen', species: 'Standard Katla', waterSource: 'Seasonal' },
    ],
  },
  {
    id: '4', name: 'Vikram Sen Verma', phone: '9988776655', district: 'Darbhanga', block: 'Baheri', stage: 'Active Cycle', daysStuck: 12,
    ponds: [
      { name: 'Main Cage Array', type: 'Grow-out', areaHa: 1.5, system: 'Cages', species: 'Amrita Katla', waterSource: 'Perennial' },
    ],
  },
  {
    id: '5', name: 'Rajendra Kumar Mahto', phone: '9122334455', district: 'Muzaffarpur', block: 'Kanti', stage: 'Water Logging', daysStuck: 2,
    ponds: [
      { name: 'Chaur Plot 4', type: 'Grow-out', areaHa: 3.1, system: 'Earthen', species: 'Jayanti Rohu', waterSource: 'Chaur/Floodplain' },
    ],
  },
  {
    id: '6', name: 'Shyam Kishore Mandal', phone: '9433221100', district: 'Bhagalpur', block: 'Naugachhia', stage: 'Registered', daysStuck: 41,
    ponds: [],
  },
  {
    id: '7', name: 'Gopal Dev Prasad', phone: '9602481357', district: 'Patna', block: 'Mokama', stage: 'Profile Complete', daysStuck: 8,
    ponds: [],
  },
  {
    id: '8', name: 'Lallan Yadav', phone: '9547821690', district: 'Madhubani', block: 'Jhanjharpur', stage: 'First Pond Added', daysStuck: 58,
    ponds: [
      { name: 'Nursery Block 1', type: 'Nursery', areaHa: 0.4, system: 'Earthen', species: 'Rohu Fry', waterSource: 'Seasonal' },
    ],
  },
  {
    id: '9', name: 'Devendra Kumar Ojha', phone: '9002154783', district: 'Gaya', block: 'Bodhgaya', stage: 'Active Cycle', daysStuck: 15,
    ponds: [
      { name: 'Main Growout', type: 'Grow-out', areaHa: 2.0, system: 'Biofloc', species: 'Standard Katla', waterSource: 'Perennial' },
    ],
  },
  {
    id: '10', name: 'Binod Kumar Sah', phone: '9888123477', district: 'Muzaffarpur', block: 'Bochahan', stage: 'Registered', daysStuck: 22,
    ponds: [],
  },
  {
    id: '11', name: 'Hari Har Paswan', phone: '9512345678', district: 'Gaya', block: 'Sherghati', stage: 'Active Cycle', daysStuck: 3,
    ponds: [
      { name: 'Pond 1 - Rearing', type: 'Grow-out', areaHa: 2.1, system: 'Biofloc', species: 'Standard Katla', waterSource: 'Seasonal' },
    ],
  },
];

// ── Farmer Profile Drawer ──────────────────────────────────────────
function FarmerProfileDrawer({ farmer, onClose }: { farmer: Farmer; onClose: () => void }) {
  const stageColors: Record<Farmer['stage'], string> = {
    'Registered':       'bg-glass-strong text-ink-secondary border-glass-border',
    'Profile Complete': 'bg-sky-500/10 text-sky-400 border-sky-500/25',
    'First Pond Added': 'bg-indigo-500/10 text-indigo-400 border-indigo-500/25',
    'Active Cycle':     'bg-teal-500/10 text-teal-400 border-teal-500/25',
    'Water Logging':    'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/25',
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-end sm:justify-center p-4 sm:p-6"
         onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <GlassCard className="relative z-10 w-full max-w-lg p-6 flex flex-col gap-5 shadow-glow border-teal-500/30 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-glass-border/40 pb-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-400">
              Farmer Profile
            </span>
            <h2 className="text-xl font-bold text-ink-primary mt-1">{farmer.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-glass border border-transparent hover:border-glass-border text-ink-secondary hover:text-ink-primary transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Contact details */}
        <div className="p-4 rounded-xl border border-glass-border bg-canvas-950/40 space-y-2.5 text-xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-teal-400">Contact Details</div>
          <div className="flex items-center gap-2 text-ink-secondary">
            <Phone className="h-4 w-4 text-ink-muted" />
            <a href={`tel:${farmer.phone}`} className="font-mono hover:text-teal-400 transition-colors">{farmer.phone}</a>
          </div>
          <div className="flex items-center gap-2 text-ink-secondary">
            <MapPin className="h-4 w-4 text-ink-muted" />
            <span>{farmer.block}, {farmer.district} District, Bihar</span>
          </div>
        </div>

        {/* Onboarding stage */}
        <div className="p-4 rounded-xl border border-glass-border bg-canvas-950/40 space-y-3 text-xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-teal-400">Onboarding Status</div>
          <div className="flex items-center justify-between">
            <span
              className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${stageColors[farmer.stage]}`}
            >
              {farmer.stage}
            </span>
            <div className={`flex items-center gap-1.5 font-mono text-xs ${farmer.daysStuck > 30 ? 'text-severity-warning' : 'text-ink-muted'}`}>
              {farmer.daysStuck > 30 && <AlertTriangle className="h-3.5 w-3.5" />}
              <Clock className="h-3.5 w-3.5" />
              <span>{farmer.daysStuck} days at this stage</span>
            </div>
          </div>
          {farmer.daysStuck > 30 && (
            <div className="text-amber-400 text-[11px] bg-amber-500/5 border border-amber-500/20 rounded-lg p-2">
              ⚠ This farmer has been stuck at &ldquo;{farmer.stage}&rdquo; for over 30 days. Consider outreach.
            </div>
          )}
        </div>

        {/* Registered Ponds */}
        <div className="space-y-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-teal-400 flex items-center gap-2">
            <Droplets className="h-3.5 w-3.5" />
            Registered Ponds ({farmer.ponds?.length ?? 0})
          </div>
          {(!farmer.ponds || farmer.ponds.length === 0) ? (
            <div className="text-xs text-ink-muted italic p-3 rounded-lg border border-glass-border/30 bg-canvas-950/20">
              No ponds registered yet.
            </div>
          ) : (
            farmer.ponds.map((pond, idx) => (
              <div key={idx} className="p-3 rounded-xl border border-glass-border bg-canvas-950/30 space-y-2 text-xs">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-ink-primary">{pond.name}</div>
                    <div className="text-[10px] text-ink-muted mt-0.5">{pond.species}</div>
                  </div>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${pond.type === 'Nursery' ? 'bg-sky-500/10 text-sky-400' : 'bg-teal-500/10 text-teal-400'}`}>
                    {pond.type}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center font-mono text-[10px] bg-canvas-950/40 rounded-lg p-2 border border-glass-border/20">
                  <div>
                    <div className="text-ink-muted uppercase text-[9px]">Area</div>
                    <div className="font-bold text-ink-primary mt-0.5">{pond.areaHa} ha</div>
                  </div>
                  <div>
                    <div className="text-ink-muted uppercase text-[9px]">System</div>
                    <div className="font-bold text-ink-primary mt-0.5">{pond.system}</div>
                  </div>
                  <div>
                    <div className="text-ink-muted uppercase text-[9px]">Water</div>
                    <div className="font-bold text-ink-primary mt-0.5">{pond.waterSource}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2 border-t border-glass-border/40">
          <a
            href={`tel:${farmer.phone}`}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-teal-500/10 text-teal-300 border border-teal-500/30 hover:bg-teal-500/20 text-xs font-semibold transition-colors"
          >
            <Phone className="h-4 w-4" />
            Call Farmer
          </a>
          <button
            onClick={() => {
              alert(`App notification sent to ${farmer.name} (${farmer.phone}): "MatsyaMitra Admin: Please complete your profile setup to continue."`);
            }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-sky-500/10 text-sky-300 border border-sky-500/30 hover:bg-sky-500/20 text-xs font-semibold transition-colors"
          >
            <Activity className="h-4 w-4" />
            Send App Notification
          </button>
        </div>
      </GlassCard>
    </div>
  );
}

// ── Inner page that uses useSearchParams ───────────────────────────
function FarmersPageInner() {
  const searchParams = useSearchParams();
  const urlSearch = searchParams.get('search') ?? '';

  const [searchTerm, setSearchTerm] = useState(urlSearch);
  const [selectedStage, setSelectedStage] = useState<string>('all');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
  const [selectedFarmer, setSelectedFarmer] = useState<Farmer | null>(null);

  // Auto-open the profile if a matching farmer is found from the URL search
  useEffect(() => {
    if (urlSearch) {
      setSearchTerm(urlSearch);
      const match = MOCK_FARMERS.find(
        (f) => f.name.toLowerCase() === urlSearch.toLowerCase() ||
               f.name.toLowerCase().includes(urlSearch.toLowerCase())
      );
      if (match) setSelectedFarmer(match);
    }
  }, [urlSearch]);

  // Filter logic
  const filteredFarmers = MOCK_FARMERS.filter((farmer) => {
    const matchesSearch =
      farmer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      farmer.phone.includes(searchTerm) ||
      farmer.block.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStage = selectedStage === 'all' || farmer.stage === selectedStage;
    const matchesDistrict = selectedDistrict === 'all' || farmer.district === selectedDistrict;
    return matchesSearch && matchesStage && matchesDistrict;
  });

  // CSV Export logic
  const handleExport = () => {
    const headers = ['Name', 'Phone', 'District', 'Block', 'Current Stage', 'Days Stuck'];
    
    const escapeCSV = (val: any): string => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = filteredFarmers.map((f) => [
      f.name, f.phone, f.district, f.block, f.stage, f.daysStuck
    ].map(escapeCSV));

    const csvContent = [headers.map(escapeCSV), ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `matsyamitra_farmers_funnel_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-6 p-6 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-teal-400">
            Funnel Analysis
          </div>
          <h1 className="text-2xl font-bold text-ink-primary">Farmer Onboarding</h1>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-teal-500/10 text-teal-300 border border-teal-500/30 transition-all hover:bg-teal-500/20 active:scale-95"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Funnel Visual Container */}
      <GlassCard className="p-6">
        <h2 className="text-base font-bold text-ink-primary mb-6">Onboarding Funnel</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {FUNNEL_DATA.map((stage, idx) => (
            <div key={stage.name} className="relative flex flex-col justify-between p-4 rounded-xl border border-glass-border bg-gradient-to-b from-canvas-900/50 to-canvas-950/50 shadow-glass">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                  Stage {idx + 1}
                </span>
                <h3 className="text-sm font-bold text-ink-primary mt-1">{stage.name}</h3>
              </div>
              <div className="mt-8 flex items-baseline justify-between">
                <div className="text-2xl font-mono font-bold text-ink-primary">{stage.count}</div>
                <div className="text-xs font-semibold text-teal-400">{stage.pct}%</div>
              </div>
              <div className="w-full bg-glass-strong h-1.5 rounded-full mt-3 overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${stage.color} rounded-full`}
                  style={{ width: `${stage.pct}%` }}
                />
              </div>
              {idx < 4 && (
                <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 h-6 w-6 items-center justify-center rounded-full border border-glass-border bg-canvas-950 text-ink-muted">
                  <ChevronRight className="h-3 w-3" />
                </div>
              )}
            </div>
          ))}
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* District drop-off statistics */}
        <GlassCard className="p-5 lg:col-span-1 flex flex-col">
          <div className="flex items-center gap-2 text-ink-primary font-bold mb-4">
            <TrendingDown className="h-4 w-4 text-teal-400" />
            <h3>District Drop-offs</h3>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-glass-border text-ink-muted font-bold text-xs uppercase tracking-wider">
                  <th className="pb-3">District</th>
                  <th className="pb-3 text-right">Reg.</th>
                  <th className="pb-3 text-right">Active</th>
                  <th className="pb-3 text-right">Drop-off</th>
                </tr>
              </thead>
              <tbody>
                {DISTRICT_DATA.map((d) => (
                  <tr key={d.district} className="border-b border-glass-border/30 last:border-0 hover:bg-glass-subtle transition-colors">
                    <td className="py-2.5 font-medium text-ink-primary">{d.district}</td>
                    <td className="py-2.5 text-right font-mono text-ink-secondary">{d.registered}</td>
                    <td className="py-2.5 text-right font-mono text-ink-secondary">{d.active}</td>
                    <td className="py-2.5 text-right font-mono font-bold text-severity-warning">{d.dropOff}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>

        {/* Directory & Filters */}
        <GlassCard className="p-5 lg:col-span-2">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
              <input
                type="text"
                placeholder="Search name, phone, block..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-canvas-950/80 border border-glass-border focus:border-teal-500/50 rounded-lg pl-9 pr-4 py-2 text-sm text-ink-primary placeholder-ink-muted outline-none transition-colors"
              />
            </div>
            {/* Filters */}
            <div className="flex gap-2">
              <div className="relative">
                <select
                  value={selectedStage}
                  onChange={(e) => setSelectedStage(e.target.value)}
                  className="appearance-none bg-canvas-950/80 border border-glass-border text-ink-secondary text-xs rounded-lg pl-3 pr-8 py-2.5 outline-none focus:border-teal-500/50 transition-colors"
                >
                  <option value="all">All Stages</option>
                  <option value="Registered">Registered</option>
                  <option value="Profile Complete">Profile Complete</option>
                  <option value="First Pond Added">First Pond Added</option>
                  <option value="Active Cycle">Active Cycle</option>
                  <option value="Water Logging">Water Logging</option>
                </select>
                <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none text-ink-muted" />
              </div>

              <div className="relative">
                <select
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  className="appearance-none bg-canvas-950/80 border border-glass-border text-ink-secondary text-xs rounded-lg pl-3 pr-8 py-2.5 outline-none focus:border-teal-500/50 transition-colors"
                >
                  <option value="all">All Districts</option>
                  <option value="Patna">Patna</option>
                  <option value="Gaya">Gaya</option>
                  <option value="Madhubani">Madhubani</option>
                  <option value="Muzaffarpur">Muzaffarpur</option>
                  <option value="Darbhanga">Darbhanga</option>
                  <option value="Bhagalpur">Bhagalpur</option>
                </select>
                <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none text-ink-muted" />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="text-ink-muted font-bold text-[10px] uppercase tracking-wider sticky top-0 z-10 border-b border-glass-border">
                  <th className="bg-canvas-950 py-3 text-left">Farmer</th>
                  <th className="bg-canvas-950 py-3 text-left">Geography</th>
                  <th className="bg-canvas-950 py-3 text-left">Stage</th>
                  <th className="bg-canvas-950 py-3 text-right">Stuck</th>
                </tr>
              </thead>
              <tbody>
                {filteredFarmers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-ink-muted">
                      No farmers matched the search criteria
                    </td>
                  </tr>
                ) : (
                  filteredFarmers.map((f) => {
                    const isCold = f.daysStuck > 30;
                    return (
                      <tr
                        key={f.id}
                        onClick={() => setSelectedFarmer(f)}
                        className="border-b border-glass-border/30 last:border-0 hover:bg-glass-subtle transition-colors cursor-pointer group"
                      >
                        <td className="py-3">
                          <div className="font-semibold text-ink-primary group-hover:text-teal-400 transition-colors">{f.name}</div>
                          <div className="text-xs text-ink-muted font-mono">{f.phone}</div>
                        </td>
                        <td className="py-3">
                          <div className="text-ink-secondary">{f.district}</div>
                          <div className="text-xs text-ink-muted">{f.block}</div>
                        </td>
                        <td className="py-3">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            f.stage === 'Water Logging'
                              ? 'bg-teal-500/10 text-teal-400 border border-teal-500/25'
                              : f.stage === 'Active Cycle'
                              ? 'bg-sky-500/10 text-sky-400 border border-sky-500/25'
                              : 'bg-glass-strong text-ink-secondary border border-glass-border'
                          }`}>
                            {f.stage}
                          </span>
                        </td>
                        <td className="py-3 text-right font-mono">
                          {isCold ? (
                            <div className="flex items-center justify-end gap-1.5 text-severity-warning">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              <span>{f.daysStuck}d</span>
                            </div>
                          ) : (
                            <span className="text-ink-muted">{f.daysStuck}d</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-3 text-[10px] text-ink-muted text-center">
            Click any row to view full farmer profile ↗
          </div>
        </GlassCard>
      </div>

      {/* Farmer Profile Drawer */}
      {selectedFarmer && (
        <FarmerProfileDrawer farmer={selectedFarmer} onClose={() => setSelectedFarmer(null)} />
      )}
    </div>
  );
}

// ── Public export with Suspense wrapper ───────────────────────────
export default function FarmersPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col gap-6 p-6 h-full overflow-y-auto">
        <div className="h-8 w-48 rounded bg-glass-strong animate-pulse" />
        <div className="h-48 rounded-xl bg-glass-subtle animate-pulse" />
      </div>
    }>
      <FarmersPageInner />
    </Suspense>
  );
}
