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
  ChevronDown,
  ChevronUp,
  Phone,
  MapPin,
  Smartphone,
  Navigation,
  Download,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { ExportButton } from '@/components/ui/export-button';
import { api } from '@/lib/api';

function exportAlertsToCSV(alerts: AlertItem[]) {
  const headers = [
    'Alert ID',
    'Alert Type',
    'Severity',
    'Title',
    'Farmer Name',
    'Phone',
    'Location',
    'GPS Coordinates',
    'Date & Time',
    'Status',
    'Description',
    'Recommendation',
  ];

  const escapeCSV = (val: any): string => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = alerts.map((a) => [
    a.id,
    a.type,
    a.severity === 'critical' ? 'Critical' : 'Warning',
    a.title,
    a.farmerName,
    a.phone,
    a.location,
    a.coords,
    a.time,
    a.resolved ? 'Resolved' : 'Active',
    a.description,
    a.recommendation,
  ].map(escapeCSV));

  const csvContent = [headers.map(escapeCSV), ...rows].map((r) => r.join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `alerts_export_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

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
  coords: string;
  time: string;
  resolved: boolean;
  recommendation: string;
}

// Mock Data
const MOCK_ALERTS: AlertItem[] = [
  {
    id: '1',
    type: 'Water Parameter',
    severity: 'critical',
    title: 'Critical Dissolved Oxygen Deficit',
    description: 'DO level measured at 2.4 mg/L (Minimum threshold: 3.5 mg/L). Fish starvation risk high.',
    farmerName: 'Hari Har Paswan',
    phone: '9512345678',
    location: 'Gaya, Sherghati block',
    coords: '24.7801° N, 84.9902° E',
    time: '10 mins ago',
    resolved: false,
    recommendation: 'Start paddle aerator immediately. Add agricultural lime (CaO) at 200 kg/ha. Check for algal bloom at surface. Re-measure DO in 2 hours.',
  },
  {
    id: '2',
    type: 'Disease Outbreak',
    severity: 'critical',
    title: 'EUS Disease Symptoms Detected',
    description: 'Red spot lesions reported on standard Rohu crop. Gill discoloration observed.',
    farmerName: 'Ramesh Prasad Singh',
    phone: '9845012345',
    location: 'Patna, Phulwari Sharif block',
    coords: '25.5800° N, 85.1200° E',
    time: '1 hr ago',
    resolved: false,
    recommendation: 'Isolate affected fish immediately. Apply Potassium Permanganate (KMnO₄) bath at 2–4 ppm for 30 mins. Contact veterinary authority for official outbreak reporting.',
  },
  {
    id: '3',
    type: 'Water Parameter',
    severity: 'warning',
    title: 'High Ammonia Concentration',
    description: 'Ammonia level measured at 0.08 ppm (Borderline threshold: 0.05 ppm).',
    farmerName: 'Sanjay Kumar Yadav',
    phone: '9744123456',
    location: 'Madhubani, Benipatti block',
    coords: '26.3650° N, 86.0850° E',
    time: '2 hrs ago',
    resolved: false,
    recommendation: 'Reduce feed by 30% for 48 hours. Apply zeolite at 500 kg/ha. Improve water exchange. Avoid overfeeding. Aerate heavily at dawn and dusk.',
  },
  {
    id: '4',
    type: 'Water Parameter',
    severity: 'warning',
    title: 'pH Alkaline Spike',
    description: 'pH level spiked to 9.2 (Normal range: 6.5 - 8.5). Algal bloom suspected.',
    farmerName: 'Gopal Dev Prasad',
    phone: '9602481357',
    location: 'Patna, Mokama block',
    coords: '25.4020° N, 85.9070° E',
    time: '1 day ago',
    resolved: true,
    recommendation: 'Remove surface algae manually. Apply alum (aluminum sulfate) at 15–20 ppm to flocculate algae. Shade 30% of pond surface if possible.',
  },
];

const MOCK_DOCTORS = [
  { id: 'd1', name: 'Dr. Akhilesh Kumar', specialty: 'Vet Pathologist', phone: '9876543210' },
  { id: 'd2', name: 'Dr. Manoj Mishra', specialty: 'Water Biologist', phone: '9988776655' },
];

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertItem[]>(MOCK_ALERTS);
  const [dispatchTarget, setDispatchTarget] = useState<AlertItem | null>(null);
  const [selectedDocId, setSelectedDocId] = useState('');
  const [expandedAlertId, setExpandedAlertId] = useState<string | null>(null);
  const [notifiedIds, setNotifiedIds] = useState<Set<string>>(new Set());

  const handleSendSms = async (alertId: string) => {
    const alertItem = alerts.find(a => a.id === alertId);
    if (!alertItem) return;

    try {
      await api.post('/api/v1/notifications/send', {
        phone: alertItem.phone,
        farmerName: alertItem.farmerName,
        type: 'alert_sms_guidance',
        title: `⚠️ Urgent Guidance: ${alertItem.title}`,
        message: alertItem.recommendation
      });
    } catch (err) {
      console.error('Failed to dispatch backend alert:', err);
    }

    setAlerts((prev) =>
      prev.map((a) => {
        if (a.id !== alertId) return a;
        return { ...a, resolved: true };
      })
    );

    alert(
      `📱 Active SMS Gateway is inactive. App Notification guidance has been dispatched directly to ${alertItem.farmerName}'s mobile app:\n\n` +
      `"⚠️ ${alertItem.title}\n${alertItem.recommendation}"`
    );
  };

  const handleDispatchDoc = () => {
    if (!dispatchTarget || !selectedDocId) return;
    const doc = MOCK_DOCTORS.find((d) => d.id === selectedDocId);
    setAlerts((prev) =>
      prev.map((a) => {
        if (a.id !== dispatchTarget.id) return a;
        alert(`Specialist ${doc?.name} dispatched to ${a.farmerName}'s site in ${a.location}. App & SMS notification sent.`);
        return { ...a, resolved: true };
      })
    );
    setDispatchTarget(null);
    setSelectedDocId('');
  };

  const handleAppNotification = async (alertItem: AlertItem) => {
    setNotifiedIds((prev) => new Set([...prev, alertItem.id]));

    try {
      await api.post('/api/v1/notifications/send', {
        phone: alertItem.phone,
        farmerName: alertItem.farmerName,
        type: 'alert_guidance',
        title: `⚠️ Advisory: ${alertItem.title}`,
        message: alertItem.recommendation
      });
    } catch (err) {
      console.error('Failed to dispatch app notification:', err);
    }

    alert(
      `📱 Push notification successfully dispatched to ${alertItem.farmerName}'s MatsyaMitra app:\n\n` +
      `"⚠️ ${alertItem.title}\n${alertItem.recommendation}"`
    );
  };

  return (
    <div className="flex flex-col gap-6 p-6 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-teal-400">
            Emergency Desk
          </div>
          <h1 className="text-2xl font-bold text-ink-primary">Outbreaks & Alerts Management</h1>
        </div>
        <ExportButton onClick={() => exportAlertsToCSV(alerts)} className="mt-1" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Active Alerts Stack */}
        <div className="xl:col-span-2 flex flex-col gap-4">
          <h2 className="text-sm font-bold text-ink-primary flex items-center gap-2">
            <BellRing className="h-4 w-4 text-teal-400" />
            Biological Active Alerts Feed
          </h2>

          <div className="space-y-4">
            {alerts.filter(a => !a.resolved).map((alertItem) => {
              const isExpanded = expandedAlertId === alertItem.id;
              const isNotified = notifiedIds.has(alertItem.id);

              return (
                <GlassCard
                  key={alertItem.id}
                  className={`border transition-all ${
                    alertItem.severity === 'critical'
                      ? 'border-rose-500/30 bg-rose-500/5'
                      : 'border-amber-500/30 bg-amber-500/5'
                  }`}
                >
                  {/* Card header — always visible */}
                  <div
                    className="p-5 cursor-pointer select-none"
                    onClick={() => setExpandedAlertId(isExpanded ? null : alertItem.id)}
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
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-ink-muted flex items-center gap-1 font-mono">
                          <Clock className="h-3 w-3" />
                          {alertItem.time}
                        </span>
                        {isExpanded
                          ? <ChevronUp className="h-4 w-4 text-ink-muted" />
                          : <ChevronDown className="h-4 w-4 text-ink-muted" />
                        }
                      </div>
                    </div>

                    <p className="text-xs text-ink-secondary mt-3 leading-relaxed">
                      {alertItem.description}
                    </p>

                    <div className="mt-3 text-xs">
                      <span className="font-semibold text-ink-primary">{alertItem.farmerName}</span>
                      <span className="text-ink-muted"> in {alertItem.location}</span>
                    </div>
                  </div>

                  {/* Expanded detail panel */}
                  {isExpanded && (
                    <div className="px-5 pb-5 border-t border-glass-border/30 pt-4 space-y-4">
                      {/* Contact & Location */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-3 rounded-lg border border-glass-border bg-canvas-950/30 space-y-2 text-xs">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-teal-400">Contact</div>
                          <a
                            href={`tel:${alertItem.phone}`}
                            className="flex items-center gap-2 text-ink-secondary hover:text-teal-400 transition-colors"
                          >
                            <Phone className="h-3.5 w-3.5" />
                            <span className="font-mono">{alertItem.phone}</span>
                          </a>
                          <div className="flex items-center gap-2 text-ink-secondary">
                            <MapPin className="h-3.5 w-3.5" />
                            <span>{alertItem.location}</span>
                          </div>
                        </div>

                        <div className="p-3 rounded-lg border border-glass-border bg-canvas-950/30 space-y-2 text-xs">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-teal-400">GPS Location</div>
                          <div className="flex items-center gap-2 text-ink-secondary font-mono">
                            <Navigation className="h-3.5 w-3.5" />
                            <span>{alertItem.coords}</span>
                          </div>
                        </div>
                      </div>

                      {/* Recommendation */}
                      <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 text-xs">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-1.5">
                          Recommended Corrective Action
                        </div>
                        <p className="text-ink-secondary leading-relaxed">{alertItem.recommendation}</p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          onClick={() => handleSendSms(alertItem.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/20 text-xs font-semibold hover:bg-teal-500/20 transition-colors"
                        >
                          <Send className="h-3 w-3" />
                          Send SMS Guidance
                        </button>

                        <button
                          onClick={() => handleAppNotification(alertItem)}
                          disabled={isNotified}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors border ${
                            isNotified
                              ? 'bg-teal-500/5 text-teal-400/50 border-teal-500/10 pointer-events-none'
                              : 'bg-purple-500/10 text-purple-300 border-purple-500/20 hover:bg-purple-500/20'
                          }`}
                        >
                          <Smartphone className="h-3 w-3" />
                          {isNotified ? 'App Notified ✓' : 'Send App Notification'}
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
                  )}
                </GlassCard>
              );
            })}

            {alerts.filter(a => !a.resolved).length === 0 && (
              <div className="p-8 text-center border border-glass-border rounded-xl bg-canvas-900/50 text-teal-400 font-semibold flex items-center justify-center gap-2">
                <CheckCircle className="h-5 w-5" />
                All active biological alerts have been successfully resolved
              </div>
            )}
          </div>
        </div>

        {/* Right side */}
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
