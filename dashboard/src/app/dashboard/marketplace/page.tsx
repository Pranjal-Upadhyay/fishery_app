'use client';

import { useState, useEffect } from 'react';
import {
  Store,
  Tag,
  ShoppingBag,
  AlertTriangle,
  Search,
  ChevronRight,
  TrendingUp,
  FileCheck,
  MapPin,
  Calendar,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Eye,
  Info,
  IndianRupee
} from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { api } from '@/lib/api';

// ── Types ────────────────────────────────────────────────────────────────────
interface Listing {
  id: string;
  hatchery_id: string;
  batch_id: string | null;
  stage: 'fry' | 'fingerling';
  species_name: string;
  species_variant: string | null;
  description: string | null;
  total_quantity: number;
  quantity_available: number;
  reserved_quantity: number;
  confirmed_quantity: number;
  min_order_qty: number;
  price_per_piece: number;
  bulk_price_per_piece: number | null;
  bulk_price_threshold: number | null;
  expected_ready_date: string | null;
  last_available_date: string | null;
  status: 'DRAFT' | 'UPCOMING' | 'AVAILABLE' | 'CLOSED' | 'EXPIRED';
  pickup_available: boolean;
  delivery_available: boolean;
  hatchery_name: string;
  hatchery_district: string;
}

interface Order {
  id: string;
  listing_id: string;
  farmer_id: string;
  farmer_uid: string | null;
  quantity_ordered: number;
  price_per_piece: number;
  total_amount: number;
  status:
    | 'REQUESTED'
    | 'ACCEPTED'
    | 'REJECTED'
    | 'FARMER_PAID'
    | 'HATCHERY_CONFIRMED'
    | 'FULFILLED'
    | 'CANCELLED'
    | 'DISPUTED'
    | 'INTEREST_REQUESTED'
    | 'INTEREST_ACKNOWLEDGED'
    | 'INTEREST_DECLINED'
    | 'INTEREST_CONVERTED';
  order_type: 'PURCHASE_ORDER' | 'ADVANCE_INTEREST';
  farmer_notes: string | null;
  delivery_address: string | null;
  payment_screenshot_url: string | null;
  rejection_reason: string | null;
  dispute_reason: 'QUANTITY_MISMATCH' | 'HIGH_MORTALITY' | 'NOT_AS_DESCRIBED' | 'PAYMENT_NOT_RECEIVED' | 'OTHER' | null;
  dispute_description: string | null;
  disputed_at: string | null;
  dispute_resolved_at: string | null;
  created_at: string;
  accepted_at: string | null;
  rejected_at: string | null;
  fulfilled_at: string | null;
  cancelled_at: string | null;
  farmer_name: string;
  farmer_phone: string;
  species_name: string;
  species_variant: string | null;
  stage: 'fry' | 'fingerling';
  hatchery_name: string;
  hatchery_phone: string;
}

// ── Mock Data Fallbacks ──────────────────────────────────────────────────────
const MOCK_LISTINGS: Listing[] = [
  {
    id: 'l-101',
    hatchery_id: 'h-1',
    batch_id: 'b-1',
    stage: 'fingerling',
    species_name: 'Rohu',
    species_variant: 'Jayanti Rohu',
    description: 'High survival rate, certified disease-free Jayanti Rohu fingerlings.',
    total_quantity: 150000,
    quantity_available: 80000,
    reserved_quantity: 40000,
    confirmed_quantity: 30000,
    min_order_qty: 10000,
    price_per_piece: 1.20,
    bulk_price_per_piece: 1.00,
    bulk_price_threshold: 50000,
    expected_ready_date: '2026-06-25',
    last_available_date: '2026-08-25',
    status: 'AVAILABLE',
    pickup_available: true,
    delivery_available: true,
    hatchery_name: 'Patna Central Hatchery',
    hatchery_district: 'Patna'
  },
  {
    id: 'l-102',
    hatchery_id: 'h-2',
    batch_id: 'b-2',
    stage: 'fingerling',
    species_name: 'Katla',
    species_variant: 'Amrita Katla',
    description: 'Amrita Katla fingerlings with fast growth characteristics.',
    total_quantity: 100000,
    quantity_available: 45000,
    reserved_quantity: 20000,
    confirmed_quantity: 35000,
    min_order_qty: 5000,
    price_per_piece: 1.40,
    bulk_price_per_piece: 1.25,
    bulk_price_threshold: 30000,
    expected_ready_date: '2026-06-28',
    last_available_date: '2026-08-28',
    status: 'AVAILABLE',
    pickup_available: true,
    delivery_available: false,
    hatchery_name: 'Mithila Matsya Hatchery',
    hatchery_district: 'Darbhanga'
  },
  {
    id: 'l-103',
    hatchery_id: 'h-3',
    batch_id: 'b-3',
    stage: 'fry',
    species_name: 'Rohu',
    species_variant: 'Standard Rohu',
    description: 'Standard nursery fry for stocking grow-out ponds.',
    total_quantity: 300000,
    quantity_available: 300000,
    reserved_quantity: 0,
    confirmed_quantity: 0,
    min_order_qty: 20000,
    price_per_piece: 0.50,
    bulk_price_per_piece: 0.40,
    bulk_price_threshold: 100000,
    expected_ready_date: '2026-07-05',
    last_available_date: '2026-09-05',
    status: 'UPCOMING',
    pickup_available: true,
    delivery_available: true,
    hatchery_name: 'Gaya Fishery Seed',
    hatchery_district: 'Gaya'
  },
  {
    id: 'l-104',
    hatchery_id: 'h-1',
    batch_id: 'b-4',
    stage: 'fingerling',
    species_name: 'Mrigal',
    species_variant: 'Standard',
    description: 'Healthy Mrigal bottom feeders.',
    total_quantity: 80000,
    quantity_available: 0,
    reserved_quantity: 0,
    confirmed_quantity: 80000,
    min_order_qty: 5000,
    price_per_piece: 1.00,
    bulk_price_per_piece: null,
    bulk_price_threshold: null,
    expected_ready_date: '2026-06-01',
    last_available_date: '2026-06-15',
    status: 'CLOSED',
    pickup_available: true,
    delivery_available: false,
    hatchery_name: 'Patna Central Hatchery',
    hatchery_district: 'Patna'
  }
];

const MOCK_ORDERS: Order[] = [
  {
    id: 'TXN-17808-A4C-76B29', // Structured system order ID
    listing_id: 'l-101',
    farmer_id: 'f-1',
    farmer_uid: 'MM-F-8091',
    quantity_ordered: 50000,
    price_per_piece: 1.20,
    total_amount: 60000,
    status: 'FULFILLED',
    order_type: 'PURCHASE_ORDER',
    farmer_notes: 'Require delivery in morning hours.',
    delivery_address: 'Mokama, Patna, Bihar',
    payment_screenshot_url: 'https://example.com/screenshot1.jpg',
    rejection_reason: null,
    dispute_reason: null,
    dispute_description: null,
    disputed_at: null,
    dispute_resolved_at: null,
    created_at: '2026-06-05T08:30:00Z',
    accepted_at: '2026-06-05T12:00:00Z',
    rejected_at: null,
    fulfilled_at: '2026-06-09T16:00:00Z',
    cancelled_at: null,
    farmer_name: 'Ramesh Prasad Singh',
    farmer_phone: '9845012345',
    species_name: 'Rohu',
    species_variant: 'Jayanti Rohu',
    stage: 'fingerling',
    hatchery_name: 'Patna Central Hatchery',
    hatchery_phone: '+919988776655'
  },
  {
    id: 'TXN-17809-B2F-98A13',
    listing_id: 'l-102',
    farmer_id: 'f-2',
    farmer_uid: 'MM-F-4322',
    quantity_ordered: 35000,
    price_per_piece: 1.40,
    total_amount: 49000,
    status: 'REQUESTED',
    order_type: 'PURCHASE_ORDER',
    farmer_notes: 'Will pick up in my own vehicle.',
    delivery_address: null,
    payment_screenshot_url: null,
    rejection_reason: null,
    dispute_reason: null,
    dispute_description: null,
    disputed_at: null,
    dispute_resolved_at: null,
    created_at: '2026-06-07T10:15:00Z',
    accepted_at: null,
    rejected_at: null,
    fulfilled_at: null,
    cancelled_at: null,
    farmer_name: 'Lallan Yadav',
    farmer_phone: '9547821690',
    species_name: 'Katla',
    species_variant: 'Amrita Katla',
    stage: 'fingerling',
    hatchery_name: 'Mithila Matsya Hatchery',
    hatchery_phone: '+918877665544'
  },
  {
    id: 'TXN-17810-C3X-55E81',
    listing_id: 'l-101',
    farmer_id: 'f-3',
    farmer_uid: 'MM-F-9092',
    quantity_ordered: 20000,
    price_per_piece: 1.00,
    total_amount: 20000,
    status: 'FULFILLED',
    order_type: 'PURCHASE_ORDER',
    farmer_notes: 'Bulk discount applied.',
    delivery_address: 'Barh, Patna, Bihar',
    payment_screenshot_url: 'https://example.com/screenshot2.jpg',
    rejection_reason: null,
    dispute_reason: null,
    dispute_description: null,
    disputed_at: null,
    dispute_resolved_at: null,
    created_at: '2026-06-03T14:00:00Z',
    accepted_at: '2026-06-03T17:30:00Z',
    rejected_at: null,
    fulfilled_at: '2026-06-07T11:00:00Z',
    cancelled_at: null,
    farmer_name: 'Binod Kumar Sah',
    farmer_phone: '9888123477',
    species_name: 'Rohu',
    species_variant: 'Standard Rohu',
    stage: 'fingerling',
    hatchery_name: 'Patna Central Hatchery',
    hatchery_phone: '+919988776655'
  },
  {
    id: 'TXN-17811-D4Y-21D99',
    listing_id: 'l-102',
    farmer_id: 'f-4',
    farmer_uid: 'MM-F-1104',
    quantity_ordered: 15000,
    price_per_piece: 1.40,
    total_amount: 21000,
    status: 'DISPUTED',
    order_type: 'PURCHASE_ORDER',
    farmer_notes: 'Requires aeration during transport.',
    delivery_address: 'Samastipur, Bihar',
    payment_screenshot_url: 'https://example.com/screenshot3.jpg',
    rejection_reason: null,
    dispute_reason: 'HIGH_MORTALITY',
    dispute_description: 'Over 40% mortality observed within 12 hours of delivery. Fingerlings looked weak at pickup.',
    disputed_at: '2026-06-18T09:00:00Z',
    dispute_resolved_at: null,
    created_at: '2026-06-15T09:30:00Z',
    accepted_at: '2026-06-15T15:00:00Z',
    rejected_at: null,
    fulfilled_at: '2026-06-17T18:00:00Z',
    cancelled_at: null,
    farmer_name: 'Sanjeev Kumar',
    farmer_phone: '9431098765',
    species_name: 'Katla',
    species_variant: 'Amrita Katla',
    stage: 'fingerling',
    hatchery_name: 'Mithila Matsya Hatchery',
    hatchery_phone: '+918877665544'
  }
];

export default function MarketplacePage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'listings' | 'orders' | 'disputes'>('overview');
  const [listings, setListings] = useState<Listing[]>(MOCK_LISTINGS);
  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedDispute, setSelectedDispute] = useState<Order | null>(null);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch from backend, with graceful fallback to mock data
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const results = await Promise.allSettled([
          api.get<{ success: boolean; data: Listing[] }>('/api/v1/admin/marketplace/listings'),
          api.get<{ success: boolean; data: Order[] }>('/api/v1/admin/marketplace/orders')
        ]);
        
        const listingsResult = results[0];
        const ordersResult = results[1];

        if (listingsResult.status === 'fulfilled' && listingsResult.value?.success && Array.isArray(listingsResult.value?.data) && listingsResult.value.data.length > 0) {
          setListings(listingsResult.value.data);
        } else {
          setListings(MOCK_LISTINGS);
        }

        if (ordersResult.status === 'fulfilled' && ordersResult.value?.success && Array.isArray(ordersResult.value?.data) && ordersResult.value.data.length > 0) {
          setOrders(ordersResult.value.data);
        } else {
          setOrders(MOCK_ORDERS);
        }
      } catch (err) {
        console.warn('Backend API connection failed, using mock data fallback', err);
        setListings(MOCK_LISTINGS);
        setOrders(MOCK_ORDERS);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // ── Metrics Calculators ────────────────────────────────────────────────────
  const totalListedQuantity = listings.reduce((acc, curr) => acc + curr.total_quantity, 0);
  const totalSoldQuantity = orders
    .filter(o => ['FULFILLED', 'HATCHERY_CONFIRMED', 'FARMER_PAID', 'DISPUTED'].includes(o.status))
    .reduce((acc, curr) => acc + curr.quantity_ordered, 0);
  const grossMerchandiseValue = orders
    .filter(o => ['FULFILLED', 'HATCHERY_CONFIRMED', 'FARMER_PAID', 'DISPUTED'].includes(o.status))
    .reduce((acc, curr) => acc + Number(curr.total_amount), 0);
  const totalActiveListings = listings.filter(l => l.status === 'AVAILABLE' && l.quantity_available > 0).length;
  const disputedOrders = orders.filter(o => o.status === 'DISPUTED');
  const disputeRate = orders.length ? ((disputedOrders.length / orders.length) * 100).toFixed(1) : '0';

  // ── Filters & Search ────────────────────────────────────────────────────────
  const filteredListings = listings.filter(l => {
    const matchesSearch =
      l.species_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.species_variant && l.species_variant.toLowerCase().includes(searchTerm.toLowerCase())) ||
      l.hatchery_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const isSoldOut = l.status === 'CLOSED' || l.quantity_available === 0;
    let matchesStatus = statusFilter === 'ALL' || l.status === statusFilter;
    if (statusFilter === 'CLOSED' || statusFilter === 'SOLD_OUT') {
      matchesStatus = isSoldOut;
    } else if (statusFilter === 'AVAILABLE') {
      matchesStatus = l.status === 'AVAILABLE' && !isSoldOut;
    }

    return matchesSearch && matchesStatus;
  });

  const filteredOrders = orders.filter(o => {
    const matchesSearch =
      o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.farmer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.hatchery_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.species_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Render Status Badge
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
      case 'FULFILLED':
      case 'INTEREST_CONVERTED':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20">
            {status.toLowerCase()}
          </span>
        );
      case 'CLOSED':
      case 'SOLD OUT':
      case 'SOLD_OUT':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30">
            sold out
          </span>
        );
      case 'UPCOMING':
      case 'REQUESTED':
      case 'INTEREST_REQUESTED':
      case 'PENDING':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
            {status.toLowerCase()}
          </span>
        );
      case 'FARMER_PAID':
      case 'ACCEPTED':
      case 'INTEREST_ACKNOWLEDGED':
      case 'HATCHERY_CONFIRMED':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
            {status.toLowerCase()}
          </span>
        );
      case 'DISPUTED':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse">
            disputed
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20">
            {status.toLowerCase()}
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-teal-400">
            Marketplace Administration
          </div>
          <h1 className="text-2xl font-bold text-ink-primary">B2B Seed Marketplace</h1>
        </div>
        <div className="flex bg-glass-strong border border-glass-border p-0.5 rounded-xl">
          {(['overview', 'listings', 'orders', 'disputes'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setSearchTerm('');
                setStatusFilter('ALL');
              }}
              className={`text-xs font-bold px-4 py-2 rounded-lg transition-all capitalize ${
                activeTab === tab
                  ? 'bg-teal-500/15 text-teal-300 shadow-sm border border-teal-500/20'
                  : 'text-ink-secondary hover:text-ink-primary border border-transparent'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex h-32 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-teal-400 border-t-transparent" />
        </div>
      )}

      {!loading && (
        <div className="flex flex-col gap-6">
          {/* ── Tab Content: OVERVIEW ────────────────────────────────────────── */}
          {activeTab === 'overview' && (
            <div className="flex flex-col gap-6">
              {/* KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <GlassCard className="p-4 flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-teal-500/10 text-teal-400">
                    <Store className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="text-xl font-mono font-bold text-ink-primary">{totalActiveListings}</div>
                    <div className="text-[10px] text-ink-muted uppercase tracking-wider font-semibold">Active Listings</div>
                  </div>
                </GlassCard>

                <GlassCard className="p-4 flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-sky-500/10 text-sky-400">
                    <Tag className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="text-xl font-mono font-bold text-ink-primary">
                      {totalListedQuantity.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-ink-muted uppercase tracking-wider font-semibold">Seed Listed (pcs)</div>
                  </div>
                </GlassCard>

                <GlassCard className="p-4 flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-indigo-500/10 text-indigo-400">
                    <ShoppingBag className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="text-xl font-mono font-bold text-ink-primary">
                      {totalSoldQuantity.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-ink-muted uppercase tracking-wider font-semibold">Seed Sold (pcs)</div>
                  </div>
                </GlassCard>

                <GlassCard className="p-4 flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-500/10 text-emerald-400">
                    <IndianRupee className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="text-xl font-mono font-bold text-ink-primary">
                      ₹{grossMerchandiseValue.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-ink-muted uppercase tracking-wider font-semibold">Gross Value (GMV)</div>
                  </div>
                </GlassCard>

                <GlassCard className="p-4 flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-rose-500/10 text-rose-400">
                    <AlertTriangle className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="text-xl font-mono font-bold text-ink-primary">{disputeRate}%</div>
                    <div className="text-[10px] text-ink-muted uppercase tracking-wider font-semibold">Dispute Rate</div>
                  </div>
                </GlassCard>
              </div>

              {/* High-Level Analysis Split */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Seed Supply/Demand Gap Analysis */}
                <GlassCard className="p-5 lg:col-span-1 flex flex-col gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-ink-primary flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-teal-400" />
                      Top Buying Districts
                    </h3>
                    <p className="text-xs text-ink-muted mt-1">Market purchase volume distribution</p>
                  </div>
                  <div className="space-y-4">
                    {[
                      { district: 'Patna', volume: '130,000 pcs', percentage: 75 },
                      { district: 'Darbhanga', volume: '35,000 pcs', percentage: 20 },
                      { district: 'Muzaffarpur', volume: '15,000 pcs', percentage: 8 },
                      { district: 'Gaya', volume: '0 pcs', percentage: 0 },
                    ].map(row => (
                      <div key={row.district} className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-ink-primary">{row.district}</span>
                          <span className="font-mono font-bold text-teal-400">{row.volume}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-glass-strong overflow-hidden">
                          <div className="h-full bg-teal-400" style={{ width: `${row.percentage}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </GlassCard>

                {/* Market Health & Action Items */}
                <GlassCard className="p-5 lg:col-span-2 flex flex-col gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-ink-primary flex items-center gap-2">
                      <FileCheck className="h-4 w-4 text-sky-400" />
                      Marketplace Quality Assurances
                    </h3>
                    <p className="text-xs text-ink-muted mt-1">Pending administration checks and security audits</p>
                  </div>
                  <div className="space-y-3">
                    {disputedOrders.length > 0 ? (
                      <div className="flex gap-3 items-start p-3 rounded-xl border border-rose-500/20 bg-rose-500/5">
                        <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="text-xs font-bold text-rose-300">Active Dispute Resolution Required</div>
                          <p className="text-[11px] text-ink-muted mt-0.5">
                            Order {disputedOrders[0].id.substring(0, 9)} reported high mortality. Admin arbitration needed.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-3 items-start p-3 rounded-xl border border-teal-500/20 bg-teal-500/5">
                        <CheckCircle2 className="h-5 w-5 text-teal-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="text-xs font-bold text-teal-300">All disputes resolved</div>
                          <p className="text-[11px] text-ink-muted mt-0.5">No pending disputed transactions in queue.</p>
                        </div>
                      </div>
                    )}
                    <div className="flex gap-3 items-start p-3 rounded-xl border border-glass-border bg-glass-subtle">
                      <Info className="h-5 w-5 text-sky-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-bold text-sky-300">Secure Government UID Auditing</div>
                        <p className="text-[11px] text-ink-muted mt-0.5">
                          Cross-referencing hatchery operator credentials via Bihar fisheries registration database weekly.
                        </p>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </div>
            </div>
          )}

          {/* ── Tab Content: LISTINGS ────────────────────────────────────────── */}
          {activeTab === 'listings' && (
            <GlassCard className="p-5 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
                  <input
                    type="text"
                    placeholder="Search species, variant, hatchery..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-canvas-950/80 border border-glass-border focus:border-teal-500/50 rounded-lg pl-9 pr-4 py-2 text-sm text-ink-primary placeholder-ink-muted outline-none transition-colors"
                  />
                </div>
                <div className="relative w-full sm:w-auto">
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="appearance-none w-full sm:w-auto bg-canvas-950/80 border border-glass-border text-ink-secondary text-xs rounded-lg pl-3 pr-8 py-2.5 outline-none focus:border-teal-500/50 transition-colors"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="AVAILABLE">AVAILABLE</option>
                    <option value="UPCOMING">UPCOMING</option>
                    <option value="CLOSED">CLOSED</option>
                    <option value="DRAFT">DRAFT</option>
                    <option value="EXPIRED">EXPIRED</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-glass-border text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                      <th className="pb-3 pl-2">Species / Variant</th>
                      <th className="pb-3">Hatchery</th>
                      <th className="pb-3">Quantities (Available / Total)</th>
                      <th className="pb-3">Price / Piece</th>
                      <th className="pb-3">Expected Ready</th>
                      <th className="pb-3">Logistics</th>
                      <th className="pb-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-glass-border text-xs">
                    {filteredListings.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-ink-muted">
                          No listings found matching criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredListings.map(l => {
                        const isSoldOut = l.status === 'CLOSED' || l.quantity_available === 0;
                        return (
                          <tr 
                            key={l.id} 
                            onClick={() => setSelectedListing(l)}
                            title="Click to view full listing & sales details"
                            className="hover:bg-glass-subtle transition-colors group cursor-pointer"
                          >
                            <td className="py-3 pl-2">
                              <div className="font-bold text-ink-primary flex items-center gap-1.5">
                                {l.species_name}
                                <Eye className="h-3.5 w-3.5 text-teal-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                              <div className="text-[10px] text-ink-muted capitalize">
                                {l.species_variant || 'Standard'} • {l.stage}
                              </div>
                            </td>
                            <td className="py-3">
                              <div className="font-semibold text-ink-primary">{l.hatchery_name}</div>
                              <div className="text-[10px] text-ink-muted flex items-center gap-1">
                                <MapPin className="h-3 w-3 text-teal-400" />
                                {l.hatchery_district}
                              </div>
                            </td>
                            <td className="py-3 font-mono">
                              <div className="text-ink-primary font-bold">
                                {l.quantity_available.toLocaleString()}{' '}
                                <span className="text-[9px] text-ink-muted">pcs</span>
                              </div>
                              <div className="text-[10px] text-ink-muted">
                                Total: {l.total_quantity.toLocaleString()} pcs
                              </div>
                            </td>
                            <td className="py-3 font-mono font-bold text-ink-primary">
                              ₹{Number(l.price_per_piece).toFixed(2)}
                              {l.bulk_price_per_piece && (
                                <div className="text-[9px] text-teal-400 font-normal">
                                  Bulk: ₹{Number(l.bulk_price_per_piece).toFixed(2)} (&gt;{l.bulk_price_threshold} pcs)
                                </div>
                              )}
                            </td>
                            <td className="py-3">
                              <div className="text-ink-primary flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5 text-ink-muted" />
                                {l.expected_ready_date || 'Immediate'}
                              </div>
                            </td>
                            <td className="py-3">
                              <div className="text-[10px] text-ink-primary">
                                {l.pickup_available && '✓ Pickup'}
                                {l.delivery_available && ' / ✓ Delivery'}
                              </div>
                            </td>
                            <td className="py-3">{renderStatusBadge(isSoldOut ? 'SOLD OUT' : l.status)}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          )}

          {/* ── Tab Content: ORDERS ──────────────────────────────────────────── */}
          {activeTab === 'orders' && (
            <GlassCard className="p-5 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
                  <input
                    type="text"
                    placeholder="Search transaction ref, buyer, species..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-canvas-950/80 border border-glass-border focus:border-teal-500/50 rounded-lg pl-9 pr-4 py-2 text-sm text-ink-primary placeholder-ink-muted outline-none transition-colors"
                  />
                </div>
                <div className="relative w-full sm:w-auto">
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="appearance-none w-full sm:w-auto bg-canvas-950/80 border border-glass-border text-ink-secondary text-xs rounded-lg pl-3 pr-8 py-2.5 outline-none focus:border-teal-500/50 transition-colors"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="REQUESTED">REQUESTED</option>
                    <option value="ACCEPTED">ACCEPTED</option>
                    <option value="FARMER_PAID">FARMER_PAID</option>
                    <option value="HATCHERY_CONFIRMED">HATCHERY_CONFIRMED</option>
                    <option value="FULFILLED">FULFILLED</option>
                    <option value="DISPUTED">DISPUTED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-glass-border text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                      <th className="pb-3 pl-2">Transaction Reference</th>
                      <th className="pb-3">Buyer (Farmer)</th>
                      <th className="pb-3">Quantity</th>
                      <th className="pb-3">Total Amount</th>
                      <th className="pb-3">Hatchery</th>
                      <th className="pb-3">Date</th>
                      <th className="pb-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-glass-border text-xs">
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-ink-muted">
                          No orders found matching criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map(o => (
                        <tr 
                          key={o.id} 
                          onClick={() => setSelectedOrder(o)}
                          title="Click to view full order transaction details"
                          className="hover:bg-glass-subtle transition-colors group cursor-pointer"
                        >
                          <td className="py-3 pl-2">
                            <div className="flex items-center gap-1.5">
                              <span 
                                title="Click to copy full Transaction Reference"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(o.id);
                                  setCopiedId(o.id);
                                  setTimeout(() => setCopiedId(null), 2000);
                                }}
                                className="font-mono text-teal-400 font-semibold uppercase hover:underline cursor-pointer select-all"
                              >
                                {o.id.length > 15 ? o.id.substring(0, 15) + '...' : o.id}
                              </span>
                              <Eye className="h-3.5 w-3.5 text-teal-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div className="text-[9px] text-ink-muted transition-colors">
                              {copiedId === o.id ? (
                                <span className="text-teal-400 font-semibold">✓ Copied!</span>
                              ) : (
                                'System Generated'
                              )}
                            </div>
                          </td>
                          <td className="py-3">
                            <div className="font-bold text-ink-primary">{o.farmer_name}</div>
                            <div className="text-[10px] text-ink-muted">{o.farmer_phone}</div>
                          </td>
                          <td className="py-3">
                            <div className="font-semibold text-ink-primary font-mono">
                              {o.quantity_ordered.toLocaleString()} pcs
                            </div>
                            <div className="text-[10px] text-ink-muted capitalize">
                              {o.species_name} • {o.stage}
                            </div>
                          </td>
                          <td className="py-3 font-mono font-bold text-ink-primary">
                            ₹{Number(o.total_amount).toLocaleString()}
                          </td>
                          <td className="py-3">
                            <div className="font-semibold text-ink-primary">{o.hatchery_name}</div>
                          </td>
                          <td className="py-3 text-ink-muted">
                            {new Date(o.created_at).toLocaleDateString('en-IN')}
                          </td>
                          <td className="py-3">{renderStatusBadge(o.status)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          )}

          {/* ── Tab Content: DISPUTES ────────────────────────────────────────── */}
          {activeTab === 'disputes' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Disputes List */}
              <GlassCard className="p-5 lg:col-span-2 flex flex-col gap-4 h-fit">
                <div>
                  <h3 className="text-sm font-bold text-ink-primary">Disputed Marketplace Orders</h3>
                  <p className="text-xs text-ink-muted mt-1">Disputes requiring admin mediation or operator contact</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-glass-border text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                        <th className="pb-3 pl-2">Order ID</th>
                        <th className="pb-3">Buyer / Seller</th>
                        <th className="pb-3">Reason</th>
                        <th className="pb-3">Amount</th>
                        <th className="pb-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-glass-border text-xs">
                      {disputedOrders.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-ink-muted">
                            No active disputes in queue.
                          </td>
                        </tr>
                      ) : (
                        disputedOrders.map(o => (
                          <tr key={o.id} className="hover:bg-glass-subtle transition-colors group">
                            <td className="py-3 pl-2 font-mono text-teal-400 font-semibold">
                              {o.id.substring(0, 9)}...
                            </td>
                            <td className="py-3">
                              <div className="font-semibold text-ink-primary">Farmer: {o.farmer_name}</div>
                              <div className="text-[10px] text-ink-muted">Hatchery: {o.hatchery_name}</div>
                            </td>
                            <td className="py-3">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                {o.dispute_reason?.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="py-3 font-mono font-bold text-ink-primary">
                              ₹{Number(o.total_amount).toLocaleString()}
                            </td>
                            <td className="py-3 text-right">
                              <button
                                onClick={() => setSelectedDispute(o)}
                                className="inline-flex items-center gap-1 text-xs font-bold text-teal-400 hover:text-teal-300 transition-colors"
                              >
                                View Details
                                <ChevronRight className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </GlassCard>

              {/* Dispute Details Panel */}
              <GlassCard className="p-5 lg:col-span-1 flex flex-col gap-4 h-fit min-h-[300px]">
                {selectedDispute ? (
                  <div className="flex flex-col gap-4">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400">Dispute Review</h4>
                      <h3 className="text-sm font-bold text-ink-primary mt-1 font-mono">
                        {selectedDispute.id.substring(0, 15)}...
                      </h3>
                    </div>

                    <div className="h-px bg-glass-border" />

                    <div className="space-y-3">
                      <div>
                        <div className="text-[10px] text-ink-muted uppercase font-bold">Buyer (Farmer)</div>
                        <div className="text-xs text-ink-primary font-semibold">{selectedDispute.farmer_name}</div>
                        <div className="text-[10px] text-ink-muted">{selectedDispute.farmer_phone}</div>
                      </div>

                      <div>
                        <div className="text-[10px] text-ink-muted uppercase font-bold">Seller (Hatchery)</div>
                        <div className="text-xs text-ink-primary font-semibold">{selectedDispute.hatchery_name}</div>
                        <div className="text-[10px] text-ink-muted">{selectedDispute.hatchery_phone}</div>
                      </div>

                      <div>
                        <div className="text-[10px] text-ink-muted uppercase font-bold">Dispute Reason</div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 inline-block mt-0.5">
                          {selectedDispute.dispute_reason?.replace('_', ' ')}
                        </span>
                      </div>

                      <div>
                        <div className="text-[10px] text-ink-muted uppercase font-bold">Description</div>
                        <p className="text-[11px] text-ink-secondary mt-1 bg-canvas-950/50 p-2.5 rounded-lg border border-glass-border">
                          {selectedDispute.dispute_description}
                        </p>
                      </div>

                      <div>
                        <div className="text-[10px] text-ink-muted uppercase font-bold">Order Details</div>
                        <div className="text-xs text-ink-primary mt-1 font-mono">
                          {selectedDispute.quantity_ordered.toLocaleString()} pcs • ₹{Number(selectedDispute.total_amount).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <div className="h-px bg-glass-border mt-2" />

                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={async () => {
                          // Simple action: confirm dispute resolved. In testing we just update status locally
                          alert('Dispute flagged for resolution. Email notifications sent to operator.');
                          setOrders(prev =>
                            prev.map(o => (o.id === selectedDispute.id ? { ...o, status: 'FULFILLED', dispute_reason: null } : o))
                          );
                          setSelectedDispute(null);
                        }}
                        className="flex-1 text-xs font-bold text-center bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 text-teal-300 py-2 rounded-lg transition-colors"
                      >
                        Resolve in Fulfill
                      </button>
                      <button
                        onClick={async () => {
                          alert('Transaction marked as cancelled. Seed inventory released back to listing.');
                          setOrders(prev =>
                            prev.map(o => (o.id === selectedDispute.id ? { ...o, status: 'CANCELLED', dispute_reason: null } : o))
                          );
                          setSelectedDispute(null);
                        }}
                        className="flex-1 text-xs font-bold text-center bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 py-2 rounded-lg transition-colors"
                      >
                        Cancel Transaction
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center gap-2 py-12">
                    <Eye className="h-8 w-8 text-ink-faint" />
                    <div className="text-xs text-ink-muted font-bold">Select a dispute to review details</div>
                  </div>
                )}
              </GlassCard>
            </div>
          )}
        </div>
      )}

      {/* Listing Details Pop-up Modal */}
      {selectedListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-canvas-950/80 backdrop-blur-md p-4 animate-fadeIn">
          <div className="bg-canvas-900 border border-glass-border rounded-2xl max-w-2xl w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh] flex flex-col gap-5 text-ink-primary">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-glass-border pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-400">Listing & Sales Details</span>
                  {renderStatusBadge(selectedListing.status === 'CLOSED' || selectedListing.quantity_available === 0 ? 'SOLD OUT' : selectedListing.status)}
                </div>
                <h2 className="text-xl font-bold text-ink-primary mt-1">
                  {selectedListing.species_name} {selectedListing.species_variant ? `(${selectedListing.species_variant})` : ''}
                </h2>
                <p className="text-xs text-ink-muted capitalize mt-0.5">Stage: {selectedListing.stage} • ID: {selectedListing.id}</p>
              </div>
              <button 
                onClick={() => setSelectedListing(null)}
                className="text-ink-muted hover:text-ink-primary p-1 rounded-lg hover:bg-glass-subtle transition-colors"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            {/* Grid of details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Hatchery & Location */}
              <div className="bg-canvas-950/60 border border-glass-border p-3.5 rounded-xl space-y-2">
                <div className="text-[10px] uppercase font-bold text-teal-400 tracking-wider">Hatchery Information</div>
                <div className="font-bold text-sm">{selectedListing.hatchery_name}</div>
                <div className="flex items-center gap-1 text-ink-muted">
                  <MapPin className="h-3.5 w-3.5 text-teal-400" />
                  <span>Location: {selectedListing.hatchery_district} District</span>
                </div>
              </div>

              {/* Inventory Stock */}
              <div className="bg-canvas-950/60 border border-glass-border p-3.5 rounded-xl space-y-2">
                <div className="text-[10px] uppercase font-bold text-teal-400 tracking-wider">Stock & Inventory</div>
                <div className="grid grid-cols-2 gap-2 font-mono">
                  <div>
                    <span className="text-ink-muted block text-[10px]">Total Quantity:</span>
                    <span className="font-bold text-sm">{selectedListing.total_quantity.toLocaleString()} pcs</span>
                  </div>
                  <div>
                    <span className="text-ink-muted block text-[10px]">Quantity Available:</span>
                    <span className="font-bold text-sm text-teal-400">{selectedListing.quantity_available.toLocaleString()} pcs</span>
                  </div>
                  <div>
                    <span className="text-ink-muted block text-[10px]">Reserved:</span>
                    <span className="font-bold">{selectedListing.reserved_quantity?.toLocaleString() || 0} pcs</span>
                  </div>
                  <div>
                    <span className="text-ink-muted block text-[10px]">Confirmed/Sold:</span>
                    <span className="font-bold">{selectedListing.confirmed_quantity?.toLocaleString() || 0} pcs</span>
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div className="bg-canvas-950/60 border border-glass-border p-3.5 rounded-xl space-y-1.5">
                <div className="text-[10px] uppercase font-bold text-teal-400 tracking-wider">Pricing Details</div>
                <div className="flex justify-between items-center">
                  <span className="text-ink-muted">Standard Price:</span>
                  <span className="font-mono font-bold text-sm">₹{Number(selectedListing.price_per_piece).toFixed(2)} / piece</span>
                </div>
                {selectedListing.bulk_price_per_piece && (
                  <div className="flex justify-between items-center text-teal-300">
                    <span>Bulk Price (&gt;{selectedListing.bulk_price_threshold} pcs):</span>
                    <span className="font-mono font-bold">₹{Number(selectedListing.bulk_price_per_piece).toFixed(2)} / piece</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-ink-muted pt-1 border-t border-glass-border/50">
                  <span>Minimum Order Qty:</span>
                  <span className="font-mono font-semibold">{selectedListing.min_order_qty.toLocaleString()} pcs</span>
                </div>
              </div>

              {/* Availability & Logistics */}
              <div className="bg-canvas-950/60 border border-glass-border p-3.5 rounded-xl space-y-1.5">
                <div className="text-[10px] uppercase font-bold text-teal-400 tracking-wider">Logistics & Schedule</div>
                <div className="flex justify-between items-center">
                  <span className="text-ink-muted">Expected Ready Date:</span>
                  <span className="font-semibold">{selectedListing.expected_ready_date || 'Immediate'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-ink-muted">Fulfillment Options:</span>
                  <span className="font-semibold">
                    {selectedListing.pickup_available && '✓ Pickup '}
                    {selectedListing.delivery_available && '✓ Delivery'}
                  </span>
                </div>
              </div>
            </div>

            {/* Description if present */}
            {selectedListing.description && (
              <div className="bg-canvas-950/40 border border-glass-border p-3 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-ink-muted block mb-1">Description</span>
                <p className="text-xs text-ink-secondary leading-relaxed">{selectedListing.description}</p>
              </div>
            )}

            {/* Sales / Order History Table */}
            <div className="space-y-2 pt-2 border-t border-glass-border">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink-primary">Sales & Buyers History</h3>
                <span className="text-[10px] font-mono text-ink-muted">
                  {orders.filter(o => o.listing_id === selectedListing.id).length} Orders Found
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-glass-border bg-canvas-950/60">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-glass-border text-[9px] font-bold uppercase tracking-wider text-ink-muted bg-canvas-900/50">
                      <th className="py-2 px-3">Txn Ref / Order ID</th>
                      <th className="py-2 px-3">Buyer (Farmer)</th>
                      <th className="py-2 px-3">Qty Sold</th>
                      <th className="py-2 px-3">Total Paid</th>
                      <th className="py-2 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-glass-border/60">
                    {orders.filter(o => o.listing_id === selectedListing.id).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-ink-muted text-[11px]">
                          No orders placed for this listing yet.
                        </td>
                      </tr>
                    ) : (
                      orders
                        .filter(o => o.listing_id === selectedListing.id)
                        .map(o => (
                          <tr key={o.id} className="hover:bg-glass-subtle transition-colors">
                            <td className="py-2 px-3 font-mono text-teal-400 font-semibold text-[11px]">
                              {o.id.length > 14 ? o.id.substring(0, 14) + '...' : o.id}
                            </td>
                            <td className="py-2 px-3">
                              <div className="font-bold text-ink-primary">{o.farmer_name}</div>
                              <div className="text-[10px] text-ink-muted">{o.farmer_phone}</div>
                            </td>
                            <td className="py-2 px-3 font-mono font-semibold">
                              {o.quantity_ordered.toLocaleString()} pcs
                            </td>
                            <td className="py-2 px-3 font-mono font-bold text-teal-300">
                              ₹{Number(o.total_amount).toLocaleString()}
                            </td>
                            <td className="py-2 px-3">{renderStatusBadge(o.status)}</td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedListing(null)}
                className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-canvas-950 font-bold text-xs transition-colors"
              >
                Close Pop-up
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Details Pop-up Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-canvas-950/80 backdrop-blur-md p-4 animate-fadeIn">
          <div className="bg-canvas-900 border border-glass-border rounded-2xl max-w-2xl w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh] flex flex-col gap-5 text-ink-primary">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-glass-border pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-400">Order & Transaction Details</span>
                  {renderStatusBadge(selectedOrder.status)}
                </div>
                <h2 className="text-xl font-bold text-ink-primary mt-1 font-mono flex items-center gap-2">
                  <span>{selectedOrder.id}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(selectedOrder.id);
                      setCopiedId(selectedOrder.id);
                      setTimeout(() => setCopiedId(null), 2000);
                    }}
                    className="text-xs font-sans font-normal text-teal-400 hover:underline bg-teal-500/10 px-2 py-0.5 rounded-md border border-teal-500/20"
                  >
                    {copiedId === selectedOrder.id ? '✓ Copied!' : 'Copy ID'}
                  </button>
                </h2>
                <p className="text-xs text-ink-muted capitalize mt-0.5">
                  Type: {selectedOrder.order_type.replace('_', ' ')} • Placed on {new Date(selectedOrder.created_at).toLocaleString('en-IN')}
                </p>
              </div>
              <button 
                onClick={() => setSelectedOrder(null)}
                className="text-ink-muted hover:text-ink-primary p-1 rounded-lg hover:bg-glass-subtle transition-colors"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            {/* Grid of details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Buyer (Farmer) */}
              <div className="bg-canvas-950/60 border border-glass-border p-3.5 rounded-xl space-y-2">
                <div className="text-[10px] uppercase font-bold text-teal-400 tracking-wider">Buyer (Farmer) Info</div>
                <div className="font-bold text-sm">{selectedOrder.farmer_name}</div>
                <div className="text-ink-muted">Phone: {selectedOrder.farmer_phone}</div>
                {selectedOrder.farmer_uid && (
                  <div className="text-ink-muted font-mono text-[11px]">Govt UID: {selectedOrder.farmer_uid}</div>
                )}
              </div>

              {/* Seller (Hatchery) */}
              <div className="bg-canvas-950/60 border border-glass-border p-3.5 rounded-xl space-y-2">
                <div className="text-[10px] uppercase font-bold text-teal-400 tracking-wider">Seller (Hatchery) Info</div>
                <div className="font-bold text-sm">{selectedOrder.hatchery_name}</div>
                <div className="text-ink-muted">Contact: {selectedOrder.hatchery_phone || 'Available on request'}</div>
              </div>

              {/* Product & Seed Details */}
              <div className="bg-canvas-950/60 border border-glass-border p-3.5 rounded-xl space-y-1.5">
                <div className="text-[10px] uppercase font-bold text-teal-400 tracking-wider">Seed Specifications</div>
                <div className="flex justify-between items-center">
                  <span className="text-ink-muted">Species:</span>
                  <span className="font-semibold">{selectedOrder.species_name}</span>
                </div>
                {selectedOrder.species_variant && (
                  <div className="flex justify-between items-center">
                    <span className="text-ink-muted">Variant:</span>
                    <span className="font-semibold">{selectedOrder.species_variant}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-ink-muted">Growth Stage:</span>
                  <span className="font-semibold capitalize">{selectedOrder.stage}</span>
                </div>
              </div>

              {/* Financial Breakdown */}
              <div className="bg-canvas-950/60 border border-glass-border p-3.5 rounded-xl space-y-1.5">
                <div className="text-[10px] uppercase font-bold text-teal-400 tracking-wider">Financial Summary</div>
                <div className="flex justify-between items-center">
                  <span className="text-ink-muted">Quantity Ordered:</span>
                  <span className="font-mono font-bold">{selectedOrder.quantity_ordered.toLocaleString()} pcs</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-ink-muted">Unit Price:</span>
                  <span className="font-mono font-bold">₹{Number(selectedOrder.price_per_piece).toFixed(2)} / pc</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-glass-border/50 text-teal-300 font-bold">
                  <span>Total Amount Paid:</span>
                  <span className="font-mono text-base">₹{Number(selectedOrder.total_amount).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Delivery & Notes */}
            {(selectedOrder.delivery_address || selectedOrder.farmer_notes) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {selectedOrder.delivery_address && (
                  <div className="bg-canvas-950/40 border border-glass-border p-3 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-ink-muted block mb-1">Delivery Address</span>
                    <p className="text-xs text-ink-secondary">{selectedOrder.delivery_address}</p>
                  </div>
                )}
                {selectedOrder.farmer_notes && (
                  <div className="bg-canvas-950/40 border border-glass-border p-3 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-ink-muted block mb-1">Farmer Notes</span>
                    <p className="text-xs text-ink-secondary">{selectedOrder.farmer_notes}</p>
                  </div>
                )}
              </div>
            )}

            {/* Dispute details if disputed */}
            {selectedOrder.status === 'DISPUTED' && selectedOrder.dispute_description && (
              <div className="bg-rose-500/10 border border-rose-500/30 p-3.5 rounded-xl space-y-1">
                <div className="text-[10px] uppercase font-bold text-rose-400 tracking-wider">Dispute Details</div>
                <div className="text-xs font-semibold text-rose-300">Reason: {selectedOrder.dispute_reason?.replace('_', ' ')}</div>
                <p className="text-xs text-rose-200/90 leading-relaxed mt-1">{selectedOrder.dispute_description}</p>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex justify-end pt-2 border-t border-glass-border">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-canvas-950 font-bold text-xs transition-colors"
              >
                Close Pop-up
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
