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
  X,
  Phone,
  MapPin,
  Send,
  FlaskConical,
  Download,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';

// CSV Export helper
function exportWaterQualityToCSV(logs: WaterLog[]) {
  const headers = [
    'Pond Name',
    'Farmer Name',
    'District',
    'Phone',
    'Species',
    'pH',
    'Dissolved Oxygen (mg/L)',
    'Ammonia (ppm)',
    'Temperature (°C)',
    'Logged At',
    'Status',
  ];

  const rows = logs.map((l) => [
    `"${l.pondName}"`,
    l.farmerName,
    l.district,
    l.phone,
    l.species,
    l.ph,
    l.doLevel,
    l.ammonia,
    l.temp,
    l.loggedAt,
    l.status.charAt(0).toUpperCase() + l.status.slice(1),
  ]);

  const csvContent = [headers, ...rows].map((r) => r.join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `water_quality_export_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Types
interface WaterLog {
  id: string;
  pondName: string;
  farmerName: string;
  district: string;
  phone: string;
  species: string;
  ph: number;
  doLevel: number;
  ammonia: number;
  temp: number;
  loggedAt: string;
  status: 'safe' | 'alert' | 'critical';
}

// Mock Data
const MOCK_LOGS: WaterLog[] = [
  { id: '1', pondName: 'Pond A - Nursery', farmerName: 'Ramesh Prasad Singh', district: 'Patna', phone: '9845012345', species: 'Standard Rohu', ph: 7.4, doLevel: 5.8, ammonia: 0.02, temp: 28.5, loggedAt: '2026-06-07 10:30', status: 'safe' },
  { id: '2', pondName: 'Pond B - Growout', farmerName: 'Sanjay Kumar Yadav', district: 'Madhubani', phone: '9744123456', species: 'Jayanti Rohu', ph: 8.2, doLevel: 3.2, ammonia: 0.08, temp: 29.1, loggedAt: '2026-06-07 09:15', status: 'alert' },
  { id: '3', pondName: 'Pond 1 - Rearing', farmerName: 'Hari Har Paswan', district: 'Gaya', phone: '9512345678', species: 'Standard Katla', ph: 6.5, doLevel: 2.4, ammonia: 0.15, temp: 27.8, loggedAt: '2026-06-07 08:00', status: 'critical' },
  { id: '4', pondName: 'Main Growout', farmerName: 'Vikram Sen Verma', district: 'Darbhanga', phone: '9988776655', species: 'Amrita Katla', ph: 7.1, doLevel: 6.2, ammonia: 0.01, temp: 28.2, loggedAt: '2026-06-06 17:45', status: 'safe' },
  { id: '5', pondName: 'Nursery Tank 3', farmerName: 'Rajendra Kumar Mahto', district: 'Muzaffarpur', phone: '9122334455', species: 'Jayanti Rohu', ph: 7.8, doLevel: 4.5, ammonia: 0.04, temp: 28.9, loggedAt: '2026-06-06 16:30', status: 'safe' },
];

// Parameter info for educational modals
const PARAM_INFO = {
  ph: {
    title: 'pH — Acidity / Alkalinity',
    icon: <FlaskConical className="h-6 w-6" />,
    color: 'text-sky-400',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/30',
    safeRange: '6.5 – 8.5',
    currentAvg: '7.6 pH',
    status: 'Safe',
    statusColor: 'text-teal-400',
    description: 'pH measures the acidity or alkalinity of pond water. Fish thrive in a neutral-to-slightly alkaline range of 6.5–8.5.',
    effects: [
      { level: '< 6.5 (Acidic)', impact: 'Stress, mucus hypersecretion, reduced feed intake, susceptibility to fungal disease.', color: 'text-amber-400' },
      { level: '6.5 – 8.5 (Safe)', impact: 'Optimal gill function, enzyme activity, and nutrient absorption. Algal bloom controlled.', color: 'text-teal-400' },
      { level: '> 8.5 (Alkaline)', impact: 'Algal bloom, unionized ammonia toxicity increases 10x, phytoplankton die-off.', color: 'text-rose-400' },
    ],
    action: 'If pH drops below 6.5, apply agricultural lime (CaO) at 200 kg/ha. If above 8.5, apply alum at 15–20 ppm.',
  },
  do: {
    title: 'DO — Dissolved Oxygen',
    icon: <Wind className="h-6 w-6" />,
    color: 'text-teal-400',
    bg: 'bg-teal-500/10',
    border: 'border-teal-500/30',
    safeRange: '> 4.0 mg/L',
    currentAvg: '4.9 mg/L',
    status: 'Borderline',
    statusColor: 'text-amber-400',
    description: 'Dissolved Oxygen (DO) is the amount of oxygen dissolved in pond water. It is essential for fish respiration and decomposition of organic waste.',
    effects: [
      { level: '< 2.0 mg/L (Critical)', impact: 'Mass mortality within hours. Fish surface for air ("piping"). Emergency aeration needed.', color: 'text-rose-400' },
      { level: '2.0 – 4.0 mg/L (Warning)', impact: 'Chronic stress, feed conversion ratio worsens, immunity weakened, growth slows.', color: 'text-amber-400' },
      { level: '> 4.0 mg/L (Safe)', impact: 'Optimal respiration, efficient feed assimilation, healthy gill development.', color: 'text-teal-400' },
    ],
    action: 'Run paddle aerators immediately if DO drops below 3 mg/L. Aerate 6+ hours daily during summer. Reduce feed rate to prevent decomposition load.',
  },
  temp: {
    title: 'Temperature — Thermal Stress',
    icon: <Thermometer className="h-6 w-6" />,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    safeRange: '25°C – 32°C',
    currentAvg: '28.4°C',
    status: 'Safe',
    statusColor: 'text-teal-400',
    description: 'Water temperature governs metabolic rate, feeding behavior, and immune response in Indian Major Carp species.',
    effects: [
      { level: '< 18°C (Cold Stress)', impact: 'Near-zero feeding, metabolic dormancy, bacterial infection vulnerability increases.', color: 'text-sky-400' },
      { level: '18°C – 25°C (Sub-Optimal)', impact: 'Reduced appetite and growth rate; acceptable but not ideal for intensive culture.', color: 'text-amber-400' },
      { level: '25°C – 32°C (Optimal)', impact: 'Maximum feed conversion, rapid growth, high immune responsiveness.', color: 'text-teal-400' },
      { level: '> 34°C (Heat Stress)', impact: 'Oxygen solubility falls sharply; thermal shock can cause hemorrhage and death.', color: 'text-rose-400' },
    ],
    action: 'In summer, increase water depth to 1.5–2m. Shade 30% surface with aquatic plants. Aerate during peak heat (12pm–4pm). Avoid feeding during heat stress.',
  },
  ammonia: {
    title: 'Ammonia (NH₃) — Toxicity Monitor',
    icon: <AlertTriangle className="h-6 w-6" />,
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    safeRange: '< 0.05 ppm',
    currentAvg: '0.06 ppm',
    status: '⚠ Borderline',
    statusColor: 'text-amber-400',
    description: 'Ammonia is a metabolic waste product of fish. In unionized form (NH₃), it is highly toxic, damaging gills, liver, and kidneys even at very low concentrations.',
    effects: [
      { level: '< 0.02 ppm (Excellent)', impact: 'Zero toxicity. Ideal for broodstock and seed production.', color: 'text-teal-400' },
      { level: '0.02 – 0.05 ppm (Acceptable)', impact: 'Sub-lethal stress. Some gill irritation. Acceptable for grow-out.', color: 'text-amber-400' },
      { level: '0.05 – 0.20 ppm (Warning)', impact: 'Gill damage, immune suppression, chronic mortality. Reduce feeding immediately.', color: 'text-amber-400' },
      { level: '> 0.20 ppm (Critical)', impact: 'Acute mass mortality. Fish hemorrhage and gasping. Emergency water exchange.', color: 'text-rose-400' },
    ],
    action: 'Reduce feed by 50%. Apply zeolite (clinoptilolite) at 500 kg/ha to adsorb ammonia. Increase aeration. Partial water exchange (20-30%) immediately.',
  },
};

type ParamKey = keyof typeof PARAM_INFO;

export default function WaterQualityPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeParam, setActiveParam] = useState<ParamKey | null>(null);
  const [selectedLog, setSelectedLog] = useState<WaterLog | null>(null);
  const [notifiedPonds, setNotifiedPonds] = useState<Set<string>>(new Set());

  // Filter logic
  const filteredLogs = MOCK_LOGS.filter((log) => {
    const matchesSearch =
      log.pondName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.farmerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.district.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSendNotification = (log: WaterLog) => {
    setNotifiedPonds((prev) => new Set([...prev, log.id]));
    alert(
      `📱 Corrective notification sent to ${log.farmerName} (${log.phone}):\n\n` +
      `"⚠️ MatsyaMitra Water Alert: Your pond "${log.pondName}" shows critical parameters. ` +
      `Immediate corrective action recommended. Contact your field officer or call 1800-XXX-XXXX for guidance."`
    );
  };

  const paramInfo = activeParam ? PARAM_INFO[activeParam] : null;

  return (
    <div className="flex flex-col gap-6 p-6 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-teal-400">
            Biological Safety
          </div>
          <h1 className="text-2xl font-bold text-ink-primary">Water Quality Analytics</h1>
        </div>
        <button
          onClick={() => exportWaterQualityToCSV(MOCK_LOGS)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-500/10 text-teal-300 border border-teal-500/20 text-xs font-semibold hover:bg-teal-500/20 transition-colors mt-1"
        >
          <Download className="h-3.5 w-3.5" />
          Export to CSV
        </button>
      </div>

      {/* Parameter Summary Bento Grid — clickable */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard
          className="p-4 flex items-center gap-3 cursor-pointer hover:border-sky-500/40 hover:bg-sky-500/5 transition-all group"
          onClick={() => setActiveParam('ph')}
        >
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-sky-500/10 text-sky-400 group-hover:bg-sky-500/20 transition-colors">
            <Droplets className="h-5 w-5" />
          </span>
          <div>
            <div className="text-xl font-mono font-bold text-ink-primary">7.6 pH</div>
            <div className="text-xs text-ink-muted">Avg Acidity Level (Safe)</div>
            <div className="text-[10px] text-sky-400 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">Click to learn more ↗</div>
          </div>
        </GlassCard>

        <GlassCard
          className="p-4 flex items-center gap-3 cursor-pointer hover:border-teal-500/40 hover:bg-teal-500/5 transition-all group"
          onClick={() => setActiveParam('do')}
        >
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-teal-500/10 text-teal-400 group-hover:bg-teal-500/20 transition-colors">
            <Wind className="h-5 w-5" />
          </span>
          <div>
            <div className="text-xl font-mono font-bold text-ink-primary">4.9 mg/L</div>
            <div className="text-xs text-ink-muted">Avg Dissolved Oxygen</div>
            <div className="text-[10px] text-teal-400 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">Click to learn more ↗</div>
          </div>
        </GlassCard>

        <GlassCard
          className="p-4 flex items-center gap-3 cursor-pointer hover:border-amber-500/40 hover:bg-amber-500/5 transition-all group"
          onClick={() => setActiveParam('temp')}
        >
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20 transition-colors">
            <Thermometer className="h-5 w-5" />
          </span>
          <div>
            <div className="text-xl font-mono font-bold text-ink-primary">28.4°C</div>
            <div className="text-xs text-ink-muted">Avg Temperature</div>
            <div className="text-[10px] text-amber-400 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">Click to learn more ↗</div>
          </div>
        </GlassCard>

        <GlassCard
          className="p-4 flex items-center gap-3 cursor-pointer hover:border-rose-500/40 hover:bg-rose-500/5 transition-all group"
          onClick={() => setActiveParam('ammonia')}
        >
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-rose-500/10 text-rose-400 group-hover:bg-rose-500/20 transition-colors">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div>
            <div className="text-xl font-mono font-bold text-ink-primary">0.06 ppm</div>
            <div className="text-xs text-ink-muted">Avg Ammonia (Borderline)</div>
            <div className="text-[10px] text-rose-400 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">Click to learn more ↗</div>
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

          <div className="mt-5 p-3 rounded-lg border border-glass-border/40 bg-canvas-950/30 text-[10px] text-ink-muted">
            💡 Click any parameter card above to understand the biological safety zones and recommended corrective actions.
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
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className="border-b border-glass-border/30 last:border-0 hover:bg-glass-subtle transition-colors cursor-pointer group"
                    >
                      <td className="py-3">
                        <div className="font-semibold text-ink-primary group-hover:text-teal-400 transition-colors">{log.pondName}</div>
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
          <div className="mt-3 text-[10px] text-ink-muted text-center">
            Click any row to open pond owner details and send corrective notifications ↗
          </div>
        </GlassCard>
      </div>

      {/* ── Parameter Educational Modal ─────────────────────────── */}
      {paramInfo && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setActiveParam(null); }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setActiveParam(null)} />
          <GlassCard className={`relative z-10 w-full max-w-xl p-6 shadow-glow border max-h-[85vh] overflow-y-auto flex flex-col gap-5 ${paramInfo.border}`}>
            {/* Header */}
            <div className="flex justify-between items-start border-b border-glass-border/40 pb-4">
              <div className="flex items-center gap-3">
                <span className={`grid h-10 w-10 place-items-center rounded-lg ${paramInfo.bg} ${paramInfo.color}`}>
                  {paramInfo.icon}
                </span>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-400">Parameter Science</div>
                  <h2 className="text-lg font-bold text-ink-primary">{paramInfo.title}</h2>
                </div>
              </div>
              <button
                onClick={() => setActiveParam(null)}
                className="p-1.5 rounded-lg hover:bg-glass border border-transparent hover:border-glass-border text-ink-secondary transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Current reading */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-lg border border-glass-border bg-canvas-950/40">
                <div className="text-[10px] text-ink-muted uppercase tracking-wider">Current Avg</div>
                <div className={`text-lg font-mono font-bold mt-0.5 ${paramInfo.color}`}>{paramInfo.currentAvg}</div>
              </div>
              <div className="p-3 rounded-lg border border-glass-border bg-canvas-950/40">
                <div className="text-[10px] text-ink-muted uppercase tracking-wider">Safe Range</div>
                <div className="text-sm font-bold text-ink-primary mt-0.5">{paramInfo.safeRange}</div>
              </div>
              <div className="p-3 rounded-lg border border-glass-border bg-canvas-950/40">
                <div className="text-[10px] text-ink-muted uppercase tracking-wider">Fleet Status</div>
                <div className={`text-sm font-bold mt-0.5 ${paramInfo.statusColor}`}>{paramInfo.status}</div>
              </div>
            </div>

            {/* Description */}
            <p className="text-sm text-ink-secondary leading-relaxed">{paramInfo.description}</p>

            {/* Effect levels */}
            <div className="space-y-2.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Concentration Effects on Indian Major Carp</div>
              {paramInfo.effects.map((eff, i) => (
                <div key={i} className="p-3 rounded-lg border border-glass-border/40 bg-canvas-950/30 text-xs">
                  <div className={`font-bold ${eff.color} mb-1`}>{eff.level}</div>
                  <div className="text-ink-secondary">{eff.impact}</div>
                </div>
              ))}
            </div>

            {/* Corrective action */}
            <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 text-xs">
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-1.5">Recommended Corrective Action</div>
              <p className="text-ink-secondary leading-relaxed">{paramInfo.action}</p>
            </div>
          </GlassCard>
        </div>
      )}

      {/* ── Pond Owner Detail Modal ─────────────────────────────── */}
      {selectedLog && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedLog(null); }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedLog(null)} />
          <GlassCard className={`relative z-10 w-full max-w-lg p-6 shadow-glow max-h-[85vh] overflow-y-auto flex flex-col gap-5 border ${
            selectedLog.status === 'critical' ? 'border-rose-500/30' : selectedLog.status === 'alert' ? 'border-amber-500/30' : 'border-teal-500/30'
          }`}>
            {/* Header */}
            <div className="flex justify-between items-start border-b border-glass-border/40 pb-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-400">Pond Owner Details</div>
                <h2 className="text-lg font-bold text-ink-primary mt-1">{selectedLog.pondName}</h2>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded-lg hover:bg-glass border border-transparent hover:border-glass-border text-ink-secondary transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Owner info */}
            <div className="p-4 rounded-xl border border-glass-border bg-canvas-950/40 space-y-2.5 text-xs">
              <div className="text-[10px] font-bold uppercase tracking-wider text-teal-400">Farmer Contact</div>
              <div className="font-semibold text-ink-primary text-sm">{selectedLog.farmerName}</div>
              <a href={`tel:${selectedLog.phone}`} className="flex items-center gap-2 text-ink-secondary hover:text-teal-400 transition-colors">
                <Phone className="h-3.5 w-3.5" />
                <span className="font-mono">{selectedLog.phone}</span>
              </a>
              <div className="flex items-center gap-2 text-ink-secondary">
                <MapPin className="h-3.5 w-3.5" />
                <span>{selectedLog.district} District, Bihar</span>
              </div>
            </div>

            {/* Current readings */}
            <div className="space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-teal-400">Current Water Parameters</div>
              <div className="grid grid-cols-4 gap-2 text-center font-mono text-xs">
                <div className={`p-2.5 rounded-lg border ${selectedLog.ph < 6.5 || selectedLog.ph > 8.5 ? 'border-rose-500/30 bg-rose-500/5' : 'border-glass-border bg-canvas-950/40'}`}>
                  <div className="text-[9px] text-ink-muted uppercase">pH</div>
                  <div className={`font-bold mt-0.5 ${selectedLog.ph < 6.5 || selectedLog.ph > 8.5 ? 'text-rose-400' : 'text-ink-primary'}`}>{selectedLog.ph}</div>
                </div>
                <div className={`p-2.5 rounded-lg border ${selectedLog.doLevel < 3.0 ? 'border-rose-500/30 bg-rose-500/5' : selectedLog.doLevel < 4.0 ? 'border-amber-500/30 bg-amber-500/5' : 'border-glass-border bg-canvas-950/40'}`}>
                  <div className="text-[9px] text-ink-muted uppercase">DO</div>
                  <div className={`font-bold mt-0.5 ${selectedLog.doLevel < 3.0 ? 'text-rose-400' : selectedLog.doLevel < 4.0 ? 'text-amber-400' : 'text-ink-primary'}`}>{selectedLog.doLevel}</div>
                </div>
                <div className={`p-2.5 rounded-lg border ${selectedLog.ammonia > 0.1 ? 'border-rose-500/30 bg-rose-500/5' : selectedLog.ammonia > 0.05 ? 'border-amber-500/30 bg-amber-500/5' : 'border-glass-border bg-canvas-950/40'}`}>
                  <div className="text-[9px] text-ink-muted uppercase">NH₃</div>
                  <div className={`font-bold mt-0.5 ${selectedLog.ammonia > 0.1 ? 'text-rose-400' : selectedLog.ammonia > 0.05 ? 'text-amber-400' : 'text-ink-primary'}`}>{selectedLog.ammonia}</div>
                </div>
                <div className="p-2.5 rounded-lg border border-glass-border bg-canvas-950/40">
                  <div className="text-[9px] text-ink-muted uppercase">Temp</div>
                  <div className="font-bold text-ink-primary mt-0.5">{selectedLog.temp}°</div>
                </div>
              </div>
            </div>

            {/* Status + Species */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg border border-glass-border bg-canvas-950/40">
                <div className="text-[10px] text-ink-muted uppercase">Species Cultured</div>
                <div className="font-semibold text-ink-primary mt-0.5">{selectedLog.species}</div>
              </div>
              <div className="p-3 rounded-lg border border-glass-border bg-canvas-950/40">
                <div className="text-[10px] text-ink-muted uppercase">Last Logged</div>
                <div className="font-semibold text-ink-primary mt-0.5">{selectedLog.loggedAt}</div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-2 border-t border-glass-border/40">
              <a
                href={`tel:${selectedLog.phone}`}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-teal-500/10 text-teal-300 border border-teal-500/30 hover:bg-teal-500/20 text-xs font-semibold transition-colors"
              >
                <Phone className="h-4 w-4" />
                Call Farmer
              </a>
              {selectedLog.status !== 'safe' && (
                <button
                  onClick={() => handleSendNotification(selectedLog)}
                  disabled={notifiedPonds.has(selectedLog.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold transition-colors border ${
                    notifiedPonds.has(selectedLog.id)
                      ? 'bg-teal-500/5 text-teal-400/50 border-teal-500/10 pointer-events-none'
                      : 'bg-rose-500/10 text-rose-300 border-rose-500/30 hover:bg-rose-500/20'
                  }`}
                >
                  <Send className="h-4 w-4" />
                  {notifiedPonds.has(selectedLog.id) ? 'Notified ✓' : 'Send Alert Notification'}
                </button>
              )}
              {selectedLog.status === 'safe' && (
                <div className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-teal-500/5 text-teal-400 border border-teal-500/20 text-xs font-semibold">
                  <CheckCircle className="h-4 w-4" />
                  Parameters Normal
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
