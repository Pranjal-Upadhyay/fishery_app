# MatsyaMitra Admin Dashboard

Next.js 15 (App Router) frontend for the government oversight dashboard. Standalone — has its own `node_modules` and ships independently to Vercel.

## Stack

- Next.js 15 + React 19 + TypeScript strict
- Tailwind 3 + a custom glass design system
- MapLibre GL for the geospatial layer (added in L2)
- JWT auth against the existing Express backend (separate from farmer/doctor auth)

## Local dev

```bash
cp .env.local.example .env.local
npm install
npm run dev    # → http://localhost:3001
```

The backend must be reachable at `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:3000`, where the dockerized `fishing-god-backend` listens).

## First login (dev seed)

```
email:    superadmin@matsyamitra.in
password: ChangeMe!2026
```

To set a real password:

```bash
ADMIN_PASSWORD='YourStrongPassword' \
  docker exec -i fishing-god-backend node /app/dist/scripts/seed_admin.js
```

(or run the SQL `INSERT … ON CONFLICT DO UPDATE` directly against postgres)

## Build phases

This dashboard is built in layered passes:

- **L0** — auth, layout shell, alert ticker, placeholder map (✓ current)
- **L1** — typed API client + shared types (✓ scaffolded)
- **L2** — Map canvas, alert centre, scheme CMS
- **L3** — Subsidy pipeline, production analytics, doctor/hatchery overlays, onboarding funnel
- **L4** — Audit log, error monitoring, mobile event instrumentation

Each layer is built and verified before the next begins.
