'use client';

import { useState } from 'react';
import {
  Sprout,
  TrendingUp,
  Award,
  Archive,
  Calendar,
  Percent,
  Activity,
  User,
  Phone,
  Mail,
  MapPin,
  X,
  ExternalLink,
  Zap,
  Package,
  Download,
  BarChart2,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';

// CSV Export helpers
function exportLeaderboardToCSV(leaderboard: typeof LEADERBOARD) {
  const headers = ['Rank', 'District', 'Total Yield (Tons)', 'Avg FCR', 'Compliance (%)'];

  const escapeCSV = (val: any): string => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = leaderboard.map((l) => [l.rank, l.district, l.yieldTons, l.avgFcr, l.compliancePct].map(escapeCSV));
  const csvContent = [headers.map(escapeCSV), ...rows].map((r) => r.join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `district_yield_leaderboard_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function exportDetailedYieldCSV() {
  const escapeCSV = (val: any): string => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const speciesRows = [
    ['Yield Breakdown by Species', '', ''],
    ['Species', 'Yield (Tons)', 'Percentage (%)'],
    ['Jayanti Rohu (Improved)', '6200', '44%'],
    ['Standard Rohu', '3800', '27%'],
    ['Amrita Katla', '2400', '17%'],
    ['Standard Katla', '1100', '8%'],
    ['Other (Silver Carp, etc.)', '600', '4%'],
    ['Total Species Yield', '14100', '100%'],
  ].map((r) => r.map(escapeCSV));

  const districtRows = [
    [],
    ['District YoY Yield vs Previous Year', '', '', ''],
    ['District', 'FY 24-25 (Tons)', 'FY 23-24 (Tons)', 'YoY Change (%)'],
    ['Madhubani', '4250', '3740', '+13.6%'],
    ['Patna', '3890', '3520', '+10.5%'],
    ['Darbhanga', '3120', '2800', '+11.4%'],
    ['Gaya', '2840', '2640', '+7.6%'],
    ['Muzaffarpur', '0', '0', 'New enrollment FY25'],
    ['Total District Yield', '14100', '12700', '+11.0%'],
  ].map((r) => r.map(escapeCSV));

  const csvContent = [...speciesRows, ...districtRows].map((r) => r.join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `total_yield_harvested_breakdown_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Types
interface HarvestLog {
  id: string;
  pondName: string;
  farmerName: string;
  species: string;
  durationMonths: number;
  totalYieldKg: number;
  survivalPct: number;
  fcr: number; // Feed Conversion Ratio
}

interface FeedItem {
  brand: string;
  purchasedBags: number;
  consumedBags: number;
  bagWeightKg: number;
  unitCost: number;
  remainingBags: number;
}

interface EnergyLog {
  aeratorQty: number;
  aeratorHp: number;
  avgHoursPerDay: number;
  powerSource: string;
  electricUnitsKwh: number;
  electricCostInr: number;
  dieselConsumedLitres: number;
  dieselCostInr: number;
}

interface FarmerSpotlight {
  district: string;
  farmerName: string;
  phone: string;
  email: string;
  pondName: string;
  species: string;
  source: string;
  durationMonths: number;
  yieldKg: number;
  survivalPct: number;
  fcr: number;
  costs: {
    formulatedFeed: number;
    homemadeFeed: number;
    probiotic: number;
    medicine: number;
    equipment: number;
    labor: number;
  };
  revenue: number;
  feedInventory: FeedItem;
  energyLogs: EnergyLog;
}

// Mock Data
const HARVEST_LOGS: HarvestLog[] = [
  { id: '1', pondName: 'Pond B - Growout', farmerName: 'Sanjay Kumar Yadav', species: 'Jayanti Rohu', durationMonths: 8, totalYieldKg: 4200, survivalPct: 84, fcr: 1.42 },
  { id: '2', pondName: 'Main Growout', farmerName: 'Vikram Sen Verma', species: 'Amrita Katla', durationMonths: 10, totalYieldKg: 3500, survivalPct: 76, fcr: 1.58 },
  { id: '3', pondName: 'Chaur Plot 4', farmerName: 'Rajendra Kumar Mahto', species: 'Jayanti Rohu', durationMonths: 9, totalYieldKg: 5800, survivalPct: 80, fcr: 1.45 },
  { id: '4', pondName: 'Nursery Pond 2', farmerName: 'Amit Kumar Chaudhary', species: 'Standard Katla', durationMonths: 11, totalYieldKg: 2900, survivalPct: 71, fcr: 1.62 },
];

const LEADERBOARD = [
  { rank: 1, district: 'Madhubani', yieldTons: 4250, avgFcr: 1.40, compliancePct: 92 },
  { rank: 2, district: 'Patna', yieldTons: 3890, avgFcr: 1.48, compliancePct: 88 },
  { rank: 3, district: 'Darbhanga', yieldTons: 3120, avgFcr: 1.45, compliancePct: 85 },
  { rank: 4, district: 'Gaya', yieldTons: 2840, avgFcr: 1.52, compliancePct: 81 },
];

const GROWTH_DATA = [
  { month: 'Month 1', jayanti: 40, standard: 25, ratio: '+60%' },
  { month: 'Month 2', jayanti: 110, standard: 75, ratio: '+46%' },
  { month: 'Month 3', jayanti: 220, standard: 150, ratio: '+46%' },
  { month: 'Month 4', jayanti: 410, standard: 280, ratio: '+46%' },
  { month: 'Month 5', jayanti: 650, standard: 420, ratio: '+54%' },
  { month: 'Month 6', jayanti: 950, standard: 650, ratio: '+46%' },
];

const MOCK_SPOTLIGHTS: FarmerSpotlight[] = [
  {
    district: 'Madhubani',
    farmerName: 'Sanjay Kumar Yadav',
    phone: '+91 97441 23456',
    email: 'sanjay.yadav@matsyamail.in',
    pondName: 'Pond B - Growout',
    species: 'Jayanti Rohu (Improved Lineage)',
    source: 'Mithila Matsya Hatchery (MH-BR-049)',
    durationMonths: 8,
    yieldKg: 4200,
    survivalPct: 84,
    fcr: 1.42,
    costs: {
      formulatedFeed: 65000,
      homemadeFeed: 25000,
      probiotic: 8000,
      medicine: 4500,
      equipment: 22000,
      labor: 15000,
    },
    revenue: 588000,
    feedInventory: {
      brand: 'Cargill LignoFish Float 2.5mm',
      purchasedBags: 180,
      consumedBags: 168,
      bagWeightKg: 25,
      unitCost: 1820,
      remainingBags: 12,
    },
    energyLogs: {
      aeratorQty: 2,
      aeratorHp: 2.0,
      avgHoursPerDay: 6.5,
      powerSource: 'Solar-Grid Hybrid (PM-KUSUM / JKSY)',
      electricUnitsKwh: 480,
      electricCostInr: 3600,
      dieselConsumedLitres: 24,
      dieselCostInr: 2280,
    },
  },
  {
    district: 'Patna',
    farmerName: 'Ramesh Prasad Singh',
    phone: '+91 98450 12345',
    email: 'ramesh.singh@patnafish.co.in',
    pondName: 'Pond A - Nursery',
    species: 'Standard Rohu',
    source: 'Patna Central Hatchery (PH-BR-012)',
    durationMonths: 10,
    yieldKg: 3500,
    survivalPct: 76,
    fcr: 1.48,
    costs: {
      formulatedFeed: 52000,
      homemadeFeed: 18000,
      probiotic: 5500,
      medicine: 3000,
      equipment: 12000,
      labor: 10000,
    },
    revenue: 455000,
    feedInventory: {
      brand: 'Godrej Anik Floating Feed',
      purchasedBags: 150,
      consumedBags: 142,
      bagWeightKg: 20,
      unitCost: 1650,
      remainingBags: 8,
    },
    energyLogs: {
      aeratorQty: 1,
      aeratorHp: 1.5,
      avgHoursPerDay: 4.0,
      powerSource: 'Rural Electricity Grid',
      electricUnitsKwh: 320,
      electricCostInr: 2400,
      dieselConsumedLitres: 12,
      dieselCostInr: 1140,
    },
  },
  {
    district: 'Darbhanga',
    farmerName: 'Vikram Sen Verma',
    phone: '+91 99887 76655',
    email: 'vikram.verma@example.com',
    pondName: 'Main Growout',
    species: 'Amrita Katla',
    source: 'Kosi River Hatchery (KR-BR-088)',
    durationMonths: 10,
    yieldKg: 3500,
    survivalPct: 76,
    fcr: 1.58,
    costs: {
      formulatedFeed: 48000,
      homemadeFeed: 20000,
      probiotic: 6000,
      medicine: 3800,
      equipment: 15000,
      labor: 12000,
    },
    revenue: 412000,
    feedInventory: {
      brand: 'CP Classic Sinking Pellet',
      purchasedBags: 160,
      consumedBags: 150,
      bagWeightKg: 25,
      unitCost: 1520,
      remainingBags: 10,
    },
    energyLogs: {
      aeratorQty: 1,
      aeratorHp: 2.0,
      avgHoursPerDay: 5.0,
      powerSource: 'Grid Power + Diesel Genset',
      electricUnitsKwh: 390,
      electricCostInr: 2925,
      dieselConsumedLitres: 35,
      dieselCostInr: 3325,
    },
  },
  {
    district: 'Gaya',
    farmerName: 'Amit Kumar Chaudhary',
    phone: '+91 95123 45678',
    email: 'amit.chaudhary@gmail.com',
    pondName: 'Nursery Pond 2',
    species: 'Standard Katla',
    source: 'Gaya Fishery Seed (GS-BR-034)',
    durationMonths: 11,
    yieldKg: 2900,
    survivalPct: 71,
    fcr: 1.62,
    costs: {
      formulatedFeed: 44000,
      homemadeFeed: 15000,
      probiotic: 4000,
      medicine: 2500,
      equipment: 10000,
      labor: 8000,
    },
    revenue: 340000,
    feedInventory: {
      brand: 'Homemade Mustard Cake & Rice Bran',
      purchasedBags: 120,
      consumedBags: 115,
      bagWeightKg: 30,
      unitCost: 850,
      remainingBags: 5,
    },
    energyLogs: {
      aeratorQty: 0,
      aeratorHp: 0.0,
      avgHoursPerDay: 0.0,
      powerSource: 'Diesel Pump Replenishment Only',
      electricUnitsKwh: 0,
      electricCostInr: 0,
      dieselConsumedLitres: 110,
      dieselCostInr: 10450,
    },
  },
];


type ProductionModalType = 'yield' | 'yieldDetail' | 'fcr' | 'survival' | 'jayanti' | null;

export default function ProductionPage() {
  const [selectedFarmer, setSelectedFarmer] = useState<FarmerSpotlight | null>(null);
  const [hoveredMonthIndex, setHoveredMonthIndex] = useState<number | null>(null);
  const [modalTab, setModalTab] = useState<'overview' | 'feed' | 'energy'>('overview');
  const [activeProductionModal, setActiveProductionModal] = useState<ProductionModalType>(null);

  const handleOpenSpotlightByDistrict = (district: string) => {
    const spotlight = MOCK_SPOTLIGHTS.find((s) => s.district.toLowerCase() === district.toLowerCase());
    if (spotlight) {
      setSelectedFarmer(spotlight);
      setModalTab('overview');
    }
  };

  const handleOpenSpotlightByFarmerName = (name: string) => {
    const spotlight = MOCK_SPOTLIGHTS.find((s) => s.farmerName.toLowerCase() === name.toLowerCase());
    if (spotlight) {
      setSelectedFarmer(spotlight);
      setModalTab('overview');
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 h-full overflow-y-auto relative">
      {/* Header */}
      <div>
        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-teal-400">
          Biological Output
        </div>
        <h1 className="text-2xl font-bold text-ink-primary">Aquaculture Production & Harvests</h1>
      </div>

      {/* Yield Statistics Bento Grid — all cards are clickable */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard
          className="p-4 flex items-center gap-3 cursor-pointer hover:border-teal-500/40 hover:bg-teal-500/5 transition-all group"
          onClick={() => setActiveProductionModal('yieldDetail')}
        >
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-teal-500/10 text-teal-400 group-hover:bg-teal-500/20 transition-colors">
            <Sprout className="h-5 w-5" />
          </span>
          <div>
            <div className="text-2xl font-mono font-bold text-ink-primary">14.1k T</div>
            <div className="text-xs text-ink-muted">Total Yield Harvested</div>
            <div className="text-[10px] text-teal-400 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">Click for species breakdown ↗</div>
          </div>
        </GlassCard>

        <GlassCard
          className="p-4 flex items-center gap-3 cursor-pointer hover:border-sky-500/40 hover:bg-sky-500/5 transition-all group"
          onClick={() => setActiveProductionModal('fcr')}
        >
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-sky-500/10 text-sky-400 group-hover:bg-sky-500/20 transition-colors">
            <TrendingUp className="h-5 w-5" />
          </span>
          <div>
            <div className="text-2xl font-mono font-bold text-ink-primary">1.49</div>
            <div className="text-xs text-ink-muted">Avg Feed Conversion (FCR)</div>
            <div className="text-[10px] text-sky-400 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">Click to understand FCR ↗</div>
          </div>
        </GlassCard>

        <GlassCard
          className="p-4 flex items-center gap-3 cursor-pointer hover:border-indigo-500/40 hover:bg-indigo-500/5 transition-all group"
          onClick={() => setActiveProductionModal('survival')}
        >
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/20 transition-colors">
            <Percent className="h-5 w-5" />
          </span>
          <div>
            <div className="text-2xl font-mono font-bold text-ink-primary">77.8%</div>
            <div className="text-xs text-ink-muted">Average Survival Rate</div>
            <div className="text-[10px] text-indigo-400 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">Click for pond breakdown ↗</div>
          </div>
        </GlassCard>

        <GlassCard
          className="p-4 flex items-center gap-3 cursor-pointer hover:border-purple-500/40 hover:bg-purple-500/5 transition-all group"
          onClick={() => setActiveProductionModal('jayanti')}
        >
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20 transition-colors">
            <Activity className="h-5 w-5" />
          </span>
          <div>
            <div className="text-2xl font-mono font-bold text-ink-primary">+18%</div>
            <div className="text-xs text-ink-muted">Jayanti Rohu Yield Increase</div>
            <div className="text-[10px] text-purple-400 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">Click to see analysis ↗</div>
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: Growth Comparison curves */}
        <GlassCard className="p-5 xl:col-span-1 flex flex-col gap-4 relative">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-ink-primary flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-teal-400" />
              Growth Curve Benchmarks
            </h3>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/20">
              Jayanti vs Standard
            </span>
          </div>

          <div className="flex-1 flex flex-col gap-4 text-xs">
            <p className="text-ink-secondary leading-relaxed">
              Biological tracking of average weight over 6 months.
              Hover over the chart to inspect monthly metrics.
            </p>

            {/* SVG line / area chart */}
            <div className="relative w-full h-[180px] bg-canvas-950/40 rounded-lg border border-glass-border p-2">
              <svg className="w-full h-full" viewBox="0 0 320 180">
                {/* Defs for gradients */}
                <defs>
                  <linearGradient id="grad-jayanti" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="grad-standard" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.1" />
                    <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Y Axis Gridlines */}
                {[15, 50, 85, 120, 155].map((yVal, idx) => (
                  <line
                    key={idx}
                    x1="35"
                    y1={yVal}
                    x2="310"
                    y2={yVal}
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth="1"
                  />
                ))}

                {/* Y Axis Labels */}
                <text x="5" y="20" fill="rgba(255,255,255,0.4)" fontSize="8" fontFamily="monospace">1000g</text>
                <text x="5" y="55" fill="rgba(255,255,255,0.4)" fontSize="8" fontFamily="monospace">750g</text>
                <text x="5" y="90" fill="rgba(255,255,255,0.4)" fontSize="8" fontFamily="monospace">500g</text>
                <text x="5" y="125" fill="rgba(255,255,255,0.4)" fontSize="8" fontFamily="monospace">250g</text>
                <text x="5" y="158" fill="rgba(255,255,255,0.4)" fontSize="8" fontFamily="monospace">0g</text>

                {/* Area fills */}
                <path
                  d="M 40 149.4 L 94 139.6 L 148 124.2 L 202 97.6 L 256 64 L 310 22 L 310 155 L 40 155 Z"
                  fill="url(#grad-jayanti)"
                />
                <path
                  d="M 40 151.5 L 94 144.5 L 148 134 L 202 115.8 L 256 96.2 L 310 64 L 310 155 L 40 155 Z"
                  fill="url(#grad-standard)"
                />

                {/* Standard Rohu line (slate) */}
                <path
                  d="M 40 151.5 L 94 144.5 L 148 134 L 202 115.8 L 256 96.2 L 310 64"
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="2"
                  strokeOpacity="0.6"
                />

                {/* Jayanti Rohu line (teal) */}
                <path
                  d="M 40 149.4 L 94 139.6 L 148 124.2 L 202 97.6 L 256 64 L 310 22"
                  fill="none"
                  stroke="#2dd4bf"
                  strokeWidth="2.5"
                />

                {/* Data point markers */}
                {GROWTH_DATA.map((d, idx) => {
                  const x = 40 + idx * 54;
                  const yStandard = 155 - (d.standard / 1000 * 140);
                  const yJayanti = 155 - (d.jayanti / 1000 * 140);
                  const isHovered = hoveredMonthIndex === idx;

                  return (
                    <g key={idx}>
                      {/* Standard Dot */}
                      <circle
                        cx={x}
                        cy={yStandard}
                        r={isHovered ? 4 : 2.5}
                        fill="#94a3b8"
                      />
                      {/* Jayanti Dot */}
                      <circle
                        cx={x}
                        cy={yJayanti}
                        r={isHovered ? 5.5 : 3.5}
                        fill="#2dd4bf"
                      />
                    </g>
                  );
                })}

                {/* X Axis Labels */}
                {GROWTH_DATA.map((d, idx) => (
                  <text
                    key={idx}
                    x={40 + idx * 54}
                    y="172"
                    fill="rgba(255,255,255,0.4)"
                    fontSize="8"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    M{idx + 1}
                  </text>
                ))}

                {/* Hover guide line */}
                {hoveredMonthIndex !== null && (
                  <line
                    x1={40 + hoveredMonthIndex * 54}
                    y1="15"
                    x2={40 + hoveredMonthIndex * 54}
                    y2="155"
                    stroke="#0ea5e9"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                    strokeOpacity="0.7"
                  />
                )}

                {/* Hover trigger rectangles */}
                {GROWTH_DATA.map((_, idx) => {
                  const x = 40 + idx * 54;
                  return (
                    <rect
                      key={idx}
                      x={x - 27}
                      y="15"
                      width="54"
                      height="140"
                      fill="transparent"
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredMonthIndex(idx)}
                      onMouseLeave={() => setHoveredMonthIndex(null)}
                    />
                  );
                })}
              </svg>

              {/* Floating Tooltip Box */}
              {hoveredMonthIndex !== null && (
                <div className="absolute top-2 left-12 right-12 p-2 rounded bg-slate-950/95 border border-glass-border shadow-md flex justify-between items-center text-[10px] font-mono pointer-events-none z-10">
                  <div>
                    <span className="text-teal-400 font-bold">Jayanti: {GROWTH_DATA[hoveredMonthIndex].jayanti}g</span>
                  </div>
                  <div className="text-ink-muted">|</div>
                  <div>
                    <span className="text-slate-400">Standard: {GROWTH_DATA[hoveredMonthIndex].standard}g</span>
                  </div>
                  <div className="text-ink-muted">|</div>
                  <div className="text-teal-400 font-bold">
                    {GROWTH_DATA[hoveredMonthIndex].ratio}
                  </div>
                </div>
              )}
            </div>

            {/* Micro legend */}
            <div className="flex justify-around items-center text-[10px] font-mono p-2 rounded bg-canvas-950/20 border border-glass-border/30">
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded bg-teal-400" />
                <span className="text-ink-primary">Jayanti Rohu</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded bg-slate-500" />
                <span className="text-ink-secondary">Standard Rohu</span>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Center: District Yield Leaderboard */}
        <GlassCard className="p-5 xl:col-span-1 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-ink-primary flex items-center gap-2">
                <Award className="h-4 w-4 text-teal-400" />
                District Yield Leaderboard
              </h3>
              <span className="text-[10px] text-ink-muted mt-1 block">
                Click on a district to inspect the top-performing farmer spotlight.
              </span>
            </div>
            <button
              onClick={() => exportLeaderboardToCSV(LEADERBOARD)}
              title="Export to CSV"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/20 text-[10px] font-semibold hover:bg-white hover:text-slate-950 hover:border-white transition-all duration-200 shrink-0"
            >
              <Download className="h-3 w-3" />
              CSV
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3.5">
            {LEADERBOARD.map((item) => (
              <div
                key={item.district}
                onClick={() => handleOpenSpotlightByDistrict(item.district)}
                className="flex items-center gap-3 p-3 rounded-lg border border-glass-border bg-canvas-950/20 hover:bg-glass hover:border-teal-500/30 cursor-pointer transition-all duration-200 group"
              >
                <div className="grid h-7 w-7 place-items-center rounded-lg bg-teal-500/10 text-teal-400 font-mono font-bold text-sm">
                  #{item.rank}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-ink-primary text-xs truncate flex items-center gap-1.5">
                    {item.district} District
                    <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 text-teal-400 transition-opacity" />
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-ink-muted mt-1 font-mono">
                    <span>Avg FCR: {item.avgFcr}</span>
                    <span>Compliance: {item.compliancePct}%</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-xs font-bold text-ink-primary">
                    {item.yieldTons} T
                  </div>
                  <span className="text-[9px] font-bold text-teal-400">Yield</span>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Right: Completed Harvest log archive */}
        <GlassCard className="p-5 xl:col-span-1 flex flex-col gap-4">
          <div>
            <h3 className="text-sm font-bold text-ink-primary flex items-center gap-2">
              <Archive className="h-4 w-4 text-teal-400" />
              Completed Harvest Log Archive
            </h3>
            <span className="text-[10px] text-ink-muted mt-1 block">
              Click on any harvest card to review the full details and logged costs.
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 max-h-[350px]">
            {HARVEST_LOGS.map((log) => (
              <div
                key={log.id}
                onClick={() => handleOpenSpotlightByFarmerName(log.farmerName)}
                className="p-3.5 rounded-lg border border-glass-border/40 bg-canvas-950/30 hover:bg-glass hover:border-teal-500/30 cursor-pointer transition-all duration-200 space-y-2.5 text-xs group"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-ink-primary flex items-center gap-1.5">
                      {log.pondName}
                      <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 text-teal-400 transition-opacity" />
                    </h4>
                    <div className="text-[10px] text-ink-muted mt-0.5">{log.farmerName}</div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] text-ink-muted font-mono">
                    <Calendar className="h-3 w-3" />
                    {log.durationMonths} Months
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-[10px] p-2 rounded bg-canvas-950/40 border border-glass-border/20 font-mono">
                  <div>
                    <div className="text-ink-muted">Total Yield</div>
                    <div className="font-bold text-ink-primary mt-0.5">{(log.totalYieldKg / 1000).toFixed(1)} T</div>
                  </div>
                  <div>
                    <div className="text-ink-muted">Survival</div>
                    <div className="font-bold text-teal-400 mt-0.5">{log.survivalPct}%</div>
                  </div>
                  <div>
                    <div className="text-ink-muted">FCR</div>
                    <div className="font-bold text-sky-400 mt-0.5">{log.fcr}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Farmer Yield Spotlight Modal */}
      {selectedFarmer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <GlassCard className="relative w-full max-w-2xl p-6 overflow-y-auto max-h-[90vh] flex flex-col gap-5 shadow-popup border-teal-500/30">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-glass-border/40 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-400">
                  Top Farmer Yield Spotlight — {selectedFarmer.district} District
                </span>
                <h2 className="text-xl font-bold text-ink-primary flex items-center gap-2 mt-1">
                  <User className="h-5 w-5 text-teal-300" />
                  {selectedFarmer.farmerName}
                </h2>
              </div>
              <button
                onClick={() => setSelectedFarmer(null)}
                className="p-1 rounded-lg hover:bg-glass border border-transparent hover:border-glass-border text-ink-secondary hover:text-ink-primary transition-all"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-glass-border/30 text-xs">
              <button
                onClick={() => setModalTab('overview')}
                className={`pb-2.5 px-4 font-semibold border-b-2 transition-all ${
                  modalTab === 'overview'
                    ? 'border-teal-500 text-teal-400 font-bold'
                    : 'border-transparent text-ink-muted hover:text-ink-secondary'
                }`}
              >
                Production Overview
              </button>
              <button
                onClick={() => setModalTab('feed')}
                className={`pb-2.5 px-4 font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                  modalTab === 'feed'
                    ? 'border-teal-500 text-teal-400 font-bold'
                    : 'border-transparent text-ink-muted hover:text-ink-secondary'
                }`}
              >
                <Package className="h-3.5 w-3.5" />
                Feed Stock Ledger
              </button>
              <button
                onClick={() => setModalTab('energy')}
                className={`pb-2.5 px-4 font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                  modalTab === 'energy'
                    ? 'border-teal-500 text-teal-400 font-bold'
                    : 'border-transparent text-ink-muted hover:text-ink-secondary'
                }`}
              >
                <Zap className="h-3.5 w-3.5" />
                Aeration & Energy Logs
              </button>
            </div>

            {/* Modal Content */}
            {modalTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column: Contact and Crop Data */}
                <div className="space-y-4">
                  {/* Contact Panel */}
                  <div className="p-4 rounded-xl border border-glass-border bg-canvas-950/40 space-y-2.5 text-xs">
                    <h4 className="font-bold text-teal-400 uppercase tracking-wider text-[10px]">
                      Verified Contact details
                    </h4>
                    <div className="flex items-center gap-2 text-ink-secondary">
                      <Phone className="h-4 w-4 text-ink-muted" />
                      <span className="font-mono">{selectedFarmer.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-ink-secondary">
                      <Mail className="h-4 w-4 text-ink-muted" />
                      <span>{selectedFarmer.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-ink-secondary">
                      <MapPin className="h-4 w-4 text-ink-muted" />
                      <span>{selectedFarmer.district} District, Bihar</span>
                    </div>
                  </div>

                  {/* Stocking Details */}
                  <div className="p-4 rounded-xl border border-glass-border bg-canvas-950/40 space-y-3.5 text-xs">
                    <h4 className="font-bold text-teal-400 uppercase tracking-wider text-[10px]">
                      Cultured Crop & Stocking Specs
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10px] text-ink-muted block uppercase tracking-wider">Pond Unit</span>
                        <span className="font-semibold text-ink-primary text-sm mt-0.5 block">{selectedFarmer.pondName}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-ink-muted block uppercase tracking-wider">Species stocked</span>
                        <span className="font-semibold text-ink-primary text-sm mt-0.5 block">{selectedFarmer.species}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-ink-muted block uppercase tracking-wider">Seed Source Hatchery</span>
                        <span className="font-semibold text-ink-primary text-xs mt-0.5 block">{selectedFarmer.source}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-ink-muted block uppercase tracking-wider">Growout Period</span>
                        <span className="font-semibold text-ink-primary text-sm mt-0.5 block">{selectedFarmer.durationMonths} Months</span>
                      </div>
                    </div>
                  </div>

                  {/* Biological telemetry */}
                  <div className="p-4 rounded-xl border border-glass-border bg-canvas-950/40 space-y-2.5 text-xs">
                    <h4 className="font-bold text-teal-400 uppercase tracking-wider text-[10px]">
                      Empirical Yield Metrics
                    </h4>
                    <div className="grid grid-cols-3 gap-2 text-center font-mono">
                      <div className="p-2 rounded bg-canvas-950/50 border border-glass-border/30">
                        <div className="text-[9px] text-ink-muted uppercase">Yield</div>
                        <div className="font-bold text-ink-primary mt-0.5 text-sm">{selectedFarmer.yieldKg.toLocaleString()} kg</div>
                      </div>
                      <div className="p-2 rounded bg-canvas-950/50 border border-glass-border/30">
                        <div className="text-[9px] text-ink-muted uppercase">Survival</div>
                        <div className="font-bold text-teal-400 mt-0.5 text-sm">{selectedFarmer.survivalPct}%</div>
                      </div>
                      <div className="p-2 rounded bg-canvas-950/50 border border-glass-border/30">
                        <div className="text-[9px] text-ink-muted uppercase">FCR</div>
                        <div className="font-bold text-sky-400 mt-0.5 text-sm">{selectedFarmer.fcr}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Actual Costs & Balance */}
                <div className="space-y-4">
                  {/* Cost Breakdown */}
                  <div className="p-4 rounded-xl border border-glass-border bg-canvas-950/40 space-y-3.5 text-xs">
                    <h4 className="font-bold text-teal-400 uppercase tracking-wider text-[10px]">
                      Actual Expenses Incurred (Logged via App)
                    </h4>
                    <div className="space-y-2 font-mono">
                      <CostRow label="Formulated Pellets" value={selectedFarmer.costs.formulatedFeed} />
                      <CostRow label="Homemade Feed Mash" value={selectedFarmer.costs.homemadeFeed} />
                      <CostRow label="Biological Probiotics" value={selectedFarmer.costs.probiotic} />
                      <CostRow label="Water Treatment/Meds" value={selectedFarmer.costs.medicine} />
                      <CostRow label="Motor Pump/Aerator Costs" value={selectedFarmer.costs.equipment} />
                      <CostRow label="Hired labor Expenses" value={selectedFarmer.costs.labor} />
                      <div className="border-t border-glass-border/40 pt-2 flex justify-between font-bold text-ink-primary mt-1">
                        <span>Total Season Cost</span>
                        <span>₹{Object.values(selectedFarmer.costs).reduce((a, b) => a + b, 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Return On Investment */}
                  <div className="p-4 rounded-xl border border-glass-border bg-canvas-950/40 space-y-3 text-xs">
                    <h4 className="font-bold text-teal-400 uppercase tracking-wider text-[10px]">
                      Financial Balance Ledger
                    </h4>
                    <div className="space-y-2 font-mono">
                      <div className="flex justify-between">
                        <span className="text-ink-secondary">Gross Harvest Revenue</span>
                        <span className="text-ink-primary font-bold">₹{selectedFarmer.revenue.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between border-t border-glass-border/20 pt-2 text-sm">
                        <span className="text-ink-secondary font-bold">Net Seasonal Profit</span>
                        <span className="text-teal-400 font-extrabold">
                          ₹{(selectedFarmer.revenue - Object.values(selectedFarmer.costs).reduce((a, b) => a + b, 0)).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {modalTab === 'feed' && (
              <div className="p-4 rounded-xl border border-glass-border bg-canvas-950/40 text-xs space-y-4">
                <div className="flex justify-between items-center border-b border-glass-border/25 pb-3">
                  <div>
                    <h4 className="font-bold text-teal-400 uppercase tracking-wider text-[10px]">
                      Feed Stock & Consumed Inventory Ledger
                    </h4>
                    <div className="text-ink-primary font-semibold text-sm mt-0.5">
                      {selectedFarmer.feedInventory.brand}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/20 font-mono text-[9px] font-bold">
                    App Log: Verified
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center font-mono">
                  <div className="p-3 rounded bg-canvas-950/50 border border-glass-border/20">
                    <div className="text-[9px] text-ink-muted uppercase">Purchased</div>
                    <div className="font-bold text-ink-primary text-base mt-1">
                      {selectedFarmer.feedInventory.purchasedBags} bags
                    </div>
                  </div>
                  <div className="p-3 rounded bg-canvas-950/50 border border-glass-border/20">
                    <div className="text-[9px] text-ink-muted uppercase">Consumed</div>
                    <div className="font-bold text-teal-400 text-base mt-1">
                      {selectedFarmer.feedInventory.consumedBags} bags
                    </div>
                  </div>
                  <div className="p-3 rounded bg-canvas-950/50 border border-glass-border/20">
                    <div className="text-[9px] text-ink-muted uppercase">In Stock</div>
                    <div className="font-bold text-sky-400 text-base mt-1">
                      {selectedFarmer.feedInventory.remainingBags} bags
                    </div>
                  </div>
                  <div className="p-3 rounded bg-canvas-950/50 border border-glass-border/20">
                    <div className="text-[9px] text-ink-muted uppercase">Unit Price</div>
                    <div className="font-bold text-ink-primary text-base mt-1">
                      ₹{selectedFarmer.feedInventory.unitCost}
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded bg-canvas-950/60 border border-glass-border/25 space-y-2 font-mono">
                  <div className="flex justify-between">
                    <span className="text-ink-secondary">Single Bag Weight:</span>
                    <span className="text-ink-primary font-semibold">{selectedFarmer.feedInventory.bagWeightKg} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-secondary">Total Feed Consumed:</span>
                    <span className="text-ink-primary font-semibold">
                      {(selectedFarmer.feedInventory.consumedBags * selectedFarmer.feedInventory.bagWeightKg).toLocaleString()} kg
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-glass-border/20 pt-2 text-xs font-bold">
                    <span className="text-ink-secondary">Resulting Feed Conversion Ratio (FCR):</span>
                    <span className="text-teal-400">{selectedFarmer.fcr}</span>
                  </div>
                </div>
              </div>
            )}

            {modalTab === 'energy' && (
              <div className="p-4 rounded-xl border border-glass-border bg-canvas-950/40 text-xs space-y-4">
                <div className="flex justify-between items-center border-b border-glass-border/25 pb-3">
                  <div>
                    <h4 className="font-bold text-teal-400 uppercase tracking-wider text-[10px]">
                      Aeration & Energy Logs
                    </h4>
                    <div className="text-ink-primary font-semibold text-sm mt-0.5">
                      Power Configuration: {selectedFarmer.energyLogs.powerSource}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono text-[9px] font-bold">
                    Daily Sync
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded bg-canvas-950/50 border border-glass-border/20 space-y-2.5 font-mono">
                    <h5 className="font-bold text-teal-400 uppercase tracking-wider text-[9px]">
                      Aerator Asset Metrics
                    </h5>
                    <div className="flex justify-between">
                      <span className="text-ink-secondary">Aerator Units:</span>
                      <span className="text-ink-primary font-semibold">{selectedFarmer.energyLogs.aeratorQty} Qty</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-secondary">Unit Power:</span>
                      <span className="text-ink-primary font-semibold">{selectedFarmer.energyLogs.aeratorHp} HP</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-secondary">Daily Run Time:</span>
                      <span className="text-ink-primary font-semibold">{selectedFarmer.energyLogs.avgHoursPerDay} hrs/day</span>
                    </div>
                  </div>

                  <div className="p-4 rounded bg-canvas-950/50 border border-glass-border/20 space-y-2.5 font-mono">
                    <h5 className="font-bold text-teal-400 uppercase tracking-wider text-[9px]">
                      Utility & Fuel Expenditures
                    </h5>
                    <div className="flex justify-between">
                      <span className="text-ink-secondary">Electricity Consumed:</span>
                      <span className="text-ink-primary font-semibold">{selectedFarmer.energyLogs.electricUnitsKwh} kWh</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-secondary">Electricity Cost:</span>
                      <span className="text-ink-primary font-semibold">₹{selectedFarmer.energyLogs.electricCostInr.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-secondary">Diesel Generator Fuel:</span>
                      <span className="text-ink-primary font-semibold">{selectedFarmer.energyLogs.dieselConsumedLitres} Litres</span>
                    </div>
                    <div className="flex justify-between border-t border-glass-border/20 pt-1.5 font-bold">
                      <span className="text-ink-secondary">Total Energy Cost:</span>
                      <span className="text-rose-400">
                        ₹{(selectedFarmer.energyLogs.electricCostInr + selectedFarmer.energyLogs.dieselCostInr).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {/* ── Production KPI Detail Modals ─────────────────────── */}
      {activeProductionModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setActiveProductionModal(null); }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setActiveProductionModal(null)} />
          <GlassCard variant="solid" className="relative z-10 w-full max-w-xl p-6 shadow-popup border-teal-500/30 max-h-[85vh] overflow-y-auto flex flex-col gap-5">
            {/* Header */}
            <div className="flex justify-between items-start border-b border-glass-border/40 pb-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-400">Production Analytics</div>
                <h2 className="text-lg font-bold text-ink-primary mt-1">
                  {activeProductionModal === 'yield' && 'Total Yield — Species Breakdown'}
                  {activeProductionModal === 'yieldDetail' && 'Total Yield Harvested — Detailed Breakdown'}
                  {activeProductionModal === 'fcr' && 'Feed Conversion Ratio (FCR) Explained'}
                  {activeProductionModal === 'survival' && 'Survival Rate — Pond-Level Breakdown'}
                  {activeProductionModal === 'jayanti' && 'Jayanti Rohu +18% Advantage Analysis'}
                </h2>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {activeProductionModal === 'yieldDetail' && (
                  <button
                    onClick={exportDetailedYieldCSV}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/25 text-xs font-bold hover:bg-white hover:text-slate-950 hover:border-white transition-all duration-200"
                  >
                    <Download className="h-3.5 w-3.5" /> Export CSV
                  </button>
                )}
                <button
                  onClick={() => setActiveProductionModal(null)}
                  className="p-1.5 rounded-lg hover:bg-glass border border-transparent hover:border-glass-border text-ink-secondary transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Yield detail breakdown */}
            {activeProductionModal === 'yieldDetail' && (
              <div className="space-y-5">
                <div className="text-xs text-ink-muted">Total harvested yield across all registered farmer-cycles for FY 2024-25. Broken down by species, district, and compared to the previous year.</div>

                {/* KPI strip */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  {[
                    { label: 'Total Yield', value: '14,100 T', color: 'text-teal-400', sub: 'FY 2024-25' },
                    { label: 'YoY Growth', value: '+12.4%', color: 'text-sky-400', sub: 'vs FY 2023-24' },
                    { label: 'Active Cycles', value: '420', color: 'text-indigo-400', sub: 'farmers enrolled' },
                  ].map((kpi) => (
                    <div key={kpi.label} className="p-3 rounded-xl border border-glass-border bg-canvas-950/40">
                      <div className="text-[10px] text-ink-muted uppercase tracking-wider">{kpi.label}</div>
                      <div className={`text-xl font-mono font-bold mt-1 ${kpi.color}`}>{kpi.value}</div>
                      <div className="text-[9px] text-ink-muted mt-0.5">{kpi.sub}</div>
                    </div>
                  ))}
                </div>

                {/* Species breakdown bars */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-teal-400">Species Contribution</h4>
                  {[
                    { species: 'Jayanti Rohu (Improved)', yield: 6200, pct: 44, color: 'from-teal-500 to-sky-400', badge: 'bg-teal-500/10 text-teal-400' },
                    { species: 'Standard Rohu', yield: 3800, pct: 27, color: 'from-sky-500 to-indigo-400', badge: 'bg-sky-500/10 text-sky-400' },
                    { species: 'Amrita Katla', yield: 2400, pct: 17, color: 'from-indigo-500 to-purple-400', badge: 'bg-indigo-500/10 text-indigo-400' },
                    { species: 'Standard Katla', yield: 1100, pct: 8, color: 'from-purple-500 to-fuchsia-400', badge: 'bg-purple-500/10 text-purple-400' },
                    { species: 'Other (Silver Carp, etc.)', yield: 600, pct: 4, color: 'from-slate-500 to-slate-400', badge: 'bg-slate-500/10 text-slate-400' },
                  ].map((row) => (
                    <div key={row.species} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${row.badge}`}>{row.pct}%</span>
                          <span className="text-ink-primary font-semibold">{row.species}</span>
                        </div>
                        <span className="font-mono font-bold text-teal-400">{row.yield.toLocaleString()} T</span>
                      </div>
                      <div className="w-full bg-glass-strong h-2 rounded-full overflow-hidden">
                        <div className={`h-full bg-gradient-to-r ${row.color} rounded-full transition-all`} style={{ width: `${row.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* District-wise breakdown table */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                    <BarChart2 className="h-3 w-3" />
                    District-wise Yield vs Previous Year
                  </h4>
                  <div className="rounded-xl border border-glass-border overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-[10px] uppercase tracking-wider text-ink-muted border-b border-glass-border bg-canvas-950/60">
                          <th className="text-left p-3 font-bold">District</th>
                          <th className="text-right p-3 font-bold">FY 24-25</th>
                          <th className="text-right p-3 font-bold">FY 23-24</th>
                          <th className="text-right p-3 font-bold">Change</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { district: 'Madhubani', fy25: 4250, fy24: 3740, change: +13.6 },
                          { district: 'Patna', fy25: 3890, fy24: 3520, change: +10.5 },
                          { district: 'Darbhanga', fy25: 3120, fy24: 2800, change: +11.4 },
                          { district: 'Gaya', fy25: 2840, fy24: 2640, change: +7.6 },
                          { district: 'Muzaffarpur', fy25: 0, fy24: 0, change: 0, note: 'New enrollment FY25' },
                        ].map((row, i) => (
                          <tr key={i} className="border-b border-glass-border/30 last:border-0 hover:bg-glass/30 transition-colors">
                            <td className="p-3 font-semibold text-ink-primary">{row.district}</td>
                            <td className="p-3 text-right font-mono font-bold text-teal-400">{row.fy25 > 0 ? `${row.fy25.toLocaleString()} T` : row.note ?? '—'}</td>
                            <td className="p-3 text-right font-mono text-ink-secondary">{row.fy24 > 0 ? `${row.fy24.toLocaleString()} T` : '—'}</td>
                            <td className={`p-3 text-right font-mono font-bold ${row.change > 0 ? 'text-teal-400' : row.change < 0 ? 'text-rose-400' : 'text-ink-muted'}`}>
                              {row.change !== 0 ? `${row.change > 0 ? '+' : ''}${row.change}%` : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="text-right text-xs font-bold text-ink-primary border-t border-glass-border pt-3 font-mono">
                  Grand Total: <span className="text-teal-400">14,100 T (FY 2024-25)</span>
                </div>
              </div>
            )}

            {/* Legacy species breakdown (accessible via stat cards) */}
            {activeProductionModal === 'yield' && (
              <div className="space-y-4">
                <div className="text-xs text-ink-muted">Total harvested yield across all farmer-cycles for FY 2024-25, broken down by species cultivated.</div>
                {[
                  { species: 'Jayanti Rohu (Improved)', yield: '6,200 T', pct: 44, color: 'from-teal-500 to-sky-400', badge: 'bg-teal-500/10 text-teal-400' },
                  { species: 'Standard Rohu', yield: '3,800 T', pct: 27, color: 'from-sky-500 to-indigo-400', badge: 'bg-sky-500/10 text-sky-400' },
                  { species: 'Amrita Katla', yield: '2,400 T', pct: 17, color: 'from-indigo-500 to-purple-400', badge: 'bg-indigo-500/10 text-indigo-400' },
                  { species: 'Standard Katla', yield: '1,100 T', pct: 8, color: 'from-purple-500 to-fuchsia-400', badge: 'bg-purple-500/10 text-purple-400' },
                  { species: 'Other (Silver Carp, etc.)', yield: '600 T', pct: 4, color: 'from-slate-500 to-slate-400', badge: 'bg-slate-500/10 text-slate-400' },
                ].map((row) => (
                  <div key={row.species} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${row.badge}`}>{row.pct}%</span>
                        <span className="text-ink-primary font-semibold">{row.species}</span>
                      </div>
                      <span className="font-mono font-bold text-teal-400">{row.yield}</span>
                    </div>
                    <div className="w-full bg-glass-strong h-2 rounded-full overflow-hidden">
                      <div className={`h-full bg-gradient-to-r ${row.color} rounded-full`} style={{ width: `${row.pct}%` }} />
                    </div>
                  </div>
                ))}
                <div className="text-right text-xs font-bold text-ink-primary border-t border-glass-border pt-3 font-mono">
                  Grand Total: <span className="text-teal-400">14,100 T (FY 2024-25)</span>
                </div>
              </div>
            )}

            {/* FCR explanation */}
            {activeProductionModal === 'fcr' && (
              <div className="space-y-4">
                <div className="text-xs text-ink-muted">Feed Conversion Ratio (FCR) = Total Feed Given (kg) ÷ Total Fish Weight Gained (kg). Lower FCR = better feed efficiency = lower production cost.</div>
                <div className="p-4 rounded-xl border border-sky-500/20 bg-sky-500/5 space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm font-bold text-ink-primary">Fleet Average FCR</span>
                    <span className="text-3xl font-mono font-bold text-sky-400">1.49</span>
                  </div>
                  <div className="text-xs text-ink-muted">Meaning: 1.49 kg of feed is used to produce 1 kg of fish. Industry target is 1.4–1.6 for IMC species.</div>
                </div>
                {[
                  { pond: 'Pond B - Growout (Jayanti Rohu)', farmer: 'Sanjay Kumar Yadav', fcr: 1.42, rating: '⭐ Excellent', color: 'text-teal-400' },
                  { pond: 'Main Growout (Amrita Katla)', farmer: 'Vikram Sen Verma', fcr: 1.58, rating: 'Good', color: 'text-sky-400' },
                  { pond: 'Chaur Plot 4 (Jayanti Rohu)', farmer: 'Rajendra Kumar Mahto', fcr: 1.45, rating: '⭐ Excellent', color: 'text-teal-400' },
                  { pond: 'Nursery Pond 2 (Std Katla)', farmer: 'Amit Kumar Chaudhary', fcr: 1.62, rating: 'Acceptable', color: 'text-amber-400' },
                ].map((row, i) => (
                  <div key={i} className="p-3 rounded-lg border border-glass-border bg-canvas-950/40 flex justify-between items-center text-xs">
                    <div>
                      <div className="font-semibold text-ink-primary">{row.pond}</div>
                      <div className="text-ink-muted">{row.farmer}</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-mono font-bold ${row.color}`}>{row.fcr}</div>
                      <div className={`text-[10px] ${row.color}`}>{row.rating}</div>
                    </div>
                  </div>
                ))}
                <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 text-xs text-ink-secondary">
                  💡 <strong className="text-amber-400">Improving FCR:</strong> Use high-quality floating pellet feed (2.5–3mm), feed 2–3 times daily in small portions, and maintain DO above 5 mg/L for better feed assimilation.
                </div>
              </div>
            )}

            {/* Survival rate breakdown */}
            {activeProductionModal === 'survival' && (
              <div className="space-y-4">
                <div className="text-xs text-ink-muted">Survival Rate = (Fish Count at Harvest ÷ Fish Count at Stocking) × 100. Higher survival rates reduce cost-per-kg significantly.</div>
                {HARVEST_LOGS.map((log) => {
                  const ratingColor = log.survivalPct >= 82 ? 'text-teal-400' : log.survivalPct >= 75 ? 'text-sky-400' : 'text-amber-400';
                  const barColor = log.survivalPct >= 82 ? 'from-teal-500 to-sky-400' : log.survivalPct >= 75 ? 'from-sky-500 to-indigo-400' : 'from-amber-500 to-orange-400';
                  return (
                    <div key={log.id} className="p-3 rounded-xl border border-glass-border bg-canvas-950/40 space-y-2">
                      <div className="flex justify-between items-start text-xs">
                        <div>
                          <div className="font-semibold text-ink-primary">{log.pondName}</div>
                          <div className="text-ink-muted">{log.farmerName} · {log.species}</div>
                        </div>
                        <span className={`text-xl font-mono font-bold ${ratingColor}`}>{log.survivalPct}%</span>
                      </div>
                      <div className="w-full bg-glass-strong h-1.5 rounded-full overflow-hidden">
                        <div className={`h-full bg-gradient-to-r ${barColor} rounded-full`} style={{ width: `${log.survivalPct}%` }} />
                      </div>
                      <div className="flex justify-between text-[10px] text-ink-muted font-mono">
                        <span>Duration: {log.durationMonths} months</span>
                        <span>Yield: {log.totalYieldKg.toLocaleString()} kg</span>
                      </div>
                    </div>
                  );
                })}
                <div className="p-3 rounded-lg border border-teal-500/20 bg-teal-500/5 text-xs text-ink-secondary">
                  💡 <strong className="text-teal-400">Improving Survival:</strong> Procure certified seed from registered hatcheries. Maintain DO above 4 mg/L. Use prophylactic lime treatment. Monitor for EUS/fungal disease signs weekly.
                </div>
              </div>
            )}

            {/* Jayanti Rohu advantage */}
            {activeProductionModal === 'jayanti' && (
              <div className="space-y-4">
                <div className="text-xs text-ink-muted">
                  Jayanti Rohu is a selectively bred strain of <em>Labeo rohita</em> developed by CIFA (Central Institute of Freshwater Aquaculture), Bhubaneswar, through 6 generations of genetic selection.
                </div>
                <div className="grid grid-cols-3 gap-3 text-center text-xs">
                  <div className="p-3 rounded-lg border border-teal-500/20 bg-teal-500/5">
                    <div className="text-[10px] text-ink-muted uppercase">Yield Advantage</div>
                    <div className="text-2xl font-mono font-bold text-teal-400 mt-1">+18%</div>
                    <div className="text-[10px] text-ink-muted">vs Standard Rohu</div>
                  </div>
                  <div className="p-3 rounded-lg border border-sky-500/20 bg-sky-500/5">
                    <div className="text-[10px] text-ink-muted uppercase">FCR Improvement</div>
                    <div className="text-2xl font-mono font-bold text-sky-400 mt-1">−0.08</div>
                    <div className="text-[10px] text-ink-muted">Lower = better</div>
                  </div>
                  <div className="p-3 rounded-lg border border-purple-500/20 bg-purple-500/5">
                    <div className="text-[10px] text-ink-muted uppercase">Growth Speed</div>
                    <div className="text-2xl font-mono font-bold text-purple-400 mt-1">+46%</div>
                    <div className="text-[10px] text-ink-muted">faster at Month 3</div>
                  </div>
                </div>
                <div className="space-y-2.5">
                  {[
                    { trait: 'Growth Rate', jayanti: '950 g in 6 months', standard: '650 g in 6 months', winner: true },
                    { trait: 'Feed Efficiency (FCR)', jayanti: '1.40–1.45', standard: '1.48–1.55', winner: true },
                    { trait: 'Disease Tolerance', jayanti: 'Higher (selective breeding)', standard: 'Standard', winner: true },
                    { trait: 'Survival Rate', jayanti: '82–86%', standard: '72–78%', winner: true },
                    { trait: 'Seed Availability', jayanti: 'From registered CIFA hatcheries', standard: 'Widely available', winner: false },
                    { trait: 'Seed Cost', jayanti: '₹2.50–3.00 per fry', standard: '₹1.00–1.50 per fry', winner: false },
                  ].map((row, i) => (
                    <div key={i} className="flex items-center gap-3 text-xs p-2.5 rounded-lg border border-glass-border bg-canvas-950/30">
                      <div className="w-32 text-ink-muted shrink-0">{row.trait}</div>
                      <div className={`flex-1 font-semibold ${row.winner ? 'text-teal-400' : 'text-amber-400'}`}>{row.jayanti}</div>
                      <div className="flex-1 text-ink-secondary">{row.standard}</div>
                    </div>
                  ))}
                </div>
                <div className="p-3 rounded-lg border border-teal-500/20 bg-teal-500/5 text-xs text-ink-secondary">
                  💡 <strong className="text-teal-400">Recommendation:</strong> Encourage all IMC grow-out farmers to switch to Jayanti Rohu from CIFA-certified hatcheries under the MPVY scheme (60% subsidy on seed cost).
                </div>
              </div>
            )}
          </GlassCard>
        </div>
      )}
    </div>
  );
}

// Subcomponents
function CostRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between text-[11px] text-ink-secondary">
      <span>{label}</span>
      <span>₹{value.toLocaleString()}</span>
    </div>
  );
}

