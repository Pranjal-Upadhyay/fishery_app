'use client';

import { useState } from 'react';
import {
  BellRing,
  AlertTriangle,
  Send,
  UserCheck,
  CheckCircle,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';

// Types
interface AlertItem {
  id: string;
  type: 'Water Parameter' | 'Disease Outbreak';
  severity: 'critical' | 'warning';
  title: string;
  description: string;
  farmerName: string;
  phone: string;
  location: string;
  time: string;
  resolved: boolean;
}

// Mock Data
const MOCK_ALERTS: AlertItem[] = [
  { id: '1', type: 'Water Parameter', severity: 'critical', title: 'Critical Dissolved Oxygen Deficit', description: 'DO level measured at 2.4 mg/L (Minimum threshold: 3.5 mg/L). Fish starvation risk high.', farmerName: 'Hari Har Paswan', phone: '9512345678', location: 'Gaya, Sherghati block', time: '10 mins ago', resolved: false },
  { id: '2', type: 'Disease Outbreak', severity: 'critical', title: 'EUS Disease Symptoms Detected', description: 'Red spot lesions reported on standard Rohu crop. Gill discoloration observed.', farmerName: 'Ramesh Prasad Singh', phone: '9845012345', location: 'Patna, Phulwari Sharif block', time: '1 hr ago', resolved: false },
  { id: '3', type: 'Water Parameter', severity: 'warning', title: 'High Ammonia Concentration', description: 'Ammonia level measured at 0.08 ppm (Borderline threshold: 0.05 ppm).', farmerName: 'Sanjay Kumar Yadav', phone: '9744123456', location: 'Madhubani, Benipatti block', time: '2 hrs ago', resolved: false },
  { id: '4', type: 'Water Parameter', severity: 'warning', title: 'pH Alkaline Spike', description: 'pH level spiked to 9.2 (Normal range: 6.5 - 8.5). Algal bloom suspected.', farmerName: 'Gopal Dev Prasad', phone: '9602481357', location: 'Patna, Mokama block', time: '1 day ago', resolved: true },
];

const MOCK_DOCTORS = [
  { id: 'd1', name: 'Dr. Akhilesh Kumar', specialty: 'Vet Pathologist', phone: '9876543210' },
  { id: 'd2', name: 'Dr. Manoj Mishra', specialty: 'Water Biologist', phone: '9988776655' },
];

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertItem[]>(MOCK_ALERTS);
  const [dispatchTarget, setDispatchTarget] = useState<AlertItem | null>(null);
  const [selectedDocId, setSelectedDocId] = useState('');

  const handleSendSms = (alertId: string) => {
    setAlerts((prev) =>
      prev.map((a) => {
        if (a.id !== alertId) return a;
        alert(`SMS sent to ${a.farmerName} (${a.phone}): "MatsyaMitra Alert: Critical parameter detected in your pond. Please start aerators and add lime immediately."`);
        return { ...a, resolved: true };
      })
    );
  };

  const handleDispatchDoc = () => {
    if (!dispatchTarget || !selectedDocId) return;
    const doc = MOCK_DOCTORS.find((d) => d.id === selectedDocId);
    setAlerts((prev) =>
      prev.map((a) => {
        if (a.id !== dispatchTarget.id) return a;
        alert(`Specialist ${doc?.name} dispatched to ${a.farmerName}'s site in ${a.location}. SMS confirmation sent.`);
        return { ...a, resolved: true };
      })
    );
    setDispatchTarget(null);
    setSelectedDocId('');
  };

  return (
    <div className="flex flex-col gap-6 p-6 h-full overflow-y-auto">
      {/* Header */}
      <div>
        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-teal-400">
          Emergency Desk
        </div>
        <h1 className="text-2xl font-bold text-ink-primary">Outbreaks & Alerts Management</h1>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Active Alerts Stack */}
        <div className="xl:col-span-2 flex flex-col gap-4">
          <h2 className="text-sm font-bold text-ink-primary flex items-center gap-2">
            <BellRing className="h-4 w-4 text-teal-400" />
            Biological Active Alerts Feed
          </h2>

          <div className="space-y-4">
            {alerts.filter(a => !a.resolved).map((alertItem) => (
              <GlassCard
                key={alertItem.id}
                className={`p-5 border transition-all ${
                  alertItem.severity === 'critical'
                    ? 'border-rose-500/30 bg-rose-500/5'
                    : 'border-amber-500/30 bg-amber-500/5'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <span className={`grid h-8 w-8 place-items-center rounded-lg ${
                      alertItem.severity === 'critical'
                        ? 'bg-rose-500/15 text-rose-400'
                        : 'bg-amber-500/15 text-amber-400'
                    }`}>
                      <AlertTriangle className="h-4 w-4" />
                    </span>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                        {alertItem.type}
                      </span>
                      <h3 className="text-sm font-bold text-ink-primary mt-0.5">{alertItem.title}</h3>
                    </div>
                  </div>
                  <span className="text-xs text-ink-muted flex items-center gap-1 font-mono">
                    <Clock className="h-3 w-3" />
                    {alertItem.time}
                  </span>
                </div>

                <p className="text-xs text-ink-secondary mt-3 leading-relaxed">
                  {alertItem.description}
                </p>

                <div className="mt-4 flex flex-wrap justify-between items-center gap-3 pt-3 border-t border-glass-border/30">
                  <div className="text-xs">
                    <span className="font-semibold text-ink-primary">{alertItem.farmerName}</span>
                    <span className="text-ink-muted"> in {alertItem.location}</span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSendSms(alertItem.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/20 text-xs font-semibold hover:bg-teal-500/20 transition-colors"
                    >
                      <Send className="h-3 w-3" />
                      Send SMS Guidance
                    </button>
                    {alertItem.type === 'Disease Outbreak' && (
                      <button
                        onClick={() => setDispatchTarget(alertItem)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/20 text-xs font-semibold hover:bg-sky-500/20 transition-colors"
                      >
                        <UserCheck className="h-3 w-3" />
                        Dispatch Specialist Vet
                      </button>
                    )}
                  </div>
                </div>
              </GlassCard>
            ))}

            {alerts.filter(a => !a.resolved).length === 0 && (
              <div className="p-8 text-center border border-glass-border rounded-xl bg-canvas-900/50 text-teal-400 font-semibold flex items-center justify-center gap-2">
                <CheckCircle className="h-5 w-5" />
                All active biological alerts have been successfully resolved
              </div>
            )}
          </div>
        </div>

        {/* Right side: resolved alerts and Dispatch modal placeholder */}
        <div className="flex flex-col gap-6">
          {dispatchTarget && (
            <GlassCard className="p-5 border border-sky-500/30 bg-sky-500/5 space-y-4">
              <h3 className="text-sm font-bold text-ink-primary flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-sky-400" />
                Dispatch Veterinarian
              </h3>
              <div className="text-xs space-y-1">
                <div className="text-ink-muted">Outbreak Location</div>
                <div className="font-semibold text-ink-primary">{dispatchTarget.farmerName} ({dispatchTarget.location})</div>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-ink-muted block font-semibold">
                  Select Specialist Veterinary Doctor
                </label>
                <select
                  value={selectedDocId}
                  onChange={(e) => setSelectedDocId(e.target.value)}
                  className="w-full bg-canvas-950/80 border border-glass-border text-ink-secondary text-xs rounded-lg p-2.5 outline-none focus:border-sky-500/50 transition-colors"
                >
                  <option value="">-- Choose Vet --</option>
                  {MOCK_DOCTORS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.specialty})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleDispatchDoc}
                  disabled={!selectedDocId}
                  className="flex-1 py-2 rounded text-xs font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30 hover:bg-sky-500/30 disabled:opacity-50 disabled:pointer-events-none"
                >
                  Confirm Dispatch
                </button>
                <button
                  onClick={() => setDispatchTarget(null)}
                  className="px-3 py-2 rounded text-xs font-semibold bg-glass-strong text-ink-secondary border border-glass-border hover:text-ink-primary"
                >
                  Cancel
                </button>
              </div>
            </GlassCard>
          )}

          {/* Historical Resolved Alerts */}
          <GlassCard className="p-5 flex flex-col h-[380px]">
            <h3 className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-4 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-ink-muted" />
              Resolved Alerts Archive
            </h3>
            <div className="flex-1 overflow-y-auto space-y-3">
              {alerts.filter(a => a.resolved).map((histItem) => (
                <div key={histItem.id} className="p-3 rounded-lg border border-glass-border bg-canvas-950/20 flex justify-between items-center">
                  <div>
                    <h4 className="text-xs font-bold text-ink-primary">{histItem.title}</h4>
                    <div className="text-[10px] text-ink-muted mt-0.5">{histItem.farmerName} ({histItem.location})</div>
                  </div>
                  <span className="text-[10px] font-bold text-teal-400 flex items-center gap-1">
                    <CheckCircle className="h-3.5 w-3.5" />
                    Resolved
                  </span>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
