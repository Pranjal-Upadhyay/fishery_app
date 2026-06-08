'use client';

import { useState, useEffect } from 'react';
import {
  Settings2,
  Save,
  Sliders,
  Users,
  ScrollText,
  AlertTriangle,
  Globe,
  BellRing,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';

export default function SettingsPage() {
  const [doThreshold, setDoThreshold] = useState('3.5');
  const [phMin, setPhMin] = useState('6.5');
  const [phMax, setPhMax] = useState('8.5');
  const [ammoniaMax, setAmmoniaMax] = useState('0.05');

  const [tTarget, setTTarget] = useState('766');
  const [tBudget, setTBudget] = useState('10.10');

  const [officerName, setOfficerName] = useState('Shri Anand Kumar');
  const [officerDistrict, setOfficerDistrict] = useState('Madhubani');
  const [officerBlock, setOfficerBlock] = useState('Benipatti');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDoThreshold(localStorage.getItem('thresholds_do') || '3.5');
      setPhMin(localStorage.getItem('thresholds_phMin') || '6.5');
      setPhMax(localStorage.getItem('thresholds_phMax') || '8.5');
      setAmmoniaMax(localStorage.getItem('thresholds_ammonia') || '0.05');

      setTTarget(localStorage.getItem('settings_yojana_target') || '766');
      setTBudget(localStorage.getItem('settings_yojana_budget') || '10.10');

      setOfficerName(localStorage.getItem('settings_officer_name') || 'Shri Anand Kumar');
      setOfficerDistrict(localStorage.getItem('settings_officer_district') || 'Madhubani');
      setOfficerBlock(localStorage.getItem('settings_officer_block') || 'Benipatti');
    }
  }, []);

  const handleSaveWater = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      localStorage.setItem('thresholds_do', doThreshold);
      localStorage.setItem('thresholds_phMin', phMin);
      localStorage.setItem('thresholds_phMax', phMax);
      localStorage.setItem('thresholds_ammonia', ammoniaMax);
    }
    alert('Global alert thresholds updated successfully in LocalStorage!');
  };

  const handleSaveYojana = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      localStorage.setItem('settings_yojana_target', tTarget);
      localStorage.setItem('settings_yojana_budget', tBudget);
    }
    alert('Yojana annual target and budget caps updated successfully!');
  };

  const handleSaveOfficer = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      localStorage.setItem('settings_officer_name', officerName);
      localStorage.setItem('settings_officer_district', officerDistrict);
      localStorage.setItem('settings_officer_block', officerBlock);
    }
    alert(`Jurisdiction updated: ${officerName} assigned to ${officerBlock} block, ${officerDistrict} district.`);
  };


  return (
    <div className="flex flex-col gap-6 p-6 h-full overflow-y-auto">
      {/* Header */}
      <div>
        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-teal-400">
          Admin Console
        </div>
        <h1 className="text-2xl font-bold text-ink-primary">Global Settings & Configuration</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Global Water Quality Alert Thresholds */}
        <GlassCard className="p-5 flex flex-col gap-4">
          <h3 className="text-sm font-bold text-ink-primary flex items-center gap-2">
            <BellRing className="h-4 w-4 text-teal-400" />
            Biological Parameter Thresholds
          </h3>
          <p className="text-xs text-ink-muted leading-relaxed">
            Configure the trigger values for automatic emergency SMS alerts sent to farmers and veterinary path alerts.
          </p>

          <form onSubmit={handleSaveWater} className="space-y-4 text-xs flex-1">
            <div className="space-y-1.5">
              <label className="text-ink-secondary block font-semibold">
                Critical Dissolved Oxygen (mg/L)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  value={doThreshold}
                  onChange={(e) => setDoThreshold(e.target.value)}
                  className="w-full bg-canvas-950/80 border border-glass-border focus:border-teal-500/50 rounded-lg p-2.5 text-ink-primary placeholder-ink-muted outline-none transition-colors"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted">mg/L</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-ink-secondary block font-semibold">
                  Minimum pH
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={phMin}
                  onChange={(e) => setPhMin(e.target.value)}
                  className="w-full bg-canvas-950/80 border border-glass-border focus:border-teal-500/50 rounded-lg p-2.5 text-ink-primary placeholder-ink-muted outline-none transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-ink-secondary block font-semibold">
                  Maximum pH
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={phMax}
                  onChange={(e) => setPhMax(e.target.value)}
                  className="w-full bg-canvas-950/80 border border-glass-border focus:border-teal-500/50 rounded-lg p-2.5 text-ink-primary placeholder-ink-muted outline-none transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-ink-secondary block font-semibold">
                Maximum Ammonia (ppm)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  value={ammoniaMax}
                  onChange={(e) => setAmmoniaMax(e.target.value)}
                  className="w-full bg-canvas-950/80 border border-glass-border focus:border-teal-500/50 rounded-lg p-2.5 text-ink-primary placeholder-ink-muted outline-none transition-colors"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted">ppm</span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-lg text-xs font-semibold bg-teal-500/10 text-teal-300 border border-teal-500/30 hover:bg-teal-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <Save className="h-3.5 w-3.5" />
              Save Thresholds
            </button>
          </form>
        </GlassCard>

        {/* Yojana Target Configurator */}
        <GlassCard className="p-5 flex flex-col gap-4">
          <h3 className="text-sm font-bold text-ink-primary flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-teal-400" />
            Yojana social Targets Config
          </h3>
          <p className="text-xs text-ink-muted leading-relaxed">
            Define target unit output caps and expenditure guidelines for state direct benefit schemes.
          </p>

          <form onSubmit={handleSaveYojana} className="space-y-4 text-xs flex-1">
            <div className="space-y-1.5">
              <label className="text-ink-secondary block font-semibold">
                Select Yojana Program
              </label>
              <select className="w-full bg-canvas-950/80 border border-glass-border text-ink-secondary text-xs rounded-lg p-2.5 outline-none focus:border-teal-500/50 transition-colors">
                <option value="TMVSY">Talab Matsyiki Vishesh Sahayata (TMVSY)</option>
                <option value="JKSY">Jalkrishi Saurikaran Yojana (JKSY)</option>
                <option value="MPVY">Matsya Prajati ka Vividhikaran (MPVY)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-ink-secondary block font-semibold">
                Annual Target (Total Units)
              </label>
              <input
                type="number"
                value={tTarget}
                onChange={(e) => setTTarget(e.target.value)}
                className="w-full bg-canvas-950/80 border border-glass-border focus:border-teal-500/50 rounded-lg p-2.5 text-ink-primary placeholder-ink-muted outline-none transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-ink-secondary block font-semibold">
                Unit Budget Cap (Lakhs INR)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  value={tBudget}
                  onChange={(e) => setTBudget(e.target.value)}
                  className="w-full bg-canvas-950/80 border border-glass-border focus:border-teal-500/50 rounded-lg p-2.5 text-ink-primary placeholder-ink-muted outline-none transition-colors"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted">Lakhs</span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-lg text-xs font-semibold bg-teal-500/10 text-teal-300 border border-teal-500/30 hover:bg-teal-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <Save className="h-3.5 w-3.5" />
              Update Scheme Rules
            </button>
          </form>
        </GlassCard>

        {/* Officer Jurisdiction Assignments */}
        <GlassCard className="p-5 flex flex-col gap-4">
          <h3 className="text-sm font-bold text-ink-primary flex items-center gap-2">
            <Users className="h-4 w-4 text-teal-400" />
            Officer Jurisdiction Console
          </h3>
          <p className="text-xs text-ink-muted leading-relaxed">
            Assign regional jurisdiction controls to District and Block Fishery Officers.
          </p>

          <form onSubmit={handleSaveOfficer} className="space-y-4 text-xs flex-1">
            <div className="space-y-1.5">
              <label className="text-ink-secondary block font-semibold">
                Officer Name
              </label>
              <input
                type="text"
                value={officerName}
                onChange={(e) => setOfficerName(e.target.value)}
                className="w-full bg-canvas-950/80 border border-glass-border focus:border-teal-500/50 rounded-lg p-2.5 text-ink-primary placeholder-ink-muted outline-none transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-ink-secondary block font-semibold">
                  District
                </label>
                <input
                  type="text"
                  value={officerDistrict}
                  onChange={(e) => setOfficerDistrict(e.target.value)}
                  className="w-full bg-canvas-950/80 border border-glass-border focus:border-teal-500/50 rounded-lg p-2.5 text-ink-primary placeholder-ink-muted outline-none transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-ink-secondary block font-semibold">
                  Block
                </label>
                <input
                  type="text"
                  value={officerBlock}
                  onChange={(e) => setOfficerBlock(e.target.value)}
                  className="w-full bg-canvas-950/80 border border-glass-border focus:border-teal-500/50 rounded-lg p-2.5 text-ink-primary placeholder-ink-muted outline-none transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-lg text-xs font-semibold bg-teal-500/10 text-teal-300 border border-teal-500/30 hover:bg-teal-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <Save className="h-3.5 w-3.5" />
              Reassign Officer
            </button>
          </form>
        </GlassCard>
      </div>
    </div>
  );
}
