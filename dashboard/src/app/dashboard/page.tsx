'use client';

import { useState, useEffect } from 'react';
import { Eye, MapPin, X, Filter, Sparkles, Activity, ShieldCheck, ChevronRight, User, AlertTriangle } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { MapCanvas, type PondMapItem } from '@/components/map/map-canvas';
import { api } from '@/lib/api';
import { ApiEnvelope } from '@/lib/types';


// Mock Ponds with real-world metrics and geo-tagged mock coordinates
const INITIAL_PONDS: PondMapItem[] = [
  {
    id: 'p1',
    name: 'Pond B - Growout',
    farmerName: 'Sanjay Kumar Yadav',
    lat: 26.365,
    lng: 86.085,
    type: 'GROW_OUT',
    alertStatus: 'normal',
    district: 'Madhubani',
    species: 'Jayanti Rohu',
    system: 'Earthen',
    ownerType: 'OWNED',
    waterSource: 'SEASONAL',
    areaHectares: 1.2,
    photos: [
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=400&q=80',
      'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=400&q=80',
      'https://images.unsplash.com/photo-1516253593875-bd7ba052fbc5?auto=format&fit=crop&w=400&q=80',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    ],
  },
  {
    id: 'p2',
    name: 'Pond A - Nursery',
    farmerName: 'Ramesh Prasad Singh',
    lat: 25.580,
    lng: 85.120,
    type: 'NURSERY',
    alertStatus: 'normal',
    district: 'Patna',
    species: 'Standard Rohu',
    system: 'Earthen',
    ownerType: 'LEASED',
    waterSource: 'PERENNIAL',
    areaHectares: 0.8,
    photos: [
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=400&q=80',
      'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=400&q=80',
      'https://images.unsplash.com/photo-1516253593875-bd7ba052fbc5?auto=format&fit=crop&w=400&q=80',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    ],
  },
  {
    id: 'p3',
    name: 'Pond 1 - Rearing',
    farmerName: 'Hari Har Paswan',
    lat: 24.780,
    lng: 84.990,
    type: 'GROW_OUT',
    alertStatus: 'critical',
    alertReason: 'Dissolved Oxygen dropped to 2.8 mg/L (Min Threshold: 3.5)',
    district: 'Gaya',
    species: 'Standard Katla',
    system: 'Biofloc',
    ownerType: 'OWNED',
    waterSource: 'SEASONAL',
    areaHectares: 2.1,
    photos: [
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=400&q=80',
      'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=400&q=80',
      'https://images.unsplash.com/photo-1516253593875-bd7ba052fbc5?auto=format&fit=crop&w=400&q=80',
      'https://images.unsplash.com/photo-1621574539437-4b7cb63120b8?auto=format&fit=crop&w=400&q=80',
    ],
  },
  {
    id: 'p4',
    name: 'Main Cage Array',
    farmerName: 'Vikram Sen Verma',
    lat: 26.130,
    lng: 85.910,
    type: 'GROW_OUT',
    alertStatus: 'normal',
    district: 'Darbhanga',
    species: 'Amrita Katla',
    system: 'Cages',
    ownerType: 'LEASED',
    waterSource: 'PERENNIAL',
    areaHectares: 1.5,
    photos: [
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=400&q=80',
      'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=400&q=80',
      'https://images.unsplash.com/photo-1516253593875-bd7ba052fbc5?auto=format&fit=crop&w=400&q=80',
      'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=400&q=80',
    ],
  },

  {
    id: 'p7',
    name: 'Ganga RAS Unit 2',
    farmerName: 'Rajesh Kumar Singh',
    lat: 25.595,
    lng: 85.105,
    type: 'GROW_OUT',
    alertStatus: 'normal',
    district: 'Patna',
    species: 'Pangasius',
    system: 'RAS',
    ownerType: 'OWNED',
    waterSource: 'BOREWELL',
    areaHectares: 0.5,
    photos: [
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=400&q=80',
      'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=400&q=80',
      'https://images.unsplash.com/photo-1516253593875-bd7ba052fbc5?auto=format&fit=crop&w=400&q=80',
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80',
    ],
  },
];

export default function DashboardHome() {
  const [ponds, setPonds] = useState<PondMapItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPond, setSelectedPond] = useState<PondMapItem | null>(null);

  // Filter states
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
  const [selectedSpecies, setSelectedSpecies] = useState<string>('all');
  const [selectedSystem, setSelectedSystem] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showHeatmap, setShowHeatmap] = useState<boolean>(false);

  // Load live data from backend
  useEffect(() => {
    async function fetchLiveItems() {
      try {
        const res = await api.get<ApiEnvelope<PondMapItem[]>>('/api/v1/admin/atlas-items');
        if (res.success && res.data) {
          const doVal = parseFloat(localStorage.getItem('thresholds_do') || '3.5');
          const ammoniaVal = parseFloat(localStorage.getItem('thresholds_ammonia') || '0.05');

          const updatedItems = res.data.map((p) => {
            if (p.id === 'p3') {
              const currentDo = 2.8;
              if (currentDo < doVal) {
                return {
                  ...p,
                  alertStatus: 'critical' as const,
                  alertReason: `Critical: Dissolved Oxygen is ${currentDo} mg/L (Below threshold of ${doVal} mg/L)`,
                };
              }
            }
            return p;
          });
          setPonds([...INITIAL_PONDS, ...updatedItems]);
        }
      } catch (err) {
        console.error('Failed to fetch live atlas items:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchLiveItems();
  }, []);

  // Dynamic user-defined thresholds loaded from localStorage settings
  useEffect(() => {
    if (!isLoading && typeof window !== 'undefined') {
      const doVal = parseFloat(localStorage.getItem('thresholds_do') || '3.5');

      setPonds((prevPonds) =>
        prevPonds.map((p) => {
          if (p.id === 'p3') {
            const currentDo = 2.8;
            if (currentDo < doVal) {
              return {
                ...p,
                alertStatus: 'critical' as const,
                alertReason: `Critical: Dissolved Oxygen is ${currentDo} mg/L (Below threshold of ${doVal} mg/L)`,
              };
            }
          }
          return { ...p, alertStatus: p.alertStatus, alertReason: p.alertReason };
        })
      );
    }
  }, [isLoading]);

  // Filter application logic
  const filteredPonds = ponds.filter((p) => {
    const matchDistrict = selectedDistrict === 'all' || p.district === selectedDistrict;
    const matchSpecies = selectedSpecies === 'all' || p.species === selectedSpecies;
    const matchSystem = selectedSystem === 'all' || p.system === selectedSystem;
    const matchStatus = selectedStatus === 'all' || p.alertStatus === selectedStatus;
    return matchDistrict && matchSpecies && matchSystem && matchStatus;
  });

  // Dynamic counters
  const totalPonds = filteredPonds.length;
  const criticalAlertsCount = filteredPonds.filter((p) => p.alertStatus === 'critical').length;
  const hatcheriesCount = filteredPonds.filter((p) => p.type === 'HATCHERY').length;

  return (
    <div className="relative h-full w-full">
      {isLoading && (
        <div className="absolute inset-0 z-50 bg-canvas-950/80 backdrop-blur-md flex flex-col items-center justify-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-full border-2 border-teal-500/20 border-t-teal-400 animate-spin" />
            <Activity className="h-6 w-6 text-teal-400 absolute inset-0 m-auto animate-pulse" />
          </div>
          <p className="text-xs font-semibold text-ink-secondary tracking-widest uppercase animate-pulse">
            Loading Bihar Pond Atlas...
          </p>
        </div>
      )}
      {/* Hero element — the map fills the entire viewport */}
      <MapCanvas
        ponds={filteredPonds}
        selectedPondId={selectedPond?.id ?? null}
        onSelectPond={(p) => setSelectedPond(p)}
        showHeatmap={showHeatmap}
        selectedDistrict={selectedDistrict}
      />

      {/* Right-docked filter / live-view drawer — floats above the map */}
      <aside className="pointer-events-none absolute right-4 top-4 z-10 w-[340px] max-h-[90vh] overflow-y-auto space-y-4">
        {/* Live Counters */}
        <GlassCard variant="strong" className="pointer-events-auto p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.20em] text-teal-400 flex items-center gap-1.5">
                <Activity className="h-3 w-3" />
                Live Telemetry
              </div>
              <div className="mt-1 text-lg font-bold leading-tight text-ink-primary">
                Pond Atlas — Bihar
              </div>
            </div>
            <Eye className="h-4 w-4 text-teal-400" />
          </div>

          <div className="space-y-3 text-sm text-ink-secondary border-b border-glass-border/30 pb-4">
            <Stat label="Ponds mapped" value={totalPonds.toString()} />
            <Stat
              label="Critical alerts"
              value={criticalAlertsCount.toString()}
              highlight={criticalAlertsCount > 0}
            />
            <Stat label="Hatcheries online" value={hatcheriesCount.toString()} />
          </div>

          {/* Heatmap toggle — glass lozenge style matching the rest of the system.
              The whole row is clickable, the switch is purely visual. Below the
              row we surface what's currently being plotted (or what isn't, when
              there are no critical alerts in the active filter set). */}
          <div className="mt-4 pt-4 border-t border-glass-border/30">
            <button
              type="button"
              role="switch"
              aria-checked={showHeatmap}
              onClick={() => setShowHeatmap((v) => !v)}
              className="w-full group flex items-center gap-3 text-left"
            >
              <span
                aria-hidden
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-200 ${
                  showHeatmap
                    ? 'bg-gradient-to-r from-emerald-500/40 via-amber-500/40 to-rose-500/50 border-rose-400/40'
                    : 'bg-glass border-glass-border'
                }`}
              >
                <span
                  className={`absolute h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${
                    showHeatmap ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-ink-secondary group-hover:text-ink-primary transition-colors">
                  Outbreak Heatmap Overlay
                </div>
                <div className="text-[10px] text-ink-muted mt-0.5 leading-tight">
                  {showHeatmap
                    ? criticalAlertsCount > 0
                      ? `Density of ${criticalAlertsCount} critical ${
                          criticalAlertsCount === 1 ? 'alert' : 'alerts'
                        } shown — markers dimmed`
                      : 'On — no critical alerts in this view'
                    : 'Toggle to visualise hotspot density'}
                </div>
              </div>
            </button>
          </div>
        </GlassCard>

        {/* Filters Panel */}
        <GlassCard variant="strong" className="pointer-events-auto p-5 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-teal-400 uppercase tracking-wider">
            <Filter className="h-3.5 w-3.5" />
            Atlas Filters
          </div>

          <div className="space-y-3.5 text-xs">
            {/* District Filter */}
            <div className="space-y-1">
              <label className="text-ink-muted block">District</label>
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="w-full bg-canvas-950 border border-glass-border rounded-lg p-2 text-ink-secondary outline-none focus:border-teal-500/50"
              >
                <option value="all">All Districts</option>
                {Array.from(new Set(ponds.map((p) => p.district).filter(Boolean)))
                  .sort()
                  .map((dist) => (
                    <option key={dist} value={dist}>
                      {dist}
                    </option>
                  ))}
              </select>
            </div>

            {/* Species Filter */}
            <div className="space-y-1">
              <label className="text-ink-muted block">Species Stocked</label>
              <select
                value={selectedSpecies}
                onChange={(e) => setSelectedSpecies(e.target.value)}
                className="w-full bg-canvas-950 border border-glass-border rounded-lg p-2 text-ink-secondary outline-none focus:border-teal-500/50"
              >
                <option value="all">All Species</option>
                {Array.from(new Set(ponds.map((p) => p.species).filter(Boolean)))
                  .sort()
                  .map((sp) => (
                    <option key={sp} value={sp}>
                      {sp}
                    </option>
                  ))}
              </select>
            </div>

            {/* Culture System Filter */}
            <div className="space-y-1">
              <label className="text-ink-muted block">Culture System</label>
              <select
                value={selectedSystem}
                onChange={(e) => setSelectedSystem(e.target.value)}
                className="w-full bg-canvas-950 border border-glass-border rounded-lg p-2 text-ink-secondary outline-none focus:border-teal-500/50"
              >
                <option value="all">All Systems</option>
                {Array.from(new Set(ponds.map((p) => p.system).filter(Boolean)))
                  .sort()
                  .map((sys) => (
                    <option key={sys} value={sys}>
                      {sys}
                    </option>
                  ))}
              </select>
            </div>

            {/* Alert Status Filter */}
            <div className="space-y-1">
              <label className="text-ink-muted block">Health Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full bg-canvas-950 border border-glass-border rounded-lg p-2 text-ink-secondary outline-none focus:border-teal-500/50"
              >
                <option value="all">All Conditions</option>
                <option value="normal">Normal</option>
                <option value="critical">Critical Outbreaks</option>
              </select>
            </div>
          </div>
        </GlassCard>
      </aside>

      {/* Selected Pond details Slide-over inspection drawer */}
      {selectedPond && (
        <div className="absolute left-4 top-4 bottom-4 z-20 w-[360px] pointer-events-none">
          <GlassCard variant="solid" className="pointer-events-auto h-full p-5 flex flex-col gap-4 shadow-glow border-teal-500/25 overflow-y-auto">
            {/* Drawer Header */}
            <div className="flex justify-between items-start border-b border-glass-border/30 pb-3">
              <div>
                <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                  selectedPond.alertStatus === 'critical'
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    : 'bg-teal-500/10 text-teal-400 border-teal-500/20'
                }`}>
                  {selectedPond.type.replace('_', ' ')}
                </span>
                <h3 className="text-lg font-bold text-ink-primary mt-1.5">{selectedPond.name}</h3>
                <span className="text-xs text-ink-muted flex items-center gap-1 mt-0.5">
                  <User className="h-3 w-3" />
                  Owner: {selectedPond.farmerName}
                </span>
              </div>
              <button
                onClick={() => setSelectedPond(null)}
                className="p-1 rounded-lg bg-glass border border-glass-border text-ink-secondary hover:text-ink-primary hover:bg-glass-strong transition-all"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Alert Warning */}
            {selectedPond.alertStatus === 'critical' && (
              <div className="p-3 rounded-lg border border-rose-500/25 bg-rose-500/10 text-rose-300 text-xs leading-relaxed flex gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
                <div>
                  <div className="font-bold">Active Ecological Alert</div>
                  <div className="mt-0.5">{selectedPond.alertReason}</div>
                </div>
              </div>
            )}

            {/* Pond Specs */}
            <div className="space-y-3 text-xs">
              <h4 className="font-bold text-teal-400 uppercase tracking-wider text-[10px]">
                Survey Specifications
              </h4>
              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border border-glass-border bg-canvas-950/40">
                <div>
                  <span className="text-[10px] text-ink-muted">Land Area</span>
                  <div className="font-semibold text-ink-primary mt-0.5">{selectedPond.areaHectares} Hectares</div>
                </div>
                <div>
                  <span className="text-[10px] text-ink-muted">Water Source</span>
                  <div className="font-semibold text-ink-primary mt-0.5 capitalize">{selectedPond.waterSource.toLowerCase()}</div>
                </div>
                <div>
                  <span className="text-[10px] text-ink-muted">Culture System</span>
                  <div className="font-semibold text-ink-primary mt-0.5">{selectedPond.system}</div>
                </div>
                <div>
                  <span className="text-[10px] text-ink-muted">Stock Species</span>
                  <div className="font-semibold text-ink-primary mt-0.5">{selectedPond.species}</div>
                </div>
                <div className="col-span-2 border-t border-glass-border/20 pt-2 flex justify-between items-center text-[10px] font-mono text-ink-muted">
                  <span>GPS: {selectedPond.lat.toFixed(4)} N, {selectedPond.lng.toFixed(4)} E</span>
                  <span className="capitalize">{selectedPond.ownerType.toLowerCase()} holding</span>
                </div>
              </div>
            </div>

            {/* Water Quality Telemetry */}
            <div className="space-y-2.5 text-xs">
              <h4 className="font-bold text-teal-400 uppercase tracking-wider text-[10px]">
                Live Water Chemistry parameters
              </h4>
              <div className="grid grid-cols-4 gap-2 text-center font-mono">
                <div className="p-2 rounded bg-canvas-950/40 border border-glass-border/25">
                  <div className="text-[9px] text-ink-muted">pH</div>
                  <div className="font-bold text-teal-400 mt-0.5">{selectedPond.id === 'p3' ? '6.4' : '7.4'}</div>
                </div>
                <div className="p-2 rounded bg-canvas-950/40 border border-glass-border/25">
                  <div className="text-[9px] text-ink-muted">DO</div>
                  <div className={`font-bold mt-0.5 ${selectedPond.id === 'p3' ? 'text-rose-400' : 'text-teal-400'}`}>
                    {selectedPond.id === 'p3' ? '2.8' : '5.2'}
                  </div>
                </div>
                <div className="p-2 rounded bg-canvas-950/40 border border-glass-border/25">
                  <div className="text-[9px] text-ink-muted">Temp</div>
                  <div className="font-bold text-teal-400 mt-0.5">27°C</div>
                </div>
                <div className="p-2 rounded bg-canvas-950/40 border border-glass-border/25">
                  <div className="text-[9px] text-ink-muted">NH3</div>
                  <div className={`font-bold mt-0.5 ${selectedPond.id === 'p6' ? 'text-rose-400' : 'text-teal-400'}`}>
                    {selectedPond.id === 'p6' ? '0.12' : '0.02'}
                  </div>
                </div>
              </div>
            </div>

            {/* Survey Photos Grid */}
            <div className="space-y-2.5 flex-1">
              <h4 className="font-bold text-teal-400 uppercase tracking-wider text-[10px]">
                Mobile Survey Photos
              </h4>
              <div className="grid grid-cols-2 gap-2 h-36">
                <div className="relative rounded overflow-hidden border border-glass-border">
                  <img src={selectedPond.photos[0]} alt="Wide angle" className="object-cover w-full h-full" />
                  <span className="absolute bottom-1 left-1 bg-black/60 px-1 py-0.5 rounded text-[8px] font-mono text-white">Wide</span>
                </div>
                <div className="relative rounded overflow-hidden border border-glass-border">
                  <img src={selectedPond.photos[1]} alt="Embankment" className="object-cover w-full h-full" />
                  <span className="absolute bottom-1 left-1 bg-black/60 px-1 py-0.5 rounded text-[8px] font-mono text-white">Embankment</span>
                </div>
                <div className="relative rounded overflow-hidden border border-glass-border">
                  <img src={selectedPond.photos[2]} alt="Close view" className="object-cover w-full h-full" />
                  <span className="absolute bottom-1 left-1 bg-black/60 px-1 py-0.5 rounded text-[8px] font-mono text-white">Close</span>
                </div>
                <div className="relative rounded overflow-hidden border border-glass-border">
                  <img src={selectedPond.photos[3]} alt="Farmer" className="object-cover w-full h-full" />
                  <span className="absolute bottom-1 left-1 bg-black/60 px-1 py-0.5 rounded text-[8px] font-mono text-white">Farmer</span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <a
              href={`/dashboard/farmers?search=${encodeURIComponent(selectedPond.farmerName)}`}
              className="w-full py-2.5 rounded-lg text-xs font-semibold text-center bg-teal-500/10 text-teal-300 border border-teal-500/30 hover:bg-teal-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              View Farmer Profile
              <ChevronRight className="h-3 w-3" />
            </a>
          </GlassCard>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, hint, highlight }: { label: string; value: string; hint?: string; highlight?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-ink-secondary">{label}</span>
      <div className="text-right">
        <div className={`font-mono font-tabular text-base font-bold ${
          highlight ? 'text-rose-400 animate-pulse' : 'text-ink-primary'
        }`}>{value}</div>
        {hint ? <div className="text-[11px] text-ink-muted">{hint}</div> : null}
      </div>
    </div>
  );
}

