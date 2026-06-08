'use client';

import { useState } from 'react';
import {
  Users,
  Search,
  Download,
  AlertTriangle,
  ChevronRight,
  TrendingDown,
  Filter,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';

// Types
interface Farmer {
  id: string;
  name: string;
  phone: string;
  district: string;
  block: string;
  stage: 'Registered' | 'Profile Complete' | 'First Pond Added' | 'Active Cycle' | 'Water Logging';
  daysStuck: number;
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
  { id: '1', name: 'Ramesh Prasad Singh', phone: '9845012345', district: 'Patna', block: 'Phulwari Sharif', stage: 'Registered', daysStuck: 32 },
  { id: '2', name: 'Sanjay Kumar Yadav', phone: '9744123456', district: 'Madhubani', block: 'Benipatti', stage: 'Profile Complete', daysStuck: 45 },
  { id: '3', name: 'Amit Kumar Chaudhary', phone: '9512345678', district: 'Gaya', block: 'Sherghati', stage: 'First Pond Added', daysStuck: 5 },
  { id: '4', name: 'Vikram Sen Verma', phone: '9988776655', district: 'Darbhanga', block: 'Baheri', stage: 'Active Cycle', daysStuck: 12 },
  { id: '5', name: 'Rajendra Kumar Mahto', phone: '9122334455', district: 'Muzaffarpur', block: 'Kanti', stage: 'Water Logging', daysStuck: 2 },
  { id: '6', name: 'Shyam Kishore Mandal', phone: '9433221100', district: 'Bhagalpur', block: 'Naugachhia', stage: 'Registered', daysStuck: 41 },
  { id: '7', name: 'Gopal Dev Prasad', phone: '9602481357', district: 'Patna', block: 'Mokama', stage: 'Profile Complete', daysStuck: 8 },
  { id: '8', name: 'Lallan Yadav', phone: '9547821690', district: 'Madhubani', block: 'Jhanjharpur', stage: 'First Pond Added', daysStuck: 58 },
  { id: '9', name: 'Devendra Kumar Ojha', phone: '9002154783', district: 'Gaya', block: 'Bodhgaya', stage: 'Active Cycle', daysStuck: 15 },
  { id: '10', name: 'Binod Kumar Sah', phone: '9888123477', district: 'Muzaffarpur', block: 'Bochahan', stage: 'Registered', daysStuck: 22 },
];

export default function FarmersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStage, setSelectedStage] = useState<string>('all');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');

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
    const rows = filteredFarmers.map((f) => [
      f.name,
      f.phone,
      f.district,
      f.block,
      f.stage,
      f.daysStuck,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `matsyamitra_farmers_funnel_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
              {/* Funnel width preview indicator */}
              <div className="w-full bg-glass-strong h-1.5 rounded-full mt-3 overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${stage.color} rounded-full`}
                  style={{ width: `${stage.pct}%` }}
                />
              </div>
              {/* Chevron arrows between columns on larger screens */}
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
                      <tr key={f.id} className="border-b border-glass-border/30 last:border-0 hover:bg-glass-subtle transition-colors">
                        <td className="py-3">
                          <div className="font-semibold text-ink-primary">{f.name}</div>
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
        </GlassCard>
      </div>
    </div>
  );
}
