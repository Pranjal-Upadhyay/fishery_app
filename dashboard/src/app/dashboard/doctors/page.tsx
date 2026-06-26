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
  MapPin,
  X,
  Download,
  ExternalLink,
  AlertTriangle,
  Send,
  Calendar,
  Filter,
  ClipboardList,
  UserCheck,
  Navigation,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';

// ── Types ────────────────────────────────────────────────────────

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  district: string;
  block: string;
  phone: string;
  email: string;
  licenseNo: string;
  registeredOn: string;
  prescriptionsCount: number;
  status: 'Available' | 'On Field Visit' | 'Inactive';
  currentLocation?: string;
  lastPing?: string;
}

interface Prescription {
  id: string;
  refNo: string;
  farmerName: string;
  farmerPhone: string;
  pondName: string;
  district: string;
  gpsCoords: string;
  disease: string;
  symptoms: string;
  treatment: string;
  medicines: string[];
  prescribedBy: string;
  doctorPhone: string;
  visitDate: string;
  followUpDate: string;
  status: 'In Treatment' | 'Recovered' | 'Follow-up Due';
}

interface PendingDiagnostic {
  id: string;
  farmerName: string;
  farmerPhone: string;
  pondName: string;
  district: string;
  alertType: string;
  reportedAt: string;
  daysWaiting: number;
  severity: 'critical' | 'warning';
  assignedDoctor?: string;
}

// ── Mock Data ─────────────────────────────────────────────────────

const DOCTORS: Doctor[] = [
  { id: '1', name: 'Dr. Akhilesh Kumar',       specialty: 'Fish Pathology Specialist',  district: 'Patna',      block: 'Phulwari Sharif', phone: '9876543210', email: 'akhilesh.kumar@bsfisheries.in',    licenseNo: 'BSF-VET-001', registeredOn: '2024-03-12', prescriptionsCount: 32, status: 'Available',      currentLocation: undefined,                                 lastPing: '—'          },
  { id: '2', name: 'Dr. Manoj Mishra',          specialty: 'Aquaculture Biologist',      district: 'Gaya',       block: 'Sherghati',       phone: '9988776655', email: 'manoj.mishra@bsfisheries.in',      licenseNo: 'BSF-VET-002', registeredOn: '2024-04-01', prescriptionsCount: 21, status: 'On Field Visit', currentLocation: 'Ramesh Prasad Singh Farm, Patna', lastPing: '14 mins ago' },
  { id: '3', name: 'Dr. Priyadarshini Sen',     specialty: 'Water Quality Chemist',      district: 'Madhubani',  block: 'Benipatti',       phone: '9512345678', email: 'priya.sen@bsfisheries.in',         licenseNo: 'BSF-VET-003', registeredOn: '2024-05-20', prescriptionsCount: 18, status: 'Available',      currentLocation: undefined,                                 lastPing: '—'          },
  { id: '4', name: 'Dr. Santosh Kumar Mahto',   specialty: 'Parasitology Expert',        district: 'Muzaffarpur',block: 'Kanti',           phone: '9122334455', email: 'santosh.mahto@bsfisheries.in',     licenseNo: 'BSF-VET-004', registeredOn: '2024-06-15', prescriptionsCount: 9,  status: 'Inactive',       currentLocation: undefined,                                 lastPing: '—'          },
  { id: '5', name: 'Dr. Ranjit Singh Yadav',    specialty: 'Fish Nutrition Expert',      district: 'Darbhanga',  block: 'Baheri',          phone: '9654321098', email: 'ranjit.yadav@bsfisheries.in',      licenseNo: 'BSF-VET-005', registeredOn: '2024-07-08', prescriptionsCount: 5,  status: 'Available',      currentLocation: undefined,                                 lastPing: '—'          },
];

const PRESCRIPTIONS: Prescription[] = [
  {
    id: '1', refNo: 'RX-2026-0051',
    farmerName: 'Ramesh Prasad Singh', farmerPhone: '9845012345',
    pondName: 'Pond A - Nursery', district: 'Patna',
    gpsCoords: '25.5800° N, 85.1200° E',
    disease: 'Epizootic Ulcerative Syndrome (EUS)',
    symptoms: 'Red ulcerative lesions on body surface, haemorrhagic spots near fins, fish surfacing abnormally. Approx 8% mortality observed over 48 hours.',
    treatment: 'CIFAX application (1 Litre per acre), water disinfection with Potassium Permanganate (KMnO₄) at 2 ppm for 30 minutes. Daily DO monitoring. Reduce feeding by 50%.',
    medicines: ['CIFAX — 1 L/acre', 'KMnO₄ bath — 2 ppm / 30 min', 'Agricultural Lime — 200 kg/ha'],
    prescribedBy: 'Dr. Akhilesh Kumar', doctorPhone: '9876543210',
    visitDate: '2026-06-05', followUpDate: '2026-06-15',
    status: 'In Treatment',
  },
  {
    id: '2', refNo: 'RX-2026-0048',
    farmerName: 'Sanjay Kumar Yadav', farmerPhone: '9744123456',
    pondName: 'Pond B - Growout', district: 'Madhubani',
    gpsCoords: '26.3650° N, 86.0850° E',
    disease: 'Aeromoniasis Outbreak',
    symptoms: 'Fin erosion, abdominal dropsy (swollen belly), skin haemorrhage on ventral side. Behavioural changes — fish lethargic and refusing feed for 3 days.',
    treatment: 'Oral antibiotics (Oxytetracycline) at 75 mg/kg body weight mixed in feed for 7 days. Salt bath (3%) for infected stock. Probiotic supplementation (Bacillus subtilis) post-antibiotic course.',
    medicines: ['Oxytetracycline — 75 mg/kg in feed / 7 days', 'Salt Bath — 3% NaCl solution', 'Probiotic: Bacillus subtilis — 5g/kg feed'],
    prescribedBy: 'Dr. Manoj Mishra', doctorPhone: '9988776655',
    visitDate: '2026-06-03', followUpDate: '2026-06-20',
    status: 'Recovered',
  },
  {
    id: '3', refNo: 'RX-2026-0041',
    farmerName: 'Amit Kumar Chaudhary', farmerPhone: '9512345678',
    pondName: 'Pond 1 - Rearing', district: 'Gaya',
    gpsCoords: '24.7801° N, 84.9902° E',
    disease: 'Argulosis (Fish Lice Infestation)',
    symptoms: 'Fish flashing (rubbing against pond walls), visible Argulus (fish lice) parasites on body surface. Skin erosions and secondary fungal infection beginning.',
    treatment: 'Deltamethrin spray application at 0.02 ppm. Manual weed cleaning to remove parasite habitat. Pond aeration boost. Second application after 10 days to break parasite life cycle.',
    medicines: ['Deltamethrin — 0.02 ppm spray', 'Formalin dip — 250 ppm / 30 min (infected fish)', 'Pond lime treatment — 200 kg/ha after 14 days'],
    prescribedBy: 'Dr. Priyadarshini Sen', doctorPhone: '9512345678',
    visitDate: '2026-05-28', followUpDate: '2026-06-10',
    status: 'Recovered',
  },
  {
    id: '4', refNo: 'RX-2026-0057',
    farmerName: 'Hari Har Paswan', farmerPhone: '9512345678',
    pondName: 'Pond 1 - Rearing', district: 'Gaya',
    gpsCoords: '24.7800° N, 84.9901° E',
    disease: 'Acute DO Deficiency + Secondary Bacterial Infection',
    symptoms: 'Mass surfacing (piping) observed at dawn. DO reading: 2.4 mg/L. Secondary fin rot developing. 3% acute mortality in 12 hours.',
    treatment: 'Emergency aerator deployment. Potassium permanganate application. Lime dosing for pH correction. Stop feeding for 48 hours. Re-measure DO every 4 hours.',
    medicines: ['Emergency Aeration — run continuously 24h', 'KMnO₄ — 2 ppm pond treatment', 'Agricultural Lime (CaO) — 150 kg/ha'],
    prescribedBy: 'Dr. Akhilesh Kumar', doctorPhone: '9876543210',
    visitDate: '2026-06-07', followUpDate: '2026-06-14',
    status: 'Follow-up Due',
  },
];

const PENDING_DIAGNOSTICS: PendingDiagnostic[] = [
  { id: 'p1', farmerName: 'Binod Kumar Sah',      farmerPhone: '9888123477', pondName: 'Main Pond',         district: 'Muzaffarpur', alertType: 'Unusual fish mortality — Unknown cause',   reportedAt: '2026-06-07 08:15', daysWaiting: 1, severity: 'critical' },
  { id: 'p2', farmerName: 'Shyam Kishore Mandal',  farmerPhone: '9433221100', pondName: 'Growout Block A',   district: 'Bhagalpur',   alertType: 'White fungal patches on Rohu stock',       reportedAt: '2026-06-06 14:30', daysWaiting: 2, severity: 'warning'  },
  { id: 'p3', farmerName: 'Lallan Yadav',           farmerPhone: '9547821690', pondName: 'Nursery Block 1',   district: 'Madhubani',   alertType: 'Gill discoloration — possible EUS',        reportedAt: '2026-06-05 11:00', daysWaiting: 3, severity: 'critical' },
  { id: 'p4', farmerName: 'Devendra Kumar Ojha',    farmerPhone: '9002154783', pondName: 'Main Growout',      district: 'Gaya',        alertType: 'High ammonia + feed refusal for 3 days',   reportedAt: '2026-06-04 09:45', daysWaiting: 4, severity: 'warning'  },
];

// ── CSV Export helper ─────────────────────────────────────────────

function exportDoctorsCSV() {
  const headers = ['License No', 'Name', 'Specialty', 'District', 'Block', 'Phone', 'Email', 'Registered On', 'Prescriptions Filed', 'Status'];
  
  const escapeCSV = (val: any): string => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = DOCTORS.map((d) => [
    d.licenseNo, d.name, d.specialty, d.district, d.block,
    d.phone, d.email, d.registeredOn, d.prescriptionsCount, d.status,
  ].map(escapeCSV));

  const csvContent = [headers.map(escapeCSV), ...rows].map((r) => r.join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `matsyamitra_doctors_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function gmapsLink(coords: string) {
  // "25.5800° N, 85.1200° E" → "25.5800,85.1200"
  const clean = coords.replace(/°\s*[NSEW]/g, '').replace(/\s/g, '');
  return `https://www.google.com/maps?q=${clean}`;
}

// ── Sub-modals ────────────────────────────────────────────────────

type ModalType = 'registered' | 'onField' | 'prescriptions' | 'awaiting' | null;

function DoctorProfileModal({ doctor, onClose }: { doctor: Doctor; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
         onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <GlassCard className="relative z-10 w-full max-w-md p-6 flex flex-col gap-5 shadow-glow border-teal-500/30 max-h-[85vh] overflow-y-auto">
        <div className="flex justify-between items-start border-b border-glass-border/40 pb-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-400">Doctor Profile</div>
            <h2 className="text-lg font-bold text-ink-primary mt-1">{doctor.name}</h2>
            <div className="text-xs text-ink-secondary mt-0.5">{doctor.specialty}</div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-glass border border-transparent hover:border-glass-border text-ink-secondary transition-all">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Status badge */}
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
            doctor.status === 'Available'      ? 'bg-teal-500/10 text-teal-400 border-teal-500/25' :
            doctor.status === 'On Field Visit' ? 'bg-sky-500/10 text-sky-400 border-sky-500/25' :
                                                  'bg-glass-strong text-ink-muted border-glass-border'
          }`}>{doctor.status}</span>
          {doctor.status === 'On Field Visit' && doctor.currentLocation && (
            <div className="text-xs text-ink-muted flex items-center gap-1">
              <Navigation className="h-3 w-3 text-sky-400" />
              <span className="truncate">{doctor.currentLocation}</span>
            </div>
          )}
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          {[
            { label: 'License No', value: doctor.licenseNo },
            { label: 'Registered', value: doctor.registeredOn },
            { label: 'Coverage District', value: doctor.district },
            { label: 'Block', value: doctor.block },
            { label: 'Prescriptions Filed', value: String(doctor.prescriptionsCount) },
            { label: 'Last Active', value: doctor.lastPing || '—' },
          ].map((item) => (
            <div key={item.label} className="p-2.5 rounded-lg border border-glass-border bg-canvas-950/40">
              <div className="text-[10px] text-ink-muted uppercase tracking-wider">{item.label}</div>
              <div className="font-semibold text-ink-primary mt-0.5">{item.value}</div>
            </div>
          ))}
        </div>

        {/* Contact */}
        <div className="p-3 rounded-lg border border-glass-border bg-canvas-950/40 space-y-2 text-xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-teal-400">Contact</div>
          <a href={`tel:${doctor.phone}`} className="flex items-center gap-2 text-ink-secondary hover:text-teal-400 transition-colors">
            <Phone className="h-3.5 w-3.5" /> <span className="font-mono">{doctor.phone}</span>
          </a>
          <div className="flex items-center gap-2 text-ink-secondary">
            <Send className="h-3.5 w-3.5" /> <span>{doctor.email}</span>
          </div>
        </div>

        <div className="flex gap-2 pt-1 border-t border-glass-border/40">
          <a href={`tel:${doctor.phone}`} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-teal-500/10 text-teal-300 border border-teal-500/30 hover:bg-teal-500/20 text-xs font-semibold transition-colors">
            <Phone className="h-4 w-4" /> Call Doctor
          </a>
        </div>
      </GlassCard>
    </div>
  );
}

function PrescriptionDetailModal({ rx: rx, onClose }: { rx: Prescription; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
         onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <GlassCard className={`relative z-10 w-full max-w-lg p-6 flex flex-col gap-5 shadow-glow max-h-[90vh] overflow-y-auto border ${
        rx.status === 'In Treatment' ? 'border-sky-500/30' : rx.status === 'Follow-up Due' ? 'border-amber-500/30' : 'border-teal-500/30'
      }`}>
        {/* Header */}
        <div className="flex justify-between items-start border-b border-glass-border/40 pb-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-400">Prescription Record</div>
            <h2 className="text-lg font-bold text-ink-primary mt-1 font-mono">{rx.refNo}</h2>
            <div className="text-xs text-ink-secondary mt-0.5">{rx.disease}</div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
              rx.status === 'Recovered'      ? 'bg-teal-500/10 text-teal-400 border-teal-500/25' :
              rx.status === 'Follow-up Due'  ? 'bg-amber-500/10 text-amber-400 border-amber-500/25 animate-pulse' :
                                               'bg-sky-500/10 text-sky-400 border-sky-500/25'
            }`}>{rx.status}</span>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-glass border border-transparent hover:border-glass-border text-ink-secondary transition-all">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Farmer & Location */}
        <div className="p-3 rounded-xl border border-glass-border bg-canvas-950/40 space-y-2.5 text-xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-teal-400">Farmer / Farm Location</div>
          <div className="flex justify-between items-start">
            <div className="space-y-1.5">
              <div className="font-semibold text-ink-primary text-sm">{rx.farmerName}</div>
              <a href={`tel:${rx.farmerPhone}`} className="flex items-center gap-1.5 text-ink-secondary hover:text-teal-400 transition-colors">
                <Phone className="h-3.5 w-3.5" /> <span className="font-mono">{rx.farmerPhone}</span>
              </a>
              <div className="flex items-center gap-1.5 text-ink-secondary">
                <MapPin className="h-3.5 w-3.5" /> <span>{rx.pondName}, {rx.district}</span>
              </div>
            </div>
            <a
              href={gmapsLink(rx.gpsCoords)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-sky-500/10 text-sky-300 border border-sky-500/25 text-[10px] font-bold hover:bg-sky-500/20 transition-colors whitespace-nowrap"
            >
              <Navigation className="h-3.5 w-3.5" />
              Open in Maps
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <div className="font-mono text-[10px] text-ink-muted">{rx.gpsCoords}</div>
        </div>

        {/* Symptoms */}
        <div className="p-3 rounded-xl border border-rose-500/20 bg-rose-500/5 space-y-1.5 text-xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Observed Symptoms</div>
          <p className="text-ink-secondary leading-relaxed">{rx.symptoms}</p>
        </div>

        {/* Treatment */}
        <div className="p-3 rounded-xl border border-sky-500/20 bg-sky-500/5 space-y-1.5 text-xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-sky-400">Prescribed Treatment Regimen</div>
          <p className="text-ink-secondary leading-relaxed">{rx.treatment}</p>
        </div>

        {/* Medicines list */}
        <div className="space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-teal-400">Medicines / Treatments Prescribed</div>
          {rx.medicines.map((med, i) => (
            <div key={i} className="flex items-start gap-2 text-xs p-2 rounded-lg border border-glass-border bg-canvas-950/30">
              <span className="text-teal-400 font-bold shrink-0 font-mono">{i + 1}.</span>
              <span className="text-ink-primary font-semibold">{med}</span>
            </div>
          ))}
        </div>

        {/* Doctor + Dates */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-lg border border-glass-border bg-canvas-950/40 space-y-1">
            <div className="text-[10px] text-ink-muted uppercase">Prescribed By</div>
            <div className="font-semibold text-teal-400">{rx.prescribedBy}</div>
            <a href={`tel:${rx.doctorPhone}`} className="flex items-center gap-1 text-ink-secondary hover:text-teal-400 transition-colors font-mono text-[10px]">
              <Phone className="h-3 w-3" />{rx.doctorPhone}
            </a>
          </div>
          <div className="p-3 rounded-lg border border-glass-border bg-canvas-950/40 space-y-1">
            <div className="text-[10px] text-ink-muted uppercase">Dates</div>
            <div className="flex items-center gap-1 text-ink-secondary">
              <Calendar className="h-3 w-3 text-teal-400" />
              <span>Visit: <span className="font-semibold text-ink-primary">{rx.visitDate}</span></span>
            </div>
            <div className="flex items-center gap-1 text-ink-secondary">
              <Calendar className="h-3 w-3 text-amber-400" />
              <span>Follow-up: <span className={`font-semibold ${rx.status === 'Follow-up Due' ? 'text-amber-400' : 'text-ink-primary'}`}>{rx.followUpDate}</span></span>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

// ── KPI Modals ────────────────────────────────────────────────────

function KpiModal({ type, onClose, onDoctorClick, onRxClick, assignedIds, onAssign }: {
  type: ModalType;
  onClose: () => void;
  onDoctorClick: (doc: Doctor) => void;
  onRxClick: (rx: Prescription) => void;
  assignedIds: Set<string>;
  onAssign: (id: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredDocs = DOCTORS.filter((d) => {
    const s = search.toLowerCase();
    return (
      (d.name.toLowerCase().includes(s) || d.specialty.toLowerCase().includes(s) || d.district.toLowerCase().includes(s)) &&
      (statusFilter === 'all' || d.status === statusFilter)
    );
  });

  const titles: Record<Exclude<ModalType, null>, string> = {
    registered:    'Registered Doctors — Full Directory',
    onField:       'Doctors On Field — Live Deployment Status',
    prescriptions: 'Prescriptions Logged — Full Audit Log (85)',
    awaiting:      'Awaiting Diagnostics — Pending Assignment Queue',
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4"
         onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <GlassCard className="relative z-10 w-full max-w-2xl p-6 flex flex-col gap-5 shadow-glow border-teal-500/30 max-h-[88vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-glass-border/40 pb-4 shrink-0">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-400">Veterinary Network</div>
            <h2 className="text-lg font-bold text-ink-primary mt-1">{type ? titles[type] : ''}</h2>
          </div>
          <div className="flex items-center gap-2">
            {type === 'registered' && (
              <button onClick={exportDoctorsCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/25 text-xs font-bold hover:bg-teal-500/20 transition-colors">
                <Download className="h-3.5 w-3.5" /> Export CSV
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-glass border border-transparent hover:border-glass-border text-ink-secondary transition-all">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ── REGISTERED ── */}
        {type === 'registered' && (
          <div className="flex flex-col gap-4 overflow-hidden">
            <div className="flex gap-2 shrink-0">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
                <input type="text" placeholder="Search name, specialty, district…" value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-canvas-950/80 border border-glass-border focus:border-teal-500/50 rounded-lg pl-9 pr-4 py-2 text-sm text-ink-primary placeholder-ink-muted outline-none transition-colors" />
              </div>
              <div className="relative">
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                  className="appearance-none bg-canvas-950/80 border border-glass-border text-ink-secondary text-xs rounded-lg pl-3 pr-7 py-2.5 outline-none">
                  <option value="all">All Status</option>
                  <option value="Available">Available</option>
                  <option value="On Field Visit">On Field</option>
                  <option value="Inactive">Inactive</option>
                </select>
                <Filter className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none text-ink-muted" />
              </div>
            </div>
            <div className="overflow-y-auto space-y-3 flex-1 pr-1">
              {filteredDocs.map((doc) => (
                <div key={doc.id}
                  onClick={() => { onClose(); setTimeout(() => onDoctorClick(doc), 50); }}
                  className="p-4 rounded-xl border border-glass-border bg-canvas-950/30 hover:bg-glass-subtle hover:border-teal-500/30 transition-all cursor-pointer group">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-teal-400" />
                      <div>
                        <div className="text-sm font-bold text-ink-primary group-hover:text-teal-400 transition-colors">{doc.name}</div>
                        <div className="text-[11px] text-ink-secondary">{doc.specialty}</div>
                      </div>
                    </div>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                      doc.status === 'Available' ? 'bg-teal-500/10 text-teal-400' :
                      doc.status === 'On Field Visit' ? 'bg-sky-500/10 text-sky-400' :
                      'bg-glass-strong text-ink-muted'}`}>{doc.status}</span>
                  </div>
                  <div className="mt-2 flex justify-between items-center text-[10px] text-ink-muted">
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{doc.district} · {doc.block}</span>
                    <span className="font-mono">{doc.licenseNo}</span>
                    <span className="text-teal-400 font-bold">{doc.prescriptionsCount} Rx</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center text-[10px] text-ink-muted shrink-0">Click any card to view full doctor profile ↗</div>
          </div>
        )}

        {/* ── ON FIELD ── */}
        {type === 'onField' && (
          <div className="overflow-y-auto space-y-4">
            <div className="text-xs text-ink-muted p-3 rounded-lg border border-sky-500/20 bg-sky-500/5">
              📡 Live field deployment status. Location data is shared by doctors via the MatsyaMitra app when they mark a visit as "In Progress".
            </div>
            {DOCTORS.filter((d) => d.status === 'On Field Visit').map((doc) => (
              <div key={doc.id} className="p-4 rounded-xl border border-sky-500/25 bg-sky-500/5 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-ink-primary">{doc.name}</div>
                    <div className="text-xs text-ink-secondary">{doc.specialty}</div>
                  </div>
                  <span className="text-[10px] font-mono text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded">Last ping: {doc.lastPing}</span>
                </div>
                {doc.currentLocation && (
                  <div className="flex items-center gap-2 text-xs text-sky-300">
                    <Navigation className="h-3.5 w-3.5" /><span>{doc.currentLocation}</span>
                  </div>
                )}
                <a href={`tel:${doc.phone}`} className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-teal-400 hover:underline">
                  <Phone className="h-3 w-3" />{doc.phone}
                </a>
              </div>
            ))}
            {DOCTORS.filter((d) => d.status !== 'On Field Visit').map((doc) => (
              <div key={doc.id} className="p-3 rounded-xl border border-glass-border bg-canvas-950/20 flex justify-between items-center text-xs opacity-60">
                <div>
                  <div className="font-semibold text-ink-primary">{doc.name}</div>
                  <div className="text-ink-muted">{doc.district} · {doc.specialty}</div>
                </div>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                  doc.status === 'Available' ? 'bg-teal-500/10 text-teal-400' : 'bg-glass-strong text-ink-muted'}`}>
                  {doc.status}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ── PRESCRIPTIONS LOG ── */}
        {type === 'prescriptions' && (
          <div className="flex flex-col gap-3 overflow-hidden">
            <div className="text-xs text-ink-muted p-3 rounded-lg border border-indigo-500/20 bg-indigo-500/5 shrink-0">
              💊 These are prescription records filed by doctors after field visits. Each prescription is logged through the Doctor Visit Form in the MatsyaMitra app. The app form is under development; current data is representative.
            </div>
            <div className="overflow-y-auto space-y-3 flex-1 pr-1">
              {PRESCRIPTIONS.map((rx) => (
                <div key={rx.id}
                  onClick={() => { onClose(); setTimeout(() => onRxClick(rx), 50); }}
                  className="p-4 rounded-xl border border-glass-border bg-canvas-950/30 hover:bg-glass-subtle hover:border-teal-500/30 transition-all cursor-pointer group">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[9px] font-mono font-bold text-teal-400">{rx.refNo}</span>
                      <div className="text-sm font-bold text-ink-primary group-hover:text-teal-400 transition-colors mt-0.5">{rx.disease}</div>
                      <div className="text-xs text-ink-secondary">{rx.farmerName} — {rx.pondName}, {rx.district}</div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      rx.status === 'Recovered'     ? 'bg-teal-500/10 text-teal-400 border-teal-500/25' :
                      rx.status === 'Follow-up Due' ? 'bg-amber-500/10 text-amber-400 border-amber-500/25' :
                                                      'bg-sky-500/10 text-sky-400 border-sky-500/25'
                    }`}>{rx.status}</span>
                  </div>
                  <div className="mt-2 flex justify-between text-[10px] text-ink-muted">
                    <span className="text-teal-400 font-semibold">{rx.prescribedBy}</span>
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{rx.visitDate}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center text-[10px] text-ink-muted shrink-0">Click any prescription to view full details including farm GPS location ↗</div>
          </div>
        )}

        {/* ── AWAITING DIAGNOSTICS ── */}
        {type === 'awaiting' && (
          <div className="flex flex-col gap-3 overflow-hidden">
            <div className="text-xs text-ink-muted p-3 rounded-lg border border-purple-500/20 bg-purple-500/5 shrink-0">
              🔬 These are farmer-reported disease alerts that have not yet been assigned to a vet doctor for diagnosis. Farmers report via the MatsyaMitra app → alert enters this queue → admin assigns a doctor → doctor visits & files prescription → exits queue.
            </div>
            <div className="overflow-y-auto space-y-3 flex-1 pr-1">
              {PENDING_DIAGNOSTICS.map((pd) => (
                <div key={pd.id} className={`p-4 rounded-xl border space-y-3 ${
                  pd.severity === 'critical' ? 'border-rose-500/30 bg-rose-500/5' : 'border-amber-500/30 bg-amber-500/5'
                }`}>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className={`h-4 w-4 shrink-0 ${pd.severity === 'critical' ? 'text-rose-400' : 'text-amber-400'}`} />
                      <div>
                        <div className="text-sm font-bold text-ink-primary">{pd.alertType}</div>
                        <div className="text-xs text-ink-secondary">{pd.farmerName} — {pd.pondName}, {pd.district}</div>
                      </div>
                    </div>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                      pd.daysWaiting >= 3 ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'
                    }`}>{pd.daysWaiting}d waiting</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-ink-muted">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Reported: {pd.reportedAt}</span>
                    <a href={`tel:${pd.farmerPhone}`} className="flex items-center gap-1 text-teal-400 hover:underline">
                      <Phone className="h-3 w-3" />{pd.farmerPhone}
                    </a>
                  </div>
                  {assignedIds.has(pd.id) ? (
                    <div className="flex items-center gap-2 py-1.5 text-xs font-bold text-teal-400">
                      <CheckCircle className="h-4 w-4" /> Doctor assigned — waiting for visit confirmation
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      {DOCTORS.filter((d) => d.status === 'Available').map((doc) => (
                        <button key={doc.id}
                          onClick={() => { onAssign(pd.id); alert(`${doc.name} has been assigned to diagnose ${pd.farmerName}'s farm. SMS dispatch sent.`); }}
                          className="flex-1 py-1.5 text-[10px] font-bold rounded border border-sky-500/25 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20 transition-colors">
                          Assign {doc.name.split(' ')[1]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────

export default function DoctorsPage() {
  const [searchTerm, setSearchTerm]       = useState('');
  const [statusFilter, setStatusFilter]   = useState<string>('all');
  const [activeKpiModal, setActiveKpiModal]         = useState<ModalType>(null);
  const [selectedDoctor, setSelectedDoctor]         = useState<Doctor | null>(null);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [assignedDiagnosticIds, setAssignedDiagnosticIds] = useState<Set<string>>(new Set());

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
        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-teal-400">Support Network</div>
        <h1 className="text-2xl font-bold text-ink-primary">Aquaculture Vets &amp; Specialist Doctors</h1>
      </div>

      {/* Summary Grid — all clickable */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard className="p-4 flex items-center gap-3 cursor-pointer hover:border-teal-500/40 hover:bg-teal-500/5 transition-all group"
          onClick={() => setActiveKpiModal('registered')}>
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-teal-500/10 text-teal-400 group-hover:bg-teal-500/20 transition-colors">
            <Stethoscope className="h-5 w-5" />
          </span>
          <div>
            <div className="text-xl font-mono font-bold text-ink-primary">{DOCTORS.length + 13}</div>
            <div className="text-xs text-ink-muted">Registered Doctors</div>
            <div className="text-[10px] text-teal-400 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">View directory ↗</div>
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center gap-3 cursor-pointer hover:border-sky-500/40 hover:bg-sky-500/5 transition-all group"
          onClick={() => setActiveKpiModal('onField')}>
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-sky-500/10 text-sky-400 group-hover:bg-sky-500/20 transition-colors">
            <Briefcase className="h-5 w-5" />
          </span>
          <div>
            <div className="text-xl font-mono font-bold text-ink-primary">12</div>
            <div className="text-xs text-ink-muted">Doctors On Field Active</div>
            <div className="text-[10px] text-sky-400 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">View live status ↗</div>
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center gap-3 cursor-pointer hover:border-indigo-500/40 hover:bg-indigo-500/5 transition-all group"
          onClick={() => setActiveKpiModal('prescriptions')}>
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/20 transition-colors">
            <Activity className="h-5 w-5" />
          </span>
          <div>
            <div className="text-xl font-mono font-bold text-ink-primary">85</div>
            <div className="text-xs text-ink-muted">Prescriptions Logged</div>
            <div className="text-[10px] text-indigo-400 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">View audit log ↗</div>
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center gap-3 cursor-pointer hover:border-purple-500/40 hover:bg-purple-500/5 transition-all group"
          onClick={() => setActiveKpiModal('awaiting')}>
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20 transition-colors">
            <FileText className="h-5 w-5" />
          </span>
          <div>
            <div className="text-xl font-mono font-bold text-ink-primary">{PENDING_DIAGNOSTICS.length}</div>
            <div className="text-xs text-ink-muted">Awaiting Diagnostics</div>
            <div className="text-[10px] text-purple-400 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">View queue ↗</div>
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Doctor Directory */}
        <GlassCard className="xl:col-span-1 p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            <div className="text-xs font-bold text-ink-muted uppercase tracking-wider">Specialist Directory</div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
              <input type="text" placeholder="Search specialty, name, block..."
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-canvas-950/80 border border-glass-border focus:border-teal-500/50 rounded-lg pl-9 pr-4 py-2 text-sm text-ink-primary placeholder-ink-muted outline-none transition-colors" />
            </div>
            <div className="relative">
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full appearance-none bg-canvas-950/80 border border-glass-border text-ink-secondary text-xs rounded-lg pl-3 pr-8 py-2.5 outline-none focus:border-teal-500/50 transition-colors">
                <option value="all">All Statuses</option>
                <option value="Available">Available</option>
                <option value="On Field Visit">On Field Visit</option>
                <option value="Inactive">Inactive</option>
              </select>
              <Activity className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none text-ink-muted" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 max-h-[400px]">
            {filteredDocs.map((doc) => (
              <div key={doc.id}
                onClick={() => setSelectedDoctor(doc)}
                className="p-3.5 rounded-lg border border-glass-border bg-canvas-950/25 space-y-2 cursor-pointer hover:bg-glass-subtle hover:border-teal-500/30 transition-all group">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-1.5">
                    <User className="h-4 w-4 text-teal-400" />
                    <span className="font-bold text-ink-primary text-xs group-hover:text-teal-400 transition-colors">{doc.name}</span>
                  </div>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                    doc.status === 'Available'      ? 'bg-teal-500/10 text-teal-400' :
                    doc.status === 'On Field Visit' ? 'bg-sky-500/10 text-sky-400' :
                                                      'bg-glass-strong text-ink-muted'}`}>
                    {doc.status}
                  </span>
                </div>
                <div className="text-[11px] text-ink-secondary">{doc.specialty}</div>
                <div className="text-[10px] text-ink-muted">Coverage: {doc.district} ({doc.block} block)</div>
                <div className="pt-2 flex justify-between items-center text-[10px] border-t border-glass-border/30">
                  <span className="font-mono text-ink-muted">{doc.phone}</span>
                  <a href={`tel:${doc.phone}`} onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 text-teal-400 font-semibold hover:underline">
                    <Phone className="h-3 w-3" /> Call Vet
                  </a>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center text-[10px] text-ink-muted">Click any card to view full doctor profile ↗</div>
        </GlassCard>

        {/* Prescription Logs */}
        <GlassCard className="xl:col-span-2 p-5 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-ink-primary flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-teal-400" />
              Treatment Prescription Logs
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold bg-teal-500/10 text-teal-400 border border-teal-500/20 px-2 py-0.5 rounded">
                Audited Prescriptions
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 max-h-[480px]">
            {PRESCRIPTIONS.map((rx) => (
              <div key={rx.id}
                onClick={() => setSelectedPrescription(rx)}
                className="p-4 rounded-xl border border-glass-border bg-canvas-950/20 space-y-3 cursor-pointer hover:bg-glass-subtle hover:border-teal-500/30 transition-all group">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[9px] font-mono font-bold text-teal-400 tracking-wider">{rx.refNo}</span>
                    <h4 className="text-xs font-bold text-ink-primary group-hover:text-teal-400 transition-colors mt-0.5">{rx.disease}</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-ink-muted font-mono">{rx.visitDate}</span>
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      rx.status === 'Recovered'     ? 'bg-teal-500/10 text-teal-400' :
                      rx.status === 'Follow-up Due' ? 'bg-amber-500/10 text-amber-400' :
                                                      'bg-sky-500/10 text-sky-400'}`}>
                      {rx.status === 'Recovered'    ? <CheckCircle className="h-2.5 w-2.5" /> :
                       rx.status === 'Follow-up Due' ? <AlertTriangle className="h-2.5 w-2.5" /> :
                                                       <Clock className="h-2.5 w-2.5" />}
                      {rx.status}
                    </span>
                  </div>
                </div>

                <div className="text-xs bg-canvas-950/40 p-2.5 rounded border border-glass-border/30 line-clamp-2">
                  <div className="text-ink-muted font-bold text-[10px] uppercase tracking-wider mb-1">Prescribed Treatment</div>
                  <p className="text-ink-secondary leading-relaxed">{rx.treatment}</p>
                </div>

                <div className="flex justify-between items-center pt-1 border-t border-glass-border/20 text-xs">
                  <div className="text-ink-muted flex items-center gap-1.5">
                    <MapPin className="h-3 w-3 text-teal-400" />
                    <span className="font-semibold text-ink-secondary">{rx.farmerName}</span>
                    <span className="text-ink-muted">({rx.pondName})</span>
                  </div>
                  <div className="text-teal-400 font-semibold">{rx.prescribedBy}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center text-[10px] text-ink-muted">Click any prescription to view full details &amp; farm GPS location ↗</div>
        </GlassCard>
      </div>

      {/* ── Modals ─────────────────────────────────────────────── */}
      {activeKpiModal && (
        <KpiModal
          type={activeKpiModal}
          onClose={() => setActiveKpiModal(null)}
          onDoctorClick={(doc) => setSelectedDoctor(doc)}
          onRxClick={(rx) => setSelectedPrescription(rx)}
          assignedIds={assignedDiagnosticIds}
          onAssign={(id) => setAssignedDiagnosticIds((prev) => new Set([...prev, id]))}
        />
      )}

      {selectedDoctor && (
        <DoctorProfileModal doctor={selectedDoctor} onClose={() => setSelectedDoctor(null)} />
      )}

      {selectedPrescription && (
        <PrescriptionDetailModal rx={selectedPrescription} onClose={() => setSelectedPrescription(null)} />
      )}
    </div>
  );
}
