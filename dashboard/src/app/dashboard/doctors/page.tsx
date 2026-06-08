'use client';

import { useState } from 'react';
import {
  Stethoscope,
  Search,
  CheckCircle,
  Clock,
  Briefcase,
  Activity,
  FileText,
  Phone,
  User,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';

// Types
interface Doctor {
  id: string;
  name: string;
  specialty: string;
  district: string;
  block: string;
  phone: string;
  status: 'Available' | 'On Field Visit' | 'Inactive';
}

interface Diagnosis {
  id: string;
  farmerName: string;
  pondName: string;
  disease: string;
  treatment: string;
  prescribedBy: string;
  date: string;
  status: 'In Treatment' | 'Recovered';
}

// Mock Data
const DOCTORS: Doctor[] = [
  { id: '1', name: 'Dr. Akhilesh Kumar', specialty: 'Fish Pathology Specialist', district: 'Patna', block: 'Phulwari Sharif', phone: '9876543210', status: 'Available' },
  { id: '2', name: 'Dr. Manoj Mishra', specialty: 'Aquaculture Biologist', district: 'Gaya', block: 'Sherghati', phone: '9988776655', status: 'On Field Visit' },
  { id: '3', name: 'Dr. Priyadarshini Sen', specialty: 'Water Quality Chemist', district: 'Madhubani', block: 'Benipatti', phone: '9512345678', status: 'Available' },
  { id: '4', name: 'Dr. Santosh Kumar Mahto', specialty: 'Parasitology Expert', district: 'Muzaffarpur', block: 'Kanti', phone: '9122334455', status: 'Inactive' },
];

const DIAGNOSES: Diagnosis[] = [
  { id: '1', farmerName: 'Ramesh Prasad Singh', pondName: 'Pond A - Nursery', disease: 'Epizootic Ulcerative Syndrome (EUS)', treatment: 'CIFAX application (1 Liter per acre), water disinfection with Potassium Permanganate.', prescribedBy: 'Dr. Akhilesh Kumar', date: '2026-06-05', status: 'In Treatment' },
  { id: '2', farmerName: 'Sanjay Kumar Yadav', pondName: 'Pond B - Growout', disease: 'Aeromoniasis Outbreak', treatment: 'Oral antibiotics (Oxytetracycline) mixed in feed for 7 days. Salt bath for infected stock.', prescribedBy: 'Dr. Manoj Mishra', date: '2026-06-03', status: 'Recovered' },
  { id: '3', farmerName: 'Amit Kumar Chaudhary', pondName: 'Pond 1 - Rearing', disease: 'Argulosis (Fish Lice)', treatment: 'Deltamethrin spray application, manual weed cleaning, and pond aeration boost.', prescribedBy: 'Dr. Priyadarshini Sen', date: '2026-05-28', status: 'Recovered' },
];

export default function DoctorsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredDocs = DOCTORS.filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.specialty.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.district.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.block.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex flex-col gap-6 p-6 h-full overflow-y-auto">
      {/* Header */}
      <div>
        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-teal-400">
          Support Network
        </div>
        <h1 className="text-2xl font-bold text-ink-primary">Aquaculture Vets & Specialist Doctors</h1>
      </div>

      {/* Summary Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard className="p-4 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-teal-500/10 text-teal-400">
            <Stethoscope className="h-5 w-5" />
          </span>
          <div>
            <div className="text-xl font-mono font-bold text-ink-primary">18</div>
            <div className="text-xs text-ink-muted">Registered Doctors</div>
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-sky-500/10 text-sky-400">
            <Briefcase className="h-5 w-5" />
          </span>
          <div>
            <div className="text-xl font-mono font-bold text-ink-primary">12</div>
            <div className="text-xs text-ink-muted">Doctors On Field Active</div>
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-indigo-500/10 text-indigo-400">
            <Activity className="h-5 w-5" />
          </span>
          <div>
            <div className="text-xl font-mono font-bold text-ink-primary">85</div>
            <div className="text-xs text-ink-muted">Prescriptions Logged</div>
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-purple-500/10 text-purple-400">
            <FileText className="h-5 w-5" />
          </span>
          <div>
            <div className="text-xl font-mono font-bold text-ink-primary">4</div>
            <div className="text-xs text-ink-muted">Awaiting Diagnostics</div>
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: Doctor Directory List */}
        <GlassCard className="xl:col-span-1 p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            <div className="text-xs font-bold text-ink-muted uppercase tracking-wider">
              Specialist Directory
            </div>

            {/* Controls */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
              <input
                type="text"
                placeholder="Search specialty, name, block..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-canvas-950/80 border border-glass-border focus:border-teal-500/50 rounded-lg pl-9 pr-4 py-2 text-sm text-ink-primary placeholder-ink-muted outline-none transition-colors"
              />
            </div>

            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full appearance-none bg-canvas-950/80 border border-glass-border text-ink-secondary text-xs rounded-lg pl-3 pr-8 py-2.5 outline-none focus:border-teal-500/50 transition-colors"
              >
                <option value="all">All Statuses</option>
                <option value="Available">Available</option>
                <option value="On Field Visit">On Field Visit</option>
                <option value="Inactive">Inactive</option>
              </select>
              <Activity className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none text-ink-muted" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 max-h-[360px]">
            {filteredDocs.map((doc) => (
              <div
                key={doc.id}
                className="p-3.5 rounded-lg border border-glass-border bg-canvas-950/25 space-y-2"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-1.5">
                    <User className="h-4 w-4 text-teal-400" />
                    <span className="font-bold text-ink-primary text-xs">{doc.name}</span>
                  </div>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                    doc.status === 'Available'
                      ? 'bg-teal-500/10 text-teal-400'
                      : doc.status === 'On Field Visit'
                      ? 'bg-sky-500/10 text-sky-400'
                      : 'bg-glass-strong text-ink-muted'
                  }`}>
                    {doc.status}
                  </span>
                </div>
                <div className="text-[11px] text-ink-secondary">{doc.specialty}</div>
                <div className="text-[10px] text-ink-muted">
                  Coverage: {doc.district} ({doc.block} block)
                </div>
                <div className="pt-2 flex justify-between items-center text-[10px] border-t border-glass-border/30">
                  <span className="font-mono text-ink-muted">Contact: {doc.phone}</span>
                  <a
                    href={`tel:${doc.phone}`}
                    className="flex items-center gap-1 text-teal-400 font-semibold hover:underline"
                  >
                    <Phone className="h-3 w-3" />
                    Call Vet
                  </a>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Right: Diagnosis Logs & Prescriptions */}
        <GlassCard className="xl:col-span-2 p-5 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-ink-primary flex items-center gap-2">
              <FileText className="h-4 w-4 text-teal-400" />
              Treatment Prescription Logs
            </h3>
            <span className="text-[10px] font-mono font-bold bg-teal-500/10 text-teal-400 border border-teal-500/20 px-2 py-0.5 rounded">
              Audited Prescriptions
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 max-h-[440px]">
            {DIAGNOSES.map((diag) => (
              <div
                key={diag.id}
                className="p-4 rounded-xl border border-glass-border bg-canvas-950/20 space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[9px] font-mono font-bold text-teal-400 tracking-wider">
                      PRESCRIPTION #{diag.id}
                    </span>
                    <h4 className="text-xs font-bold text-ink-primary mt-0.5">
                      Diagnosed: {diag.disease}
                    </h4>
                  </div>
                  <span className="text-[10px] text-ink-muted font-mono">{diag.date}</span>
                </div>

                <div className="text-xs bg-canvas-950/40 p-2.5 rounded border border-glass-border/30">
                  <div className="text-ink-muted font-bold text-[10px] uppercase tracking-wider mb-1">
                    Prescribed Treatment regimen
                  </div>
                  <p className="text-ink-secondary leading-relaxed font-medium">
                    {diag.treatment}
                  </p>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-glass-border/20 text-xs">
                  <div className="text-ink-muted">
                    Farmer: <span className="font-semibold text-ink-secondary">{diag.farmerName}</span> ({diag.pondName})
                  </div>
                  <div className="text-ink-muted flex items-center gap-1.5">
                    <span>Prescribed by:</span>
                    <span className="font-semibold text-teal-400">{diag.prescribedBy}</span>
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      diag.status === 'Recovered'
                        ? 'bg-teal-500/10 text-teal-400'
                        : 'bg-sky-500/10 text-sky-400'
                    }`}>
                      {diag.status === 'Recovered' ? <CheckCircle className="h-2.5 w-2.5" /> : <Clock className="h-2.5 w-2.5" />}
                      {diag.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
