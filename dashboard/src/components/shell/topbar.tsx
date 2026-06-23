'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, LogOut, User as UserIcon, X, Users, Droplets, ScrollText, BellRing } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { cn } from '@/lib/cn';
import { useRouter } from 'next/navigation';

const ROLE_LABELS: Record<string, string> = {
  block_officer:    'Block Officer',
  district_officer: 'District Officer',
  dlc_member:       'DLC Member',
  superadmin:       'Superadmin',
};

// ------------------------------------------------------------------
// Searchable index — items the command palette can navigate to
// ------------------------------------------------------------------
interface SearchResult {
  id: string;
  label: string;
  sublabel?: string;
  category: 'Farmer' | 'Pond' | 'Scheme' | 'Alert';
  href: string;
}

const SEARCH_INDEX: SearchResult[] = [
  // Farmers
  { id: 'f1', label: 'Ramesh Prasad Singh', sublabel: 'Patna · Phulwari Sharif', category: 'Farmer', href: '/dashboard/farmers?search=Ramesh+Prasad+Singh' },
  { id: 'f2', label: 'Sanjay Kumar Yadav',  sublabel: 'Madhubani · Benipatti',   category: 'Farmer', href: '/dashboard/farmers?search=Sanjay+Kumar+Yadav'  },
  { id: 'f3', label: 'Amit Kumar Chaudhary', sublabel: 'Gaya · Sherghati',       category: 'Farmer', href: '/dashboard/farmers?search=Amit+Kumar+Chaudhary' },
  { id: 'f4', label: 'Vikram Sen Verma',     sublabel: 'Darbhanga · Baheri',     category: 'Farmer', href: '/dashboard/farmers?search=Vikram+Sen+Verma'     },
  { id: 'f5', label: 'Rajendra Kumar Mahto', sublabel: 'Muzaffarpur · Kanti',    category: 'Farmer', href: '/dashboard/farmers?search=Rajendra+Kumar+Mahto' },
  { id: 'f6', label: 'Gopal Dev Prasad',     sublabel: 'Patna · Mokama',         category: 'Farmer', href: '/dashboard/farmers?search=Gopal+Dev+Prasad'     },
  { id: 'f7', label: 'Hari Har Paswan',      sublabel: 'Gaya · Sherghati',       category: 'Farmer', href: '/dashboard/farmers?search=Hari+Har+Paswan'       },
  // Ponds
  { id: 'p1', label: 'Pond B - Growout',         sublabel: 'Sanjay Kumar Yadav / Madhubani', category: 'Pond', href: '/dashboard?pond=p1' },
  { id: 'p2', label: 'Pond A - Nursery',          sublabel: 'Ramesh Prasad Singh / Patna',   category: 'Pond', href: '/dashboard?pond=p2' },
  { id: 'p3', label: 'Pond 1 - Rearing (⚠ Alert)', sublabel: 'Hari Har Paswan / Gaya',        category: 'Pond', href: '/dashboard?pond=p3' },
  { id: 'p4', label: 'Main Cage Array',           sublabel: 'Vikram Sen Verma / Darbhanga',  category: 'Pond', href: '/dashboard?pond=p4' },
  { id: 'p5', label: 'Mithila Matsya Hatchery',   sublabel: 'Darbhanga District',            category: 'Pond', href: '/dashboard?pond=p5' },
  // Schemes
  { id: 's1', label: 'TMVSY — Talab Matsyiki Vishesh Sahayata', sublabel: '70% subsidy · SC/ST/EBC',  category: 'Scheme', href: '/dashboard/schemes' },
  { id: 's2', label: 'JKSY — Jalkrishi Saurikaran (Solar Pump)', sublabel: '80% subsidy · All castes', category: 'Scheme', href: '/dashboard/schemes' },
  { id: 's3', label: 'MPVY — Species Diversification Hatchery',  sublabel: '60% subsidy · Prior training', category: 'Scheme', href: '/dashboard/schemes' },
  // Alerts
  { id: 'a1', label: 'Critical DO Deficit — Hari Har Paswan',   sublabel: 'Gaya · 2.4 mg/L',   category: 'Alert', href: '/dashboard/alerts' },
  { id: 'a2', label: 'EUS Disease — Ramesh Prasad Singh',        sublabel: 'Patna · Red Spots',  category: 'Alert', href: '/dashboard/alerts' },
  { id: 'a3', label: 'High Ammonia — Sanjay Kumar Yadav',        sublabel: 'Madhubani · 0.08ppm', category: 'Alert', href: '/dashboard/alerts' },
];

const CATEGORY_ICONS = {
  Farmer: <Users className="h-3.5 w-3.5" />,
  Pond:   <Droplets className="h-3.5 w-3.5" />,
  Scheme: <ScrollText className="h-3.5 w-3.5" />,
  Alert:  <BellRing className="h-3.5 w-3.5" />,
};

const CATEGORY_COLORS: Record<string, string> = {
  Farmer: 'text-teal-400 bg-teal-500/10',
  Pond:   'text-sky-400 bg-sky-500/10',
  Scheme: 'text-indigo-400 bg-indigo-500/10',
  Alert:  'text-rose-400 bg-rose-500/10',
};

// ------------------------------------------------------------------

export function Topbar() {
  const { admin, logout } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen]       = useState(false);
  const [searchOpen, setSearchOpen]   = useState(false);
  const [query, setQuery]             = useState('');
  const [activeIdx, setActiveIdx]     = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const paletteRef = useRef<HTMLDivElement>(null);

  // Filter results
  const results = query.trim().length < 1
    ? SEARCH_INDEX.slice(0, 6)
    : SEARCH_INDEX.filter(
        (r) =>
          r.label.toLowerCase().includes(query.toLowerCase()) ||
          (r.sublabel?.toLowerCase().includes(query.toLowerCase()) ?? false)
      ).slice(0, 8);

  // Open palette on ⌘K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((s) => !s);
        setQuery('');
        setActiveIdx(0);
      }
      if (e.key === 'Escape') setSearchOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Focus input when palette opens
  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [searchOpen]);

  // Arrow key navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown')  { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, results.length - 1)); }
    if (e.key === 'ArrowUp')    { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && results[activeIdx]) {
      navigate(results[activeIdx].href);
    }
  };

  const navigate = (href: string) => {
    setSearchOpen(false);
    setQuery('');
    router.push(href);
  };

  return (
    <>
      <header className="relative z-50 flex h-14 shrink-0 items-center gap-4 border-b border-glass-border bg-canvas-900/40 px-5 backdrop-blur-glass">
        {/* Brand */}
        <div className="flex items-baseline gap-3">
          <span className="text-lg font-bold leading-none text-ink-primary">MatsyaMitra</span>
          <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-ink-secondary">
            Admin Oversight
          </span>
        </div>

        {/* Search trigger */}
        <button
          onClick={() => { setSearchOpen(true); setQuery(''); setActiveIdx(0); }}
          className="ml-6 flex h-10 max-w-md flex-1 items-center gap-2 rounded-lg border border-glass-border bg-glass-subtle px-3 text-sm text-ink-secondary hover:bg-glass hover:border-teal-500/30 transition-colors"
        >
          <Search className="h-4 w-4" />
          <span className="font-mono text-xs">Search farmers, ponds, schemes…</span>
          <kbd className="ml-auto rounded border border-glass-border bg-glass px-1.5 py-0.5 font-mono text-[10px] text-ink-muted">
            ⌘K
          </kbd>
        </button>

        {/* Theme toggle */}
        <ThemeToggle className="ml-auto" />

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((s) => !s)}
            className="flex items-center gap-2 rounded-lg border border-glass-border bg-glass px-2.5 py-1.5 text-sm text-ink-primary backdrop-blur-glass transition-colors hover:bg-glass-strong"
          >
            <span className="grid h-7 w-7 place-items-center rounded-full bg-teal-500/20 text-teal-200">
              <UserIcon className="h-4 w-4" />
            </span>
            <span className="flex flex-col items-start leading-tight">
              <span className="text-sm">{admin?.fullName ?? 'Loading…'}</span>
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-secondary">
                {admin ? ROLE_LABELS[admin.role] : '—'}
              </span>
            </span>
            <ChevronDown className={cn('h-3.5 w-3.5 text-ink-muted transition-transform', menuOpen && 'rotate-180')} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-glass border border-glass-border bg-canvas-800 p-1 shadow-glass">
              <div className="border-b border-glass-border px-3 py-2.5">
                <div className="truncate text-sm text-ink-primary">{admin?.email}</div>
                <div className="text-[10px] uppercase tracking-[0.14em] text-ink-muted">
                  Scope: {(admin?.assignedStateCodes ?? []).join(', ') || '—'}
                </div>
              </div>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  logout();
                }}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-ink-primary hover:bg-glass"
              >
                <LogOut className="h-4 w-4 text-severity-critical" />
                <span>Sign out</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── Command Palette Modal ────────────────────────────────── */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-start justify-center pt-[12vh] px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setSearchOpen(false); }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          {/* Palette container */}
          <div
            ref={paletteRef}
            className="relative z-10 w-full max-w-xl rounded-2xl border border-glass-border bg-canvas-800/95 shadow-2xl overflow-hidden"
          >
            {/* Search Input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-glass-border">
              <Search className="h-4 w-4 text-ink-muted shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setActiveIdx(0); }}
                onKeyDown={handleKeyDown}
                placeholder="Search farmers, ponds, schemes, alerts…"
                className="flex-1 bg-transparent text-sm text-ink-primary placeholder-ink-muted outline-none"
              />
              {query && (
                <button onClick={() => setQuery('')} className="text-ink-muted hover:text-ink-primary transition-colors">
                  <X className="h-4 w-4" />
                </button>
              )}
              <kbd
                onClick={() => setSearchOpen(false)}
                className="cursor-pointer rounded border border-glass-border bg-glass px-1.5 py-0.5 font-mono text-[10px] text-ink-muted hover:text-ink-secondary transition-colors"
              >
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div className="max-h-[360px] overflow-y-auto py-2">
              {results.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-ink-muted">
                  No results for &ldquo;{query}&rdquo;
                </div>
              ) : (
                <>
                  {query.trim().length < 1 && (
                    <div className="px-4 pb-2 text-[10px] font-bold uppercase tracking-widest text-ink-muted">
                      Quick Access
                    </div>
                  )}
                  {results.map((result, idx) => (
                    <button
                      key={result.id}
                      onClick={() => navigate(result.href)}
                      onMouseEnter={() => setActiveIdx(idx)}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                        activeIdx === idx ? 'bg-teal-500/10' : 'hover:bg-glass-subtle'
                      )}
                    >
                      <span className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[11px]', CATEGORY_COLORS[result.category])}>
                        {CATEGORY_ICONS[result.category]}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-ink-primary truncate">{result.label}</div>
                        {result.sublabel && (
                          <div className="text-[11px] text-ink-muted truncate">{result.sublabel}</div>
                        )}
                      </div>
                      <span className={cn('text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded', CATEGORY_COLORS[result.category])}>
                        {result.category}
                      </span>
                    </button>
                  ))}
                </>
              )}
            </div>

            {/* Footer hint */}
            <div className="flex items-center gap-4 border-t border-glass-border px-4 py-2 text-[10px] text-ink-muted font-mono">
              <span><kbd className="rounded border border-glass-border px-1 py-0.5">↑↓</kbd> navigate</span>
              <span><kbd className="rounded border border-glass-border px-1 py-0.5">↵</kbd> open</span>
              <span><kbd className="rounded border border-glass-border px-1 py-0.5">ESC</kbd> close</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
