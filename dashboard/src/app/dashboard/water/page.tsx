'use client';

import { useState } from 'react';
import {
  Activity,
  Droplets,
  Thermometer,
  Wind,
  AlertTriangle,
  Search,
  CheckCircle,
  Calendar,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';

// Types
interface WaterLog {
  id: string;
  pondName: string;
  farmerName: string;
  district: string;
  ph: number;
  doLevel: number; // mg/L
  ammonia: number; // ppm
  temp: number; // °C
  loggedAt: string;
  status: 'safe' | 'alert' | 'critical';
}

// Mock Data
const MOCK_LOGS: WaterLog[] = [
  { id: '1', pondName: 'Pond A - Nursery', farmerName: 'Ramesh Prasad Singh', district: 'Patna', ph: 7.4, doLevel: 5.8, ammonia: 0.02, temp: 28.5, loggedAt: '2026-06-07 10:30', status: 'safe' },
  { id: '2', pondName: 'Pond B - Growout', farmerName: 'Sanjay Kumar Yadav', district: 'Madhubani', ph: 8.2, doLevel: 3.2, ammonia: 0.08, temp: 29.1, loggedAt: '2026-06-07 09:15', status: 'alert' },
  { id: '3', pondName: 'Pond 1 - Rearing', farmerName: 'Amit Kumar Chaudhary', district: 'Gaya', ph: 6.5, doLevel: 2.4, ammonia: 0.15, temp: 27.8, loggedAt: '2026-06-07 08:00', status: 'critical' },
  { id: '4', pondName: 'Main Growout', farmerName: 'Vikram Sen Verma', district: 'Darbhanga', ph: 7.1, doLevel: 6.2, ammonia: 0.01, temp: 28.2, loggedAt: '2026-06-06 17:45', status: 'safe' },
  { id: '5', pondName: 'Nursery Tank 3', farmerName: 'Rajendra Kumar Mahto', district: 'Muzaffarpur', ph: 7.8, doLevel: 4.5, ammonia: 0.04, temp: 28.9, loggedAt: '2026-06-06 16:30', status: 'safe' },
];

export default function WaterQualityPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Filter logic
  const filteredLogs = MOCK_LOGS.filter((log) => {
    const matchesSearch =
      log.pondName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.farmerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.district.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex flex-col gap-6 p-6 h-full overflow-y-auto">
      {/* Header */}
      <div>
        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-teal-400">
          Biological Safety
        </div>
        <h1 className="text-2xl font-bold text-ink-primary">Water Quality Analytics</h1>
      </div>

      {/* Parameter Summary Bento Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard className="p-4 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-sky-500/10 text-sky-400">
            <Droplets className="h-5 w-5" />
          </span>
          <div>
            <div className="text-xl font-mono font-bold text-ink-primary">7.6 pH</div>
            <div className="text-xs text-ink-muted">Avg Acidity Level (Safe)</div>
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-teal-500/10 text-teal-400">
            <Wind className="h-5 w-5" />
          </span>
          <div>
            <div className="text-xl font-mono font-bold text-ink-primary">4.9 mg/L</div>
            <div className="text-xs text-ink-muted">Avg Dissolved Oxygen</div>
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-amber-500/10 text-amber-400">
            <Thermometer className="h-5 w-5" />
          </span>
          <div>
            <div className="text-xl font-mono font-bold text-ink-primary">28.4°C</div>
            <div className="text-xs text-ink-muted">Avg Temperature</div>
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-rose-500/10 text-rose-400">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div>
            <div className="text-xl font-mono font-bold text-ink-primary">0.06 ppm</div>
            <div className="text-xs text-ink-muted">Avg Ammonia (Borderline)</div>
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compliance details */}
        <GlassCard className="p-5 lg:col-span-1">
          <h3 className="text-sm font-bold text-ink-primary mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-teal-400" />
            Parameter Compliance
          </h3>

          <div className="space-y-4">
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-ink-secondary">pH Stability (6.5 - 8.5)</span>
                <span className="font-mono text-teal-400 font-bold">92% compliant</span>
              </div>
              <div className="w-full bg-glass-strong h-1.5 rounded-full overflow-hidden">
                <div className="h-full bg-teal-500 rounded-full" style={{ width: '92%' }} />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-ink-secondary">Dissolved Oxygen (&gt; 4.0 mg/L)</span>
                <span className="font-mono text-teal-400 font-bold">81% compliant</span>
              </div>
              <div className="w-full bg-glass-strong h-1.5 rounded-full overflow-hidden">
                <div className="h-full bg-teal-500 rounded-full" style={{ width: '81%' }} />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-ink-secondary">Ammonia Limit (&lt; 0.05 ppm)</span>
                <span className="font-mono text-rose-400 font-bold">65% compliant</span>
              </div>
              <div className="w-full bg-glass-strong h-1.5 rounded-full overflow-hidden">
                <div className="h-full bg-rose-500 rounded-full" style={{ width: '65%' }} />
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Search & Logs list table */}
        <GlassCard className="p-5 lg:col-span-2">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
              <input
                type="text"
                placeholder="Search pond, farmer, district..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-canvas-950/80 border border-glass-border focus:border-teal-500/50 rounded-lg pl-9 pr-4 py-2 text-sm text-ink-primary placeholder-ink-muted outline-none transition-colors"
              />
            </div>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none bg-canvas-950/80 border border-glass-border text-ink-secondary text-xs rounded-lg pl-3 pr-8 py-2.5 outline-none focus:border-teal-500/50 transition-colors"
              >
                <option value="all">All Statuses</option>
                <option value="safe">Safe Only</option>
                <option value="alert">Alert Only</option>
                <option value="critical">Critical Only</option>
              </select>
              <Activity className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none text-ink-muted" />
            </div>
          </div>

          <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="text-ink-muted font-bold text-[10px] uppercase tracking-wider sticky top-0 z-10 border-b border-glass-border">
                  <th className="bg-canvas-950 py-3 text-left">Pond details</th>
                  <th className="bg-canvas-950 py-3 text-left">Parameters (pH / DO / NH3 / Temp)</th>
                  <th className="bg-canvas-950 py-3 text-right">Logged Time</th>
                  <th className="bg-canvas-950 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-ink-muted">
                      No water quality logs matched the criteria
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="border-b border-glass-border/30 last:border-0 hover:bg-glass-subtle transition-colors">
                      <td className="py-3">
                        <div className="font-semibold text-ink-primary">{log.pondName}</div>
                        <div className="text-xs text-ink-muted">{log.farmerName} ({log.district})</div>
                      </td>
                      <td className="py-3 font-mono text-xs text-ink-secondary">
                        <div className="flex gap-2">
                          <span className={log.ph < 6.5 || log.ph > 8.5 ? 'text-rose-400 font-bold' : ''}>
                            pH: {log.ph}
                          </span>
                          <span className={log.doLevel < 3.0 ? 'text-rose-400 font-bold' : log.doLevel < 4.0 ? 'text-amber-400 font-bold' : ''}>
                            DO: {log.doLevel}
                          </span>
                          <span className={log.ammonia > 0.1 ? 'text-rose-400 font-bold' : log.ammonia > 0.05 ? 'text-amber-400 font-bold' : ''}>
                            NH3: {log.ammonia}
                          </span>
                          <span>
                            Temp: {log.temp}°C
                          </span>
                        </div>
                      </td>
                      <td className="py-3 text-right text-xs text-ink-muted font-mono">
                        <div className="flex items-center justify-end gap-1">
                          <Calendar className="h-3 w-3" />
                          {log.loggedAt}
                        </div>
                      </td>
                      <td className="py-3 text-right">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          log.status === 'safe'
                            ? 'bg-teal-500/10 text-teal-400 border border-teal-500/25'
                            : log.status === 'alert'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/25'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/25 animate-pulse'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
