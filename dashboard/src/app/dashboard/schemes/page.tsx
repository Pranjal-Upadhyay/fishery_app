'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ScrollText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  MapPin,
  Clock,
  UserCheck,
  CreditCard,
  Camera,
  Loader2,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { api } from '@/lib/api';
import { ApiEnvelope } from '@/lib/types';

// Types
interface Yojana {
  id: string;
  code: string;
  nameHi: string;
  nameEn: string;
  subsidyPct: number;
  unitCostLakh: number;
  eligibility: string;
  classification: string;
  geofence: string;
}

interface Application {
  id: string;
  appNum: string;
  farmerName: string;
  caste: 'General' | 'EBC' | 'SC' | 'ST';
  yojanaName: string;
  district: string;
  landArea: string;
  documents: { name: string; status: 'verified' | 'pending' | 'missing' }[];
  gpsCoords: string;
  gpsMatch: boolean;
  status: 'Awaiting Review' | 'DLC Queue' | 'Approved' | 'Milestone 1 Met' | 'Milestone 2 Met';
  milestones: { name: string; pct: number; verified: boolean; photoUrl?: string }[];
  subsidyAmount: string;
}

const YOJANAS: Yojana[] = [
  { id: '1', code: 'TMVSY', nameHi: 'तालाब मात्स्यिकी विशेष सहायता योजना', nameEn: 'Talab Matsyiki Vishesh Sahayata', subsidyPct: 70, unitCostLakh: 10.10, eligibility: 'SC / ST / EBC only', classification: 'Pond Renovation', geofence: 'All Bihar Districts' },
  { id: '2', code: 'JKSY', nameHi: 'जलकृषि सौरीकरण योजना', nameEn: 'Jalkrishi Saurikaran (Solar Pump)', subsidyPct: 80, unitCostLakh: 5.42, eligibility: 'All castes, lease >= 9yr', classification: 'Solar Infrastructure', geofence: 'North (5 HP) | South (7.5 HP)' },
  { id: '3', code: 'MPVY', nameHi: 'मत्स्य प्रजाति का विविधीकरण योजना', nameEn: 'Species Diversification Hatchery', subsidyPct: 60, unitCostLakh: 13.12, eligibility: 'Prior training, lease >= 9yr', classification: 'Hatchery Core', geofence: 'Designated Districts only' },
];

export default function SchemesPage() {
  const [selectedYojana, setSelectedYojana] = useState<Yojana | null>(YOJANAS[0]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [activeApp, setActiveApp] = useState<Application | null>(null);
  const [isPhotoVerified, setIsPhotoVerified] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchApps = useCallback(async () => {
    try {
      const res = await api.get<ApiEnvelope<Application[]>>('/api/v1/yojana/admin/applications');
      if (res.success) {
        setApplications(res.data);
        if (res.data.length > 0) {
          setActiveApp((prev) => {
            const found = res.data.find((a) => a.id === prev?.id);
            return found || res.data[0];
          });
        } else {
          setActiveApp(null);
        }
      }
    } catch (err) {
      console.error('Failed to fetch yojana applications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchApps();
  }, [fetchApps]);

  const handleVerifyDoc = (appId: string, docIndex: number) => {
    // Modify local state so the button unlocks
    setApplications((prev) =>
      prev.map((app) => {
        if (app.id !== appId) return app;
        const newDocs = [...app.documents];
        newDocs[docIndex] = { ...newDocs[docIndex], status: 'verified' };
        const updatedApp = { ...app, documents: newDocs };
        if (activeApp && appId === activeApp.id) {
          setActiveApp(updatedApp);
        }
        return updatedApp;
      })
    );
  };

  const handleDlcApprove = async (appId: string) => {
    try {
      const res = await api.patch<ApiEnvelope<any>>(`/api/v1/yojana/admin/applications/${appId}/status`, {
        status: 'DLC_QUEUE',
      });
      if (res.success) {
        await fetchApps();
      }
    } catch (err) {
      console.error('Failed to update status to DLC_QUEUE:', err);
    }
  };

  const handleReleasePayment = async (appId: string, milestoneIdx: number) => {
    try {
      const res = await api.post<ApiEnvelope<any>>(`/api/v1/yojana/admin/applications/${appId}/release-payout`, {
        milestoneIndex: milestoneIdx,
      });
      if (res.success) {
        alert(`DBT Subsidy payment successfully queued for direct bank transfer!`);
        await fetchApps();
        setIsPhotoVerified(false);
      }
    } catch (err) {
      console.error('Failed to release payout:', err);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 h-full overflow-y-auto">
      {/* Header */}
      <div>
        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-teal-400">
          Government Allocations
        </div>
        <h1 className="text-2xl font-bold text-ink-primary">Aquaculture Schemes & Yojanas</h1>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-ink-secondary">
          <Loader2 className="h-8 w-8 text-teal-400 animate-spin" />
          <span className="text-sm font-semibold">Loading applications...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Left Panel: Yojana Master Directory */}
          <div className="xl:col-span-1 flex flex-col gap-4">
            <h2 className="text-sm font-bold text-ink-primary flex items-center gap-2">
              <ScrollText className="h-4 w-4 text-teal-400" />
              Yojana Master List
            </h2>

            <div className="flex flex-col gap-3">
              {YOJANAS.map((yojana) => (
                <button
                  key={yojana.id}
                  onClick={() => setSelectedYojana(yojana)}
                  className={`w-full text-left p-4 rounded-xl border transition-all hover:bg-glass-subtle ${
                    selectedYojana?.id === yojana.id
                      ? 'bg-teal-500/10 border-teal-500/40 shadow-glow'
                      : 'bg-canvas-900/50 border-glass-border'
                  }`}
                >
                  <div className="text-[9px] font-mono font-bold text-teal-400 tracking-wider">
                    {yojana.code}
                  </div>
                  <div className="text-xs font-bold text-ink-primary mt-1 line-clamp-1">
                    {yojana.nameEn}
                  </div>
                  <div className="text-[10px] text-ink-muted mt-0.5 line-clamp-1 font-medium">
                    {yojana.nameHi}
                  </div>
                  <div className="mt-3 flex justify-between items-baseline text-xs">
                    <div className="text-ink-secondary">
                      Subsidy: <span className="font-bold text-teal-400">{yojana.subsidyPct}%</span>
                    </div>
                    <div className="font-mono text-ink-muted">₹{yojana.unitCostLakh}L Cap</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Active Yojana details */}
            {selectedYojana && (
              <GlassCard className="p-4 space-y-3">
                <h3 className="text-xs font-bold text-ink-primary uppercase tracking-wider text-teal-400">
                  Scheme Rules Configuration
                </h3>
                <div className="space-y-2 text-xs">
                  <div>
                    <div className="text-ink-muted">Eligibility Criteria</div>
                    <div className="font-semibold text-ink-primary mt-0.5">{selectedYojana.eligibility}</div>
                  </div>
                  <div>
                    <div className="text-ink-muted">Geofenced Area</div>
                    <div className="font-semibold text-ink-primary mt-0.5">{selectedYojana.geofence}</div>
                  </div>
                  <div>
                    <div className="text-ink-muted">Classification Category</div>
                    <div className="font-semibold text-ink-primary mt-0.5">{selectedYojana.classification}</div>
                  </div>
                </div>
              </GlassCard>
            )}
          </div>

          {/* Middle Panel: Officer Application Approval Queue */}
          <div className="xl:col-span-2 flex flex-col gap-4">
            <h2 className="text-sm font-bold text-ink-primary flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-teal-400" />
              Verification Approval Queue
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Inbox */}
              <GlassCard className="p-4 flex flex-col h-[480px]">
                <div className="text-xs font-bold text-ink-muted mb-3 uppercase tracking-wider">
                  Incoming Applications
                </div>
                <div className="flex-1 overflow-y-auto space-y-2.5">
                  {applications.length === 0 ? (
                    <div className="text-center text-xs text-ink-muted py-10 font-medium">
                      No applications submitted yet.
                    </div>
                  ) : (
                    applications.map((app) => (
                      <button
                        key={app.id}
                        onClick={() => {
                          setActiveApp(app);
                          setIsPhotoVerified(false);
                        }}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                          activeApp?.id === app.id
                            ? 'bg-glass border-teal-500/30'
                            : 'bg-canvas-950/40 border-glass-border/30 hover:bg-glass-subtle'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <span className="font-mono text-xs font-bold text-ink-primary">{app.appNum}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            app.status === 'Awaiting Review'
                              ? 'bg-amber-500/10 text-amber-400'
                              : app.status === 'DLC Queue'
                              ? 'bg-sky-500/10 text-sky-400'
                              : 'bg-teal-500/10 text-teal-400'
                          }`}>
                            {app.status}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-ink-secondary mt-1.5">{app.farmerName}</div>
                        <div className="text-[10px] text-ink-muted mt-0.5">{app.yojanaName}</div>
                      </button>
                    ))
                  )}
                </div>
              </GlassCard>

              {/* Document Check / Validation */}
              <GlassCard className="p-4 flex flex-col h-[480px]">
                <div className="text-xs font-bold text-ink-muted mb-3 uppercase tracking-wider">
                  Inspection Checkpoints
                </div>
                {activeApp ? (
                  <div className="flex-1 overflow-y-auto space-y-4">
                    {/* Farmer Info */}
                    <div>
                      <div className="text-xs font-bold text-ink-primary">{activeApp.farmerName}</div>
                      <div className="text-[10px] text-ink-muted mt-0.5">
                        Category: <span className="font-semibold text-teal-300">{activeApp.caste}</span> | Land: {activeApp.landArea}
                      </div>
                    </div>

                    {/* Location verify */}
                    <div className="p-3 rounded-lg border border-glass-border bg-canvas-950/40 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-ink-primary">
                        <MapPin className="h-3.5 w-3.5 text-teal-400" />
                        GPS Geofence Match
                      </div>
                      <div className="flex justify-between text-[11px] font-mono text-ink-secondary">
                        <span>Claim Coords:</span>
                        <span>{activeApp.gpsCoords}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-ink-muted">Geofence validation:</span>
                        <span className={`font-bold flex items-center gap-1 ${activeApp.gpsMatch ? 'text-teal-400' : 'text-rose-400'}`}>
                          <CheckCircle className="h-3.5 w-3.5" />
                          Passed
                        </span>
                      </div>
                    </div>

                    {/* Document verification checklist */}
                    <div className="space-y-2">
                      <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">
                        Uploaded Documents
                      </div>
                      {activeApp.documents.map((doc, idx) => (
                        <div
                          key={doc.name}
                          className="flex justify-between items-center p-2 rounded border border-glass-border/40 bg-canvas-950/25"
                        >
                          <div className="flex items-center gap-1.5 text-xs text-ink-secondary">
                            <FileText className="h-3.5 w-3.5 text-ink-muted" />
                            {doc.name}
                          </div>
                          {doc.status === 'verified' ? (
                            <span className="text-[10px] font-bold text-teal-400 flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Verified
                            </span>
                          ) : (
                            <button
                              onClick={() => handleVerifyDoc(activeApp.id, idx)}
                              className="text-[10px] font-bold px-2 py-0.75 rounded bg-teal-500/10 text-teal-300 border border-teal-500/30 hover:bg-teal-500/20"
                            >
                              Verify doc
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Approve button */}
                    <div className="pt-3 border-t border-glass-border mt-auto">
                      {activeApp.status === 'Awaiting Review' ? (
                        <button
                          disabled={activeApp.documents.some((d) => d.status !== 'verified')}
                          onClick={() => handleDlcApprove(activeApp.id)}
                          className="w-full py-2.5 rounded-lg text-xs font-semibold text-center bg-teal-500/10 text-teal-300 border border-teal-500/30 hover:bg-teal-500/20 disabled:opacity-50 disabled:pointer-events-none transition-all"
                        >
                          Flag for DLC Approval Queue
                        </button>
                      ) : (
                        <div className="text-center text-xs text-teal-400 font-semibold flex items-center justify-center gap-1.5 py-2">
                          <CheckCircle className="h-4 w-4" />
                          Sent to District Committee (DLC)
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-xs text-ink-muted">
                    Select an application to inspect checkpoints
                  </div>
                )}
              </GlassCard>
            </div>
          </div>

          {/* Right Panel: Milestone Inspection & DBT release simulator */}
          <GlassCard className="xl:col-span-1 p-5 flex flex-col h-[540px]">
            <h2 className="text-sm font-bold text-ink-primary flex items-center gap-2 mb-4">
              <CreditCard className="h-4 w-4 text-teal-400" />
              Milestone inspection & DBT
            </h2>

            {activeApp ? (
              <div className="flex-1 overflow-y-auto space-y-4 text-xs">
                {/* Active app specs */}
                <div className="p-3 rounded-lg border border-glass-border bg-canvas-950/40">
                  <div className="text-ink-muted">Assigned Subsidy Value</div>
                  <div className="text-xl font-mono font-bold text-ink-primary mt-1">{activeApp.subsidyAmount}</div>
                  <div className="text-[10px] text-teal-400 mt-1 font-semibold flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Milestone Disbursement Flow
                  </div>
                </div>

                {/* Milestone List */}
                <div className="space-y-3.5">
                  <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">
                    Disbursement Stages
                  </div>

                  {activeApp.milestones.map((m, idx) => (
                    <div
                      key={m.name}
                      className={`p-3 rounded-lg border relative ${
                        m.verified
                          ? 'bg-teal-500/5 border-teal-500/20'
                          : 'bg-canvas-950/20 border-glass-border/40'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="font-semibold text-ink-primary">{m.name}</div>
                        <span className="font-mono text-[10px] text-ink-muted">Weight: {m.pct}%</span>
                      </div>

                      {m.photoUrl && !m.verified && (
                        <div className="mt-3 space-y-2">
                          <div className="relative h-28 rounded-lg overflow-hidden border border-glass-border">
                            <img
                              src={m.photoUrl}
                              alt="Verification milestone"
                              className="object-cover w-full h-full filter brightness-75"
                            />
                            <span className="absolute bottom-2 left-2 bg-canvas-950/80 px-2 py-0.5 rounded text-[8px] font-mono text-teal-400 flex items-center gap-1 border border-teal-500/20">
                              <Camera className="h-2.5 w-2.5" />
                              Geo-Tagged Photo Verified
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`verify-photo-${idx}`}
                              checked={isPhotoVerified}
                              onChange={(e) => setIsPhotoVerified(e.target.checked)}
                              className="rounded border-glass-border text-teal-500 focus:ring-teal-500/30"
                            />
                            <label htmlFor={`verify-photo-${idx}`} className="text-[10px] text-ink-secondary">
                              Confirm excavation coordinates match parcel GPS
                            </label>
                          </div>
                        </div>
                      )}

                      <div className="mt-3 flex justify-between items-center">
                        <span className="text-[10px] text-ink-muted">Payment status:</span>
                        {m.verified ? (
                          <span className="text-teal-400 font-bold flex items-center gap-1 text-[11px]">
                            <CheckCircle className="h-3.5 w-3.5" />
                            Disbursed (DBT)
                          </span>
                        ) : (
                          <button
                            disabled={m.photoUrl ? !isPhotoVerified : activeApp.status !== 'DLC Queue'}
                            onClick={() => handleReleasePayment(activeApp.id, idx)}
                            className="px-2.5 py-1 rounded bg-teal-500/10 text-teal-300 border border-teal-500/30 hover:bg-teal-500/20 disabled:opacity-50 disabled:pointer-events-none"
                          >
                            Release {m.pct}% Payout
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs text-ink-muted">
                Select an application to view milestones
              </div>
            )}
          </GlassCard>
        </div>
      )}
    </div>
  );
}
