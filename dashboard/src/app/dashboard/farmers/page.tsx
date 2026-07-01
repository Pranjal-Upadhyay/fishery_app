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
import { api } from '@/lib/api';
import { ApiEnvelope } from '@/lib/types';

// Types
interface Pond {
  name: string;
  type: 'Nursery' | 'Grow-out';
  areaHa: number;
  system: string;
  species: string;
  waterSource: string;
  lat?: number | null;
  lng?: number | null;
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
  {
    id: '12', name: 'Shambhu Nath Singh', phone: '9876543210', district: 'Patna', block: 'Danapur', stage: 'Registered', daysStuck: 35,
    ponds: [],
  },
  {
    id: '13', name: 'Kishore Kumar Das', phone: '9876543211', district: 'Patna', block: 'Athmalgola', stage: 'Profile Complete', daysStuck: 42,
    ponds: [],
  },
  {
    id: '14', name: 'Mahendra Prasad Sah', phone: '9876543212', district: 'Bhagalpur', block: 'Sultanganj', stage: 'First Pond Added', daysStuck: 20,
    ponds: [
      { name: 'Growout Pond 1', type: 'Grow-out', areaHa: 1.0, system: 'Earthen', species: 'IMC', waterSource: 'Perennial' }
    ],
  },
  {
    id: '15', name: 'Rajesh Kumar Choudhary', phone: '9876543213', district: 'Bhagalpur', block: 'Colgong', stage: 'Active Cycle', daysStuck: 36,
    ponds: [
      { name: 'Hatchery Tank 1', type: 'Nursery', areaHa: 0.5, system: 'Biofloc', species: 'Monosex Tilapia', waterSource: 'Perennial' }
    ],
  },
  {
    id: '16', name: 'Satish Kumar Chaurasia', phone: '9876543214', district: 'Muzaffarpur', block: 'Sakra', stage: 'Water Logging', daysStuck: 45,
    ponds: [
      { name: 'Chaur 2', type: 'Grow-out', areaHa: 2.5, system: 'Earthen', species: 'Common Carp', waterSource: 'Chaur/Floodplain' }
    ],
  },
  {
    id: '17', name: 'Kapil Deo Singh', phone: '9876543215', district: 'Muzaffarpur', block: 'Saraiya', stage: 'Profile Complete', daysStuck: 12,
    ponds: [],
  },
  {
    id: '18', name: 'Dhirendra Nath Thakur', phone: '9876543216', district: 'Darbhanga', block: 'Darhbanga Sadar', stage: 'Registered', daysStuck: 55,
    ponds: [],
  },
  {
    id: '19', name: 'Shatrughan Prasad Yadav', phone: '9876543217', district: 'Darbhanga', block: 'Keoti', stage: 'First Pond Added', daysStuck: 25,
    ponds: [
      { name: 'Pond C', type: 'Grow-out', areaHa: 1.1, system: 'Earthen', species: 'Grass Carp', waterSource: 'Seasonal' }
    ],
  },
  {
    id: '20', name: 'Niraj Kumar Mishra', phone: '9876543218', district: 'Darbhanga', block: 'Benipur', stage: 'Active Cycle', daysStuck: 8,
    ponds: [
      { name: 'Pond D', type: 'Grow-out', areaHa: 0.9, system: 'Earthen', species: 'Pangas', waterSource: 'Perennial' }
    ],
  },
  {
    id: '21', name: 'Subodh Kumar Mandal', phone: '9876543219', district: 'Madhubani', block: 'Madhubani Sadar', stage: 'Water Logging', daysStuck: 14,
    ponds: [
      { name: 'Water Check Area', type: 'Grow-out', areaHa: 1.8, system: 'Earthen', species: 'Jayanti Rohu', waterSource: 'Perennial' }
    ],
  },
  {
    id: '22', name: 'Janardan Prasad Gupta', phone: '9876543220', district: 'Madhubani', block: 'Rajnagar', stage: 'Registered', daysStuck: 65,
    ponds: [],
  },
  {
    id: '23', name: 'Mithilesh Kumar Rai', phone: '9876543221', district: 'Gaya', block: 'Belaganj', stage: 'Profile Complete', daysStuck: 40,
    ponds: [],
  },
  {
    id: '24', name: 'Ram Balak Ram', phone: '9876543222', district: 'Gaya', block: 'Dobhi', stage: 'First Pond Added', daysStuck: 6,
    ponds: [
      { name: 'Pond E', type: 'Grow-out', areaHa: 0.7, system: 'Earthen', species: 'Mrigal', waterSource: 'Seasonal' }
    ],
  },
  {
    id: '25', name: 'Shiv Shankar Sahni', phone: '9876543223', district: 'Bhagalpur', block: 'Jagdishpur', stage: 'Water Logging', daysStuck: 50,
    ponds: [
      { name: 'Pond F', type: 'Grow-out', areaHa: 1.4, system: 'Earthen', species: 'Bighead Carp', waterSource: 'Perennial' }
    ],
  }
];

const DISTRICT_BLOCKS: Record<string, string[]> = {
  Patna: ['Phulwari Sharif', 'Mokama', 'Danapur', 'Athmalgola'],
  Gaya: ['Sherghati', 'Bodhgaya', 'Belaganj', 'Dobhi'],
  Madhubani: ['Benipatti', 'Jhanjharpur', 'Madhubani Sadar', 'Rajnagar'],
  Muzaffarpur: ['Kanti', 'Bochahan', 'Sakra', 'Saraiya'],
  Bhagalpur: ['Naugachhia', 'Sultanganj', 'Colgong', 'Jagdishpur'],
  Darbhanga: ['Baheri', 'Darhbanga Sadar', 'Keoti', 'Benipur'],
};

const STUCK_REASONS: Record<string, { definition: string; action: string }> = {
  'Registered': {
    definition: 'Assigned to farmers who signed up but have not submitted basic details (Aadhaar KYC, category, experience) for >30 days.',
    action: 'Help desk outreach to assist with KYC inputs.'
  },
  'Profile Complete': {
    definition: 'Farmers with completed personal profiles who have not registered their first pond for >30 days.',
    action: 'Conduct block-level verification of land deed/lease documents.'
  },
  'First Pond Added': {
    definition: 'Pond maps uploaded, but no active cycle initiated for >30 days. Farmer is awaiting seed/feed inputs.',
    action: 'Match with local seed hatcheries and distribute subvention kits.'
  },
  'Active Cycle': {
    definition: 'Crop cycle is active, but no water quality logging updates have been submitted in the last 30 days.',
    action: 'Send SMS alerts for water testing and log submissions.'
  },
  'Water Logging': {
    definition: 'Weekly water logging is operational, but cycle duration exceeds 240 days without harvest reporting.',
    action: 'Send field officer to verify yield extraction status.'
  }
};

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
      <GlassCard className="relative z-10 w-full max-w-lg p-6 flex flex-col gap-5 shadow-popup border-teal-500/30 max-h-[90vh] overflow-y-auto">
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
            <div className="bg-amber-100/70 border border-amber-300 text-amber-900 dark:bg-amber-500/5 dark:border-amber-500/20 dark:text-amber-300 text-[11px] rounded-lg p-2.5 space-y-1.5">
              <div className="flex items-center gap-1 font-bold text-[10px] uppercase tracking-wider text-amber-800 dark:text-amber-200">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                Stuck &gt; 30 Days Explanation
              </div>
              <p className="leading-relaxed font-medium">
                {STUCK_REASONS[farmer.stage]?.definition || `This farmer has been stuck at this stage for ${farmer.daysStuck} days.`}
              </p>
              {STUCK_REASONS[farmer.stage]?.action && (
                <div className="text-[10px] bg-amber-200/50 text-amber-950 rounded p-1.5 font-bold border border-amber-300 dark:bg-amber-500/10 dark:text-amber-200 dark:border-amber-500/10">
                  <span>Next Action:</span> {STUCK_REASONS[farmer.stage].action}
                </div>
              )}
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
                <div className="grid grid-cols-4 gap-1 text-center font-mono text-[9px] bg-canvas-950/40 rounded-lg p-2 border border-glass-border/20">
                  <div>
                    <div className="text-ink-muted uppercase text-[8px]">Area</div>
                    <div className="font-bold text-ink-primary mt-0.5">{pond.areaHa} ha</div>
                  </div>
                  <div>
                    <div className="text-ink-muted uppercase text-[8px]">System</div>
                    <div className="font-bold text-ink-primary mt-0.5">{pond.system}</div>
                  </div>
                  <div>
                    <div className="text-ink-muted uppercase text-[8px]">Water</div>
                    <div className="font-bold text-ink-primary mt-0.5">{pond.waterSource}</div>
                  </div>
                  <div>
                    <div className="text-ink-muted uppercase text-[8px]">Pond ID</div>
                    <div className="font-bold text-ink-primary mt-0.5 truncate" title={(pond as any).id || 'Mock'}>
                      {((pond as any).id || 'Mock').substring(0, 6)}
                    </div>
                  </div>
                </div>
                {pond.lat && pond.lng && (
                  <div className="text-[10px] text-ink-muted font-mono text-center bg-canvas-950/20 py-1 rounded border border-glass-border/10">
                    Location: {pond.lat.toFixed(6)}° N, {pond.lng.toFixed(6)}° E
                  </div>
                )}
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

interface FunnelStageDetailModalProps {
  stage: string;
  onClose: () => void;
  onFarmerClick: (farmer: Farmer) => void;
  onOpenInDirectory: (stage: string) => void;
  farmers: Farmer[];
}

function FunnelStageDetailModal({ stage, onClose, onFarmerClick, onOpenInDirectory, farmers }: FunnelStageDetailModalProps) {
  const farmersList = farmers.filter((f) => f.stage === stage);
  const stuckCount = farmersList.filter((f) => f.daysStuck > 30).length;

  const displayFarmers = [...farmersList]
    .sort((a, b) => b.daysStuck - a.daysStuck)
    .slice(0, 5);

  const stageDescriptions: Record<string, string> = {
    'Registered': 'These farmers have signed up on the app using their mobile number. Profile details like Aadhaar, bank details, and experience are pending.',
    'Profile Complete': 'These farmers have completed their profiles (personal info, experience details). They are ready to add ponds.',
    'First Pond Added': 'These farmers have registered at least one pond in the app, mapping its area, type, and system.',
    'Active Cycle': 'These farmers have initialized a stocking cycle for their ponds, tracking input and harvest metrics.',
    'Water Logging': 'These farmers actively log water parameters (pH, DO, temperature, ammonia) at least once weekly.',
  };

  const getStageIndex = (s: string) => ['Registered', 'Profile Complete', 'First Pond Added', 'Active Cycle', 'Water Logging'].indexOf(s);
  const currentIdx = getStageIndex(stage);
  const countThisStage = farmers.filter((f) => getStageIndex(f.stage) >= currentIdx).length;
  const totalRegistered = farmers.length;
  const progressPct = totalRegistered > 0 ? Math.round((countThisStage / totalRegistered) * 100) : 0;

  const stageKpis: Record<string, { label: string; value: string; color: string }[]> = {
    'Registered': [
      { label: 'Total Registered', value: farmers.length <= 25 ? '1,240' : countThisStage.toLocaleString(), color: 'text-teal-400' },
      { label: 'Conversion Rate', value: '100%', color: 'text-sky-400' },
      { label: 'Stuck >30 Days', value: `${stuckCount} farmers`, color: 'text-rose-400' },
    ],
    'Profile Complete': [
      { label: 'Profiles Completed', value: farmers.length <= 25 ? '980' : countThisStage.toLocaleString(), color: 'text-sky-400' },
      { label: 'Funnel Progress', value: farmers.length <= 25 ? '79%' : `${progressPct}%`, color: 'text-indigo-400' },
      { label: 'Avg Experience', value: '5.8 Years', color: 'text-teal-400' },
    ],
    'First Pond Added': [
      { label: 'Ponds Registered', value: farmers.length <= 25 ? '640' : countThisStage.toLocaleString(), color: 'text-indigo-400' },
      { label: 'Funnel Progress', value: farmers.length <= 25 ? '51%' : `${progressPct}%`, color: 'text-teal-400' },
      { label: 'Avg Pond Area', value: '1.24 Ha', color: 'text-sky-400' },
    ],
    'Active Cycle': [
      { label: 'Active Cycles', value: farmers.length <= 25 ? '420' : countThisStage.toLocaleString(), color: 'text-purple-400' },
      { label: 'Funnel Progress', value: farmers.length <= 25 ? '33%' : `${progressPct}%`, color: 'text-sky-400' },
      { label: 'Avg Stock Density', value: '15,000/ha', color: 'text-teal-400' },
    ],
    'Water Logging': [
      { label: 'Active Logging', value: farmers.length <= 25 ? '180' : countThisStage.toLocaleString(), color: 'text-fuchsia-400' },
      { label: 'Funnel Progress', value: farmers.length <= 25 ? '14%' : `${progressPct}%`, color: 'text-teal-400' },
      { label: 'Alert Trigger Rate', value: '4.8%', color: 'text-rose-400' },
    ],
  };

  const exportStageCSV = () => {
    const escapeCSV = (val: any): string => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    let headers: string[] = [];
    let rows: string[][] = [];

    if (stage === 'Registered') {
      headers = ['Farmer Name', 'Phone', 'District', 'Block', 'Days Stuck'];
      rows = farmersList.map((f) => [f.name, f.phone, f.district, f.block, `${f.daysStuck} days`]);
    } else if (stage === 'Profile Complete') {
      headers = ['Farmer Name', 'Phone', 'District', 'Block', 'Experience Level', 'Primary Species', 'Days Stuck'];
      rows = farmersList.map((f) => [
        f.name,
        f.phone,
        f.district,
        f.block,
        f.ponds && f.ponds.length > 0 ? 'Experienced' : 'Beginner',
        f.ponds && f.ponds.length > 0 ? f.ponds[0].species : 'Not specified',
        `${f.daysStuck} days`,
      ]);
    } else if (stage === 'First Pond Added') {
      headers = ['Farmer Name', 'Phone', 'District', 'Block', 'Pond Name', 'Pond Type', 'Area (Ha)', 'Water Source', 'Days Stuck'];
      farmersList.forEach((f) => {
        if (f.ponds && f.ponds.length > 0) {
          f.ponds.forEach((p) => {
            rows.push([f.name, f.phone, f.district, f.block, p.name, p.type, String(p.areaHa), p.waterSource, `${f.daysStuck} days`]);
          });
        } else {
          rows.push([f.name, f.phone, f.district, f.block, 'No pond registered', '', '', '', `${f.daysStuck} days`]);
        }
      });
    } else if (stage === 'Active Cycle') {
      headers = ['Farmer Name', 'Phone', 'District', 'Block', 'Active Pond Name', 'Stocked Species', 'Stocking Density', 'Stocking Date', 'Days Stuck'];
      farmersList.forEach((f) => {
        if (f.ponds && f.ponds.length > 0) {
          f.ponds.forEach((p) => {
            rows.push([f.name, f.phone, f.district, f.block, p.name, p.species, p.type === 'Nursery' ? '20,000 fry/ha' : '12,000 fingerlings/ha', '2026-04-10', `${f.daysStuck} days`]);
          });
        } else {
          rows.push([f.name, f.phone, f.district, f.block, '', '', '', '', `${f.daysStuck} days`]);
        }
      });
    } else if (stage === 'Water Logging') {
      headers = ['Farmer Name', 'Phone', 'District', 'Block', 'Pond Name', 'Last Logged Date', 'Last pH', 'Last DO (mg/L)', 'Status', 'Days Stuck'];
      farmersList.forEach((f) => {
        if (f.ponds && f.ponds.length > 0) {
          f.ponds.forEach((p) => {
            rows.push([f.name, f.phone, f.district, f.block, p.name, '2026-06-25 10:30', '7.6', '5.2', 'Safe', `${f.daysStuck} days`]);
          });
        } else {
          rows.push([f.name, f.phone, f.district, f.block, '', '', '', '', 'No Logs', `${f.daysStuck} days`]);
        }
      });
    }

    const escapedRows = rows.map((r) => r.map(escapeCSV));
    const csvContent = [headers.map(escapeCSV), ...escapedRows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `matsyamitra_funnel_stage_${stage.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4"
         onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <GlassCard variant="solid" className="relative z-10 w-full max-w-2xl p-6 flex flex-col gap-4 shadow-popup border-teal-500/30 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-glass-border/40 pb-3 shrink-0">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-400">Onboarding Funnel Breakdown</div>
            <h2 className="text-lg font-bold text-ink-primary mt-1">{stage} — Stage Analysis</h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportStageCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/25 text-xs font-bold hover:bg-white hover:text-slate-950 hover:border-white transition-all duration-200 shadow-[0_2px_12px_rgba(20,184,166,0.30)] active:scale-95">
              <Download className="h-3.5 w-3.5" /> Export Stage CSV
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-glass border border-transparent hover:border-glass-border text-ink-secondary transition-all">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Description */}
        <div className="text-xs text-ink-muted leading-relaxed shrink-0">
          {stageDescriptions[stage] || ''}
        </div>

        {/* Bottleneck Definition */}
        {STUCK_REASONS[stage] && (
          <div className="p-3.5 rounded-xl bg-amber-100/70 border border-amber-300 text-amber-900 dark:bg-amber-500/5 dark:border-amber-500/25 dark:text-amber-300 space-y-1.5 shrink-0 text-xs">
            <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[9px] text-amber-800 dark:text-amber-200">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              Stage Bottleneck Definition
            </div>
            <p className="leading-relaxed text-[11px] font-medium">
              {STUCK_REASONS[stage].definition}
            </p>
            <div className="text-[10px] bg-amber-200/50 text-amber-950 rounded p-1.5 font-bold border border-amber-300 dark:bg-amber-500/10 dark:text-amber-200 dark:border-amber-500/10">
              <span>Next Action:</span> {STUCK_REASONS[stage].action}
            </div>
          </div>
        )}

        {/* KPI metrics */}
        <div className="grid grid-cols-3 gap-3 text-center shrink-0">
          {(stageKpis[stage] || []).map((kpi) => (
            <div key={kpi.label} className="p-2.5 rounded-xl border border-glass-border bg-canvas-950/40">
              <div className="text-[9px] text-ink-muted uppercase tracking-wider">{kpi.label}</div>
              <div className={`text-base font-mono font-bold mt-0.5 ${kpi.color}`}>{kpi.value}</div>
            </div>
          ))}
        </div>

        {/* Farmers Table */}
        <div className="flex-1 flex flex-col gap-2 overflow-hidden">
          <div className="flex justify-between items-center shrink-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
              Farmers Requiring Attention (showing top {displayFarmers.length} of {farmersList.length})
            </div>
            <button
              onClick={() => onOpenInDirectory(stage)}
              className="text-[10px] font-bold text-teal-400 hover:text-teal-300 transition-colors uppercase tracking-wider hover:underline"
            >
              View all in Directory →
            </button>
          </div>
          <div className="flex-1 overflow-y-auto border border-glass-border rounded-xl">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="text-[9px] uppercase tracking-wider text-ink-muted border-b border-glass-border bg-canvas-950/60 sticky top-0">
                  <th className="p-3">Farmer</th>
                  <th className="p-3">Block / District</th>
                  <th className="p-3 text-right">Stuck</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {displayFarmers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-ink-muted italic">No farmers currently in this stage.</td>
                  </tr>
                ) : (
                  displayFarmers.map((f) => (
                    <tr key={f.id} className="border-b border-glass-border/30 last:border-0 hover:bg-glass/30 transition-colors">
                      <td className="p-3">
                        <div className="font-bold text-ink-primary">{f.name}</div>
                        <div className="text-[10px] text-ink-muted font-mono">{f.phone}</div>
                      </td>
                      <td className="p-3 text-ink-secondary">{f.block}, {f.district}</td>
                      <td className={`p-3 text-right font-mono font-bold ${f.daysStuck > 30 ? 'text-severity-warning' : 'text-amber-400'}`}>
                        {f.daysStuck}d
                      </td>
                      <td className="p-3 text-right">
                        <button onClick={() => { onClose(); setTimeout(() => onFarmerClick(f), 50); }}
                          className="px-2 py-1 text-[10px] font-bold rounded bg-teal-500/10 text-teal-300 border border-teal-500/20 hover:bg-teal-500/20 transition-colors font-sans">
                          Profile ↗
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

// ── Inner page that uses useSearchParams ───────────────────────────
function FarmersPageInner() {
  const searchParams = useSearchParams();
  const urlSearch = searchParams.get('search') ?? '';

  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [searchTerm, setSearchTerm] = useState(urlSearch);
  const [selectedStage, setSelectedStage] = useState<string>('all');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
  const [selectedBlock, setSelectedBlock] = useState<string>('all');
  const [stuckFilter, setStuckFilter] = useState<string>('all');
  const [selectedFarmer, setSelectedFarmer] = useState<Farmer | null>(null);
  const [selectedFunnelStage, setSelectedFunnelStage] = useState<string | null>(null);

  // Load dynamic farmers from backend, fallback to mock list if offline or empty
  useEffect(() => {
    const fetchFarmers = async () => {
      try {
        const res = await api.get<ApiEnvelope<Farmer[]>>('/api/v1/admin/farmers');
        if (res.success && res.data && res.data.length > 0) {
          setFarmers(res.data);
        } else {
          setFarmers(MOCK_FARMERS);
        }
      } catch (err) {
        console.warn('Failed to fetch dynamic farmers, falling back to mock:', err);
        setFarmers(MOCK_FARMERS);
      }
    };
    void fetchFarmers();
  }, []);

  // Auto-open the profile if a matching farmer is found from the URL search
  useEffect(() => {
    if (urlSearch && farmers.length > 0) {
      setSearchTerm(urlSearch);
      const match = farmers.find(
        (f) => f.name.toLowerCase() === urlSearch.toLowerCase() ||
               f.name.toLowerCase().includes(urlSearch.toLowerCase())
      );
      if (match) setSelectedFarmer(match);
    }
  }, [urlSearch, farmers]);

  // Reset block filter when district changes
  useEffect(() => {
    setSelectedBlock('all');
  }, [selectedDistrict]);

  // Filter logic
  const filteredFarmers = farmers.filter((farmer) => {
    const matchesSearch =
      farmer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      farmer.phone.includes(searchTerm) ||
      farmer.block.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStage = selectedStage === 'all' || farmer.stage === selectedStage;
    const matchesDistrict = selectedDistrict === 'all' || farmer.district === selectedDistrict;
    const matchesBlock = selectedBlock === 'all' || farmer.block === selectedBlock;
    const matchesStuck =
      stuckFilter === 'all'
        ? true
        : stuckFilter === 'stuck'
        ? farmer.daysStuck > 30
        : farmer.daysStuck <= 30;
    return matchesSearch && matchesStage && matchesDistrict && matchesBlock && matchesStuck;
  });

  // CSV Export logic
  const handleExport = () => {
    const headers = ['Name', 'Phone', 'District', 'Block', 'Current Stage', 'Days Stuck', 'Status'];
    
    const escapeCSV = (val: any): string => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = filteredFarmers.map((f) => [
      f.name, f.phone, f.district, f.block, f.stage, `${f.daysStuck} days`, f.daysStuck > 30 ? 'Stuck' : 'On Track'
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

  // Open stage directory link and smooth scroll down
  const handleOpenInDirectory = (stageName: string) => {
    setSelectedStage(stageName);
    setSelectedFunnelStage(null);
    setTimeout(() => {
      const el = document.getElementById('farmers-directory-card');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  // Calculate dynamic funnel data based on farmers
  const dynamicFunnelData = (() => {
    if (farmers.length <= 25) {
      return FUNNEL_DATA;
    }
    const funnelStages = ['Registered', 'Profile Complete', 'First Pond Added', 'Active Cycle', 'Water Logging'];
    const counts = funnelStages.map((stageName, idx) => {
      const getStageIndex = (s: string) => funnelStages.indexOf(s);
      return farmers.filter((f) => getStageIndex(f.stage) >= idx).length;
    });
    const totalRegistered = counts[0] || 0;
    return funnelStages.map((stageName, idx) => ({
      name: stageName,
      count: counts[idx],
      color: FUNNEL_DATA[idx].color,
      pct: totalRegistered > 0 ? Math.round((counts[idx] / totalRegistered) * 100) : 0,
    }));
  })();

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
      </div>

      {/* Funnel Visual Container */}
      <GlassCard className="p-6">
        <h2 className="text-base font-bold text-ink-primary mb-6">Onboarding Funnel</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {dynamicFunnelData.map((stage, idx) => (
            <div
              key={stage.name}
              onClick={() => setSelectedFunnelStage(stage.name)}
              className="relative flex flex-col justify-between p-4 rounded-xl border border-glass-border bg-gradient-to-b from-canvas-900/50 to-canvas-950/50 shadow-glass cursor-pointer hover:border-teal-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all group select-none"
            >
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted group-hover:text-teal-400 transition-colors">
                  Stage {idx + 1}
                </span>
                <h3 className="text-sm font-bold text-ink-primary mt-1 group-hover:text-teal-300 transition-colors">{stage.name}</h3>
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
        <GlassCard id="farmers-directory-card" className="p-5 lg:col-span-2">
          {/* Controls */}
          <div className="flex flex-col gap-3 mb-4">
            <div className="flex flex-col sm:flex-row gap-3">
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

              {/* Action Buttons */}
              <button
                onClick={handleExport}
                className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-teal-500/10 text-teal-300 border border-teal-500/30 transition-all hover:bg-white hover:text-slate-950 hover:border-white active:scale-95 duration-200 shadow-[0_2px_12px_rgba(20,184,166,0.30)] hover:shadow-[0_4px_20px_rgba(255,255,255,0.45)]"
              >
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </button>
            </div>

            {/* Select Dropdowns */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {/* Stage Filter */}
              <div className="relative">
                <select
                  value={selectedStage}
                  onChange={(e) => setSelectedStage(e.target.value)}
                  className="appearance-none w-full bg-canvas-950/80 border border-glass-border text-ink-secondary text-xs rounded-lg pl-3 pr-8 py-2.5 outline-none focus:border-teal-500/50 transition-colors"
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

              {/* District Filter */}
              <div className="relative">
                <select
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  className="appearance-none w-full bg-canvas-950/80 border border-glass-border text-ink-secondary text-xs rounded-lg pl-3 pr-8 py-2.5 outline-none focus:border-teal-500/50 transition-colors"
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

              {/* Block Filter */}
              <div className="relative">
                <select
                  value={selectedBlock}
                  onChange={(e) => setSelectedBlock(e.target.value)}
                  disabled={selectedDistrict === 'all'}
                  className="appearance-none w-full bg-canvas-950/80 border border-glass-border text-ink-secondary text-xs rounded-lg pl-3 pr-8 py-2.5 outline-none focus:border-teal-500/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <option value="all">All Blocks</option>
                  {selectedDistrict !== 'all' &&
                    (DISTRICT_BLOCKS[selectedDistrict] || []).map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                </select>
                <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none text-ink-muted" />
              </div>

              {/* Stuck Filter */}
              <div className="relative">
                <select
                  value={stuckFilter}
                  onChange={(e) => setStuckFilter(e.target.value)}
                  className="appearance-none w-full bg-canvas-950/80 border border-glass-border text-ink-secondary text-xs rounded-lg pl-3 pr-8 py-2.5 outline-none focus:border-teal-500/50 transition-colors"
                >
                  <option value="all">All Statuses</option>
                  <option value="stuck">Stuck (&gt;30 days)</option>
                  <option value="on-track">On Track</option>
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

      {/* Funnel Stage Detail Modal */}
      {selectedFunnelStage && (
        <FunnelStageDetailModal
          stage={selectedFunnelStage}
          onClose={() => setSelectedFunnelStage(null)}
          onFarmerClick={(farmer) => setSelectedFarmer(farmer)}
          onOpenInDirectory={handleOpenInDirectory}
          farmers={farmers}
        />
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
