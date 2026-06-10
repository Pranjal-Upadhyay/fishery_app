# MatsyaMitra — Aquaculture Intelligence Platform

**MatsyaMitra** (मत्स्यमित्र — "Friend of Fish") is an offline-first mobile app built specifically for Indian fish and shrimp farmers. It empowers farmers to make smarter decisions about species selection, pond management, government subsidies, and market timing — all without requiring constant internet connectivity.

Designed for Bihar and expanding to all Indian states, MatsyaMitra bridges the gap between rural aquaculture farmers and the expert knowledge, government schemes, and market intelligence they need to run profitable operations.

---

## Table of Contents

- [Why MatsyaMitra](#why-matsyamitra)
- [Three Surfaces, One Platform](#three-surfaces-one-platform)
- [Features](#features)
- [Hatchery Marketplace](#hatchery-marketplace)
- [Government Survey Compliance](#government-survey-compliance)
- [Government Oversight Dashboard](#government-oversight-dashboard)
- [Screens](#screens)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Backend & Database](#backend--database)
- [Backend Worker Service](#backend-worker-service)
- [Location System](#location-system)
- [Design System](#design-system)
- [Local Development Setup](#local-development-setup)
- [Containerised Dev Stack (Docker)](#containerised-dev-stack-docker)
- [Building the APK](#building-the-apk)
- [Environment Variables](#environment-variables)
- [Database Migrations](#database-migrations)
- [Project Documentation](#project-documentation)
- [Changelog](#changelog)

---

## Three Surfaces, One Platform

MatsyaMitra is not just a mobile app. It is a coordinated three-surface platform serving every actor in the Indian aquaculture chain:

| Surface | Audience | Purpose |
| :--- | :--- | :--- |
| **📱 Mobile App** (`mobile/`) | Farmers, Hatchery operators, Doctors | Daily operations — pond management, marketplace transactions, water quality logging, consultations, government survey data entry |
| **🛰️ Admin Dashboard** (`dashboard/`) | Government officers (Block / District / DLC / Superadmin) | Oversight — live pond atlas, alert response, scheme administration, subsidy disbursement, doctor & hatchery directories, onboarding funnel analysis |
| **⚙️ Backend API + Worker** (`backend/`) | Both surfaces | Source of truth — PostgreSQL data, JWT auth (separate realms for farmers vs. admins), market price ingestion worker, cron jobs, REST endpoints |

The mobile app and the dashboard are intentionally built as **separate codebases with separate node_modules**. They share only the backend API. This keeps Metro fast for the mobile build and keeps Next.js builds independent of React Native's native module quirks.

---

## Why MatsyaMitra

Many Indian aquaculture farmers operate in remote areas with limited internet access. They need practical tools that work offline while providing expert guidance. MatsyaMitra solves this by:

- **Offline-first:** Farm planning and pond management works without internet. Data syncs when connectivity returns via WatermelonDB.
- **Location-aware subsidies:** Recommendations factor in your district, block, panchayat, and farmer category (General / Women-owned / SC-ST) to surface schemes you actually qualify for.
- **Real economics:** Run ROI calculations before investing — see CAPEX, OPEX, break-even periods, Benefit-Cost Ratios, and profitability under multiple scenarios.
- **Doctor Network:** Every farmer is routed to a certified aquaculture expert based on their panchayat for on-demand consultations and disease diagnosis.
- **Disease Intelligence:** Searchable disease library with causes, symptoms, treatments, and prevention protocols with clinical images.
- **Multi-language ready:** i18n architecture supports Hindi and English today; additional Indian languages can be added.
- **Three roles, one app:** Farmers, Hatchery operators, and Doctors share infrastructure but get role-specific dashboards, schemas, and workflows.
- **Government survey compliant:** Full coverage of the Section A (farmer profile), Section B (per-pond), Section B-recurring + B-16 (cycle production & costs), and Section E (asset depreciation) fields of the State Fisheries Department field survey form.

---

## Features

### 🏠 Home Dashboard
- Personalized greeting with time-aware message
- **Farm Health bento grid** — active pond count and critical alert count at a glance
- **Harvest Countdown** — horizontal scrollable cards for each active pond showing days to harvest
- **Live Weather Card** — current conditions for your district
- Quick Actions grid (8 shortcuts to key features)
- "New to aquaculture?" Learning Center entry point
- Notification bell with unread badge dot

### 🐟 Species Intelligence
- 40+ fish and shrimp species with full profiles
- Growth rates, survival rates, feed conversion ratios (FCR)
- Water quality requirements (temperature, pH, dissolved oxygen, salinity)
- Stocking density recommendations by region
- Suitability rating for Bihar/Indian conditions
- Search and filter by name or water type

### 💰 Economics & ROI Simulator
- Input pond area (hectares), stocking density, feed cost, sale price
- **Auto Locate** button — pre-fills your state/zone from GPS or saved profile
- Instant calculation: CAPEX, OPEX, gross revenue, net profit, BCR
- Break-even production quantity
- Multiple scenario comparison (optimistic / realistic / pessimistic)
- Policy guidance tab showing applicable subsidies and funding

### 🏛️ Government Subsidies & Policy
- PMMSY (Pradhan Mantri Matsya Sampada Yojana) scheme details
- Subsidy percentages by farmer category and location
- Eligible cost components (pond construction, liner, aeration, stocking)
- NABARD and state government scheme summaries
- Seeded with 22+ knowledge rules covering Bihar benchmarks

### 🩺 Disease Intelligence
- Searchable library of common aquaculture diseases
- Each disease card: causes, symptoms, treatment protocols, prevention
- Clinical image gallery
- Severity indicators
- Linked to Doctor Network for urgent cases

### 👨‍⚕️ Doctor Network
- Location-based routing: panchayat → block → district fallback
- View assigned doctor details and contact information
- Book paid consultations
- Hierarchical routing: if no doctor covers your panchayat, system routes to block-level expert

### 📍 Location Cascade Picker
- **District → Block → Panchayat** three-tier cascade
- **38 Bihar districts, 250+ blocks, major panchayats** — all available offline
- Instant local data on first tap (no spinner wait)
- Render API used as optional upgrade when online — seamlessly replaces local data with full DB records
- `normalizeLocalCode()` bridges API codes (`BR-PATNA`) and local fallback codes (`patna`) transparently
- `autoCorrect={false}` on all inputs — no iOS autocorrect mutations
- Manual text input as last resort; cascade only triggers on blur/submit (not per keystroke)

### 💧 Water Quality Monitoring
- Log dissolved oxygen, pH, ammonia, temperature, turbidity, nitrite, nitrate
- Time-series trend charts
- Safe-range alerts
- Share logs with assigned doctor

### 💹 Market Intelligence
- Real-time and historical fish/shrimp price data by state
- Track price trends and seasonal patterns
- Identify optimal harvest timing windows

### 📚 Learning Center
- Accordion-style module browser (no nested scroll conflicts)
- Beginner guides: stocking, feeding, disease prevention, water management
- Business concepts: BCR, profitability, subsidy navigation
- Equipment and feed selection guides

### 🛒 Equipment & Feed Catalogs
- Icon-based catalog browsing (no broken image URLs)
- Feed products with protein content, target species, price ranges
- Equipment: aerators, nets, feeders, water testing kits
- Supplier contact information and shop links

### 🐠 Hatchery Marketplace (v2)
- Farmers browse live hatchery listings for **fry** and **fingerlings**
- Hatchery operators manage full listing lifecycle: `DRAFT → UPCOMING → AVAILABLE → CLOSED / EXPIRED`
- Auto-expiry at `last_available_date` on every browse read (no scheduler needed)
- **Government UID required** on every listing — displayed prominently as the trust anchor (no ratings/reviews)
- Per-listing snapshot of contact phone, email, and UPI ID — frozen at create time so price changes don't retroactively alter old orders
- **Bulk pricing tier** — set a discounted `bulk_price_per_piece` that auto-applies above a threshold
- **Logistics flags** — pickup-only, delivery-only, or both, with logistics notes (delivery radius, fee)
- **Two order modes:**
  - **PURCHASE_ORDER**: `REQUESTED → ACCEPTED → FARMER_PAID → HATCHERY_CONFIRMED → FULFILLED` with `REJECTED` / `CANCELLED` / `DISPUTED` terminal states
  - **ADVANCE_INTEREST** (on UPCOMING listings): `INTEREST_REQUESTED → INTEREST_ACKNOWLEDGED → INTEREST_CONVERTED` (becomes a real order when stock is ready)
- **Reserved + confirmed inventory model** — `available_quantity = batch_size − reserved_quantity − confirmed_quantity`. Quantity is reserved at ACCEPT, moved to confirmed at HATCHERY_CONFIRMED, released on cancel
- **Off-platform payment** — app shows hatchery's UPI/phone with copy-friendly share sheet; farmer marks "I have paid" → hatchery confirms receipt
- **Dispute flow** — 5 reasons (Quantity mismatch, High mortality, Not as described, Payment not received, Other) raised from either party after HATCHERY_CONFIRMED
- **In-app marketplace notifications** — order placed, accepted, payment confirmed, dispute raised, interest converted prompt, etc.

### 📊 Crop Cycles (Government Survey Section B Recurring)
- Per-pond, per-season log — one record per crop cycle
- Cycle name, species, start/end dates (via shared calendar picker)
- Status tabs: `Ongoing` / `Harvested` / `Cancelled`
- **Production tracking:** present (running) + total (at harvest) in kg
- **Full 8-row input cost breakdown** (₹): Feed-Formulated, Feed-Homemade, Probiotic, Medicine, Electricity, Labour-Hired, Labour-Family, Other
- **Revenue + auto-computed profit** (green if positive, red if negative)
- Year-over-year comparison and audit-ready historical records — values stored on backend (server is source of truth for survey data)
- Reachable from any existing pond's edit screen → "Crop Cycles" nav card

### 🧰 Farm Assets (Government Survey Section E)
- Track 11 asset types: Aerator, Motor Pump, Boat, Fish-net, Bore-well, Biofloc Tank, RAS, Biofloc Pond, Civil Work Pond, Embankment, Other
- Per-asset: type, name, purchase date (via calendar), cost (A), economic life in years (B), salvage value (C)
- **Auto-computed annual depreciation** via Postgres `GENERATED ALWAYS AS ((cost − salvage) / life) STORED` — formula can never drift between server and mobile
- **Live preview** while entering values in the mobile form
- Summary strip on list view: total assets, total cost, total annual depreciation
- Optional pond link — assets shared across ponds (most aerators/pumps are) live at the farmer level

### 📅 Reusable Calendar Picker
- `CalendarPickerModal` component matches the app's bottom-sheet aesthetic
- `<<` / `>>` year-jump arrows for fields like Date-of-Birth that span decades
- Min/max date bounds, default month, "Use today" + "Clear date" actions
- Used across PersonalInfo (DOB), CropCycle (start/end), FarmAssets (purchase date)

### 🔔 Notification Center
- In-app notification feed
- Unread count badge on home screen bell
- Mark-as-read tracking via AsyncStorage
- Marketplace events: order placed, accepted, rejected, paid, confirmed, fulfilled, disputed; advance interest acknowledged/declined/converted; listing due-today reminders

### 🗺️ Map View
- Pond location plotting on Google Maps (Android) / Apple Maps (iOS)
- GPS coordinate capture when adding ponds

### 👤 Profile & Settings
- Personal info: name, phone, farmer category, home location
- **Government survey Section A fields** — father/husband name, Aadhaar (12-digit validated), gender, date-of-birth (calendar picker), education level, household size, years of farming experience, primary occupation, annual income range, KCC holder Y/N, BPL holder Y/N
- **Consent toggle** — one-time confirmation that submitted info is correct; timestamp recorded server-side via `consent_given_at`
- Language toggle (English / Hindi)
- Dark / Light mode toggle
- Notification preferences
- All toggles vertically centered and full-row tappable
- Offline-safe: profile saves to AsyncStorage first, then sync queue replays on next online event

### 🏞️ Pond Editor (Government Survey Section B)
The Add/Edit Pond screen captures the per-pond survey fields:
- Pond ownership type (Owned / Leased / Shared / Government)
- Water availability (Seasonal / Perennial)
- Culture system category (Extensive / Semi-intensive / Intensive)
- Pond activity type (Nursery / Rearing / Grow-out / Broodstock / Mixed)
- **4 survey photo slots** (Section D): Wide Angle, Embankment, Close View, Farmer with Pond
- Risk fields (Section F): Is pond insured? Flood impact in last 3 years? Disease occurrence (None / Minor / Major)
- All fields optional and additive — existing ponds keep working with empty values

---

## Hatchery Marketplace

The marketplace is a fully-implemented, government-grade e-commerce layer connecting hatchery operators (fish breeders) with farmers (buyers of fry/fingerlings).

### Data Model

**Listings** (`fingerling_listings`): one row per batch posted by a hatchery.
- Identity: `hatchery_id`, snapshot of `hatchery_uid` (gov registration), `contact_number`, `email`, `upi_id`, district/block/panchayat
- Product: `stage` (fry/fingerling), `species_name`, `species_variant`, `size_description`, `description`
- Quantity: `total_quantity`, `reserved_quantity`, `confirmed_quantity`, `min_order_qty`, `quantity_available` (derived)
- Pricing: `price_per_piece` plus optional `bulk_price_per_piece` + `bulk_price_threshold`
- Timing: `expected_ready_date`, `last_available_date` (auto-expiry)
- Logistics: `pickup_available`, `delivery_available`, `logistics_notes`
- Status: `DRAFT` / `UPCOMING` / `AVAILABLE` / `CLOSED` / `EXPIRED`

**Orders** (`fingerling_orders`): one row per farmer's intent against a listing.
- `order_type`: `PURCHASE_ORDER` or `ADVANCE_INTEREST`
- 8 purchase-order statuses + 4 interest statuses (see Features)
- Price snapshot at order time (`price_per_piece_at_order`, `bulk_price_applied`) so listing edits don't retroactively change agreements
- `logistics_preference` (PICKUP / DELIVERY), `preferred_date`, `payment_screenshot_url`
- Dispute: `dispute_reason` (5 enum values), `dispute_description`, `disputed_at`, `disputed_by`
- Advance-interest helpers: `interest_converted_to` FK, `interest_lapsed_at`

**Notifications** (`marketplace_notifications`): in-app feed of marketplace events.

### Order Lifecycle

```
PURCHASE ORDER:
  REQUESTED → ACCEPTED          → FARMER_PAID → HATCHERY_CONFIRMED → FULFILLED
              (reserves qty)      ↑              (moves to confirmed_quantity)
              ↓                   |
           REJECTED           DISPUTED ←── either party after CONFIRMED
              CANCELLED ←──── either party at any pre-CONFIRMED step

ADVANCE INTEREST (on UPCOMING listings):
  INTEREST_REQUESTED → INTEREST_ACKNOWLEDGED ──→ [listing becomes AVAILABLE]
                                              ↓
                                       INTEREST_CONVERTED  (creates real PURCHASE_ORDER)
                       ↓
                  INTEREST_DECLINED
```

### Off-Platform Payment

By design, the app **does not process money**. It only records intent and confirmation:

1. Hatchery accepts farmer's order → app shows farmer the UPI / phone snapshot
2. Farmer pays via UPI / bank transfer / cash and taps **"I have paid"**
3. Hatchery verifies receipt and taps **"Confirm Payment"** → quantity moves from reserved to confirmed
4. Either party marks **"Fulfilled"** after delivery; either can raise a dispute

---

## Government Survey Compliance

MatsyaMitra implements the State Fisheries Department field survey form. Fields are organised by their natural collection cadence:

| Bucket | Where filled | What's captured |
|---|---|---|
| **A — Farmer Profile** (one-time) | `PersonalInfo` screen | Section A: father/husband name, Aadhaar, gender, DOB, education, household size, experience, occupation, income range, KCC/BPL, consent + signature timestamp. Sections G+H surveyor fields are intentionally **not collected in the farmer app** — they belong on a future government officer portal. |
| **B — Per Pond** (per add/edit) | `AddEditPond` screen | Section B: patch name, area, ownership, water source, water availability, culture intensity, pond activity type. Section D: 4 photos (wide / embankment / close / farmer with pond). Section F: insurance, flood impact 3yrs, disease occurrence. |
| **C — Per Cycle / Season** (recurring) | `CropCycle` screen | Section B-recurring + B-16: present production, total production, revenue, and the full 8-row input cost breakdown (feeds, probiotic, medicine, electricity, labour, other). |
| **E — Capital Assets** (one-time per asset) | `FarmAssets` screen | Section E: 11 asset types with cost / economic life / salvage value and Postgres-computed annual depreciation. |

This separation matches how the form is actually filled in the field — profile once at registration, pond once at survey, then cycles + assets logged as they happen.

---

## Government Oversight Dashboard

A standalone **Next.js 15 web dashboard** lives alongside the mobile app under `dashboard/`. It is designed for the State Fisheries Department — block officers, district officers, DLC committee members, and superadmins — to monitor, intervene, and govern the entire MatsyaMitra ecosystem from a desk.

Unlike the mobile app, the dashboard is **online-first, glass-aesthetic, deck.gl-powered, and dark-mode native**. It speaks to the same Express backend as the mobile app but uses a **separate JWT realm** (`ADMIN_JWT_SECRET` ≠ `JWT_SECRET`) so a leaked farmer token can never forge an officer claim, and vice versa.

### Dashboard at a glance

```
┌─────────────────────────────────────────────────────────────────────┐
│  Sidebar (icon rail)                  Map of Bihar — every pond     │
│  • Map (Atlas)                       ┌──────────────────────────┐  │
│  • Alerts                            │  Live Telemetry           │  │
│  • Schemes (Yojana CMS)              │  Ponds mapped: 7          │  │
│  • Subsidies (DBT)                   │  Critical alerts: 2 🔴    │  │
│  • Water Quality                     │  Hatcheries online: 2     │  │
│  • Production Analytics              │  [Outbreak heatmap ●○]    │  │
│  • Doctors                           ├──────────────────────────┤  │
│  • Hatcheries                        │  Atlas Filters            │  │
│  • Farmers (funnel)                  │  District ▾ Species ▾    │  │
│  • Settings                          │  System ▾ Health ▾       │  │
│                                       └──────────────────────────┘  │
│                       (clicking a pond → left-side inspection drawer)│
└─────────────────────────────────────────────────────────────────────┘
```

### Pages

#### 🗺️ Map (Atlas) — `/dashboard`
The dashboard **opens directly onto a full-viewport map of Bihar**, no welcome card, no warm-up. Every pond, hatchery, and cage array in the system is plotted with a coloured marker (teal = normal, red pulse = critical).

- **Right drawer — Live Telemetry card:** counts of mapped ponds, critical alerts (number turns rose-pink and pulses when > 0), hatcheries online — all numbers respond live to the active filters
- **Outbreak Heatmap toggle:** glass switch overlays a density gradient over the map. When active and there are critical alerts in the current filter set, surrounding markers dim so the hotspot is readable
- **Atlas Filters:** District, Species Stocked, Culture System (Earthen / Biofloc / RAS / Cages), Health Status (Normal / Critical) — all four combine via AND
- **Pond inspection drawer (slides in from left when a marker is clicked):**
  - Status pill (NURSERY / GROW_OUT / HATCHERY)
  - Owner name, GPS coordinates, ownership type
  - **Survey Specifications grid:** land area, water source, culture system, stock species
  - **Live Water Chemistry strip:** pH, DO, Temp, NH₃ — values flip to rose-pink when out of threshold
  - **Mobile Survey Photos grid:** the 4 photos the farmer captured (Wide / Embankment / Close / Farmer with Pond) — proves the pond is real
  - **"View Farmer Profile" CTA** → deep-links to `/dashboard/farmers?search=…`
- **Critical alert banner** appears inside the drawer when the selected pond has an active ecological alert, with the specific reason (e.g. "Dissolved Oxygen dropped to 2.8 mg/L, threshold 3.5")

#### 🔔 Alerts — `/dashboard/alerts`
Real-time inbox of every critical and warning condition flagged by farmer water-logging or disease-symptom reports. Two categories: **Water Parameter** (DO crash, pH spike, ammonia jump) and **Disease Outbreak** (EUS lesions, Aeromoniasis, fish lice).

Each alert card shows the farmer's name, phone, location (district + block), age of the alert, and a one-line ecological cause.

**Officer actions on each alert:**
1. **Send SMS** — fires an outbound advisory text to the affected farmer (placeholder integration; production wires to MSG91 / Gupshup)
2. **Dispatch Doctor** — opens a dropdown of available doctors filtered by specialty (Fish Pathology, Water Biology, Parasitology), the officer picks one, the alert is marked `dispatched`
3. **Mark Resolved** — once the farmer confirms recovery

Resolved alerts collapse into a separate history strip but stay queryable.

#### 📜 Schemes (Yojana CMS) — `/dashboard/schemes`
The administrative side of the PMMSY / NABARD / state-scheme catalog. Two tabs:

**Tab 1 — Yojana catalog management** — every scheme has:
- Code, Hindi name, English name
- Subsidy percentage by farmer category (General / EBC / SC / ST)
- Unit cost cap in lakhs ₹
- Eligibility text (land area, ownership type, farmer category)
- Classification (Capital infra / Working capital / Insurance / Training)
- Geofence — which districts the scheme is active in

**Tab 2 — Application processing queue** — every farmer's scheme application flows through this board:
- `Awaiting Review` → officer verifies documents (Aadhaar, land deed, bank passbook, photo)
- `DLC Queue` → escalated to the District Level Committee
- `Approved` → moves to subsidy pipeline (next page)
- `Milestone 1 Met` → first tranche disbursed, photo proof captured
- `Milestone 2 Met` → final tranche disbursed

For each application, the officer sees: app number, farmer's caste category, scheme name, district, land area, document checklist with per-doc status (verified / pending / missing), GPS coordinates with a "GPS Match" indicator (green tick if the submitted GPS falls inside the registered district polygon), and the subsidy amount.

#### 💵 Subsidies (DBT) — `/dashboard/subsidies`
The financial pipeline for **Direct Benefit Transfer** of subsidies to farmer bank accounts.

- **Caste allocation budgets:** progress bars for General (₹12 Cr), EBC (₹15 Cr), SC (₹10.5 Cr), ST (₹5 Cr) — shows current disbursed vs. target with utilisation %
- **DBT transaction ledger:** every disbursement row carries UTR (Unique Transaction Reference), farmer name, yojana, bank seeding status (Seeded & Verified / Processing), amount, status (Success / Processing / Failed), date
- **Stats strip at the top:** total budget, total disbursed, pending DLC count, overall utilisation rate — all pulled live from the backend
- **Failed transactions** flagged in red — the officer can re-trigger or escalate

This page is the bridge between scheme approval and money actually reaching the farmer.

#### 💧 Water Quality — `/dashboard/water`
Searchable, filterable log of every water-quality entry farmers have submitted via the mobile app.

Each row: pond name, farmer name, district, pH, DO (mg/L), ammonia (ppm), temperature (°C), logged timestamp, and a coloured status pill (safe / alert / critical) computed against the thresholds set in `Settings`.

**Search** finds by pond, farmer, or district. **Status filter** narrows to just critical or alert rows when the officer is firefighting outbreaks.

#### 🌾 Production Analytics — `/dashboard/production`
The yield, feed, and energy accounting view — built from `crop_cycles` and `farm_assets` data the farmer logs through the mobile survey screens.

- **Harvest logs:** per-pond record showing species, cycle duration (months), total yield (kg), survival percentage, and **Feed Conversion Ratio (FCR)** — the single most important efficiency metric in aquaculture
- **Feed accounting:** brand, bags purchased, bags consumed, bag weight, unit cost, remaining inventory — helps the officer spot underfeeding or feed-diversion patterns
- **Energy ledger:** aerator quantity, horsepower, average daily run hours, power source, kWh consumed, electricity cost — feeds into the Section E asset depreciation reports
- Drill-down on any harvest reveals farmer contact details for follow-up site visits

#### 🩺 Doctors — `/dashboard/doctors`
The directory of every empanelled aquaculture doctor in the network, plus their active diagnosis log.

- **Doctor cards:** name, specialty (Fish Pathology / Aquaculture Biology / Water Chemistry / Parasitology), assigned district & block, phone, live availability status (Available / On Field Visit / Inactive)
- **Diagnosis log:** every case a doctor has handled — farmer name, pond, disease (EUS, Aeromoniasis, Argulosis, etc.), the exact treatment prescribed (e.g. "CIFAX 1 L/acre + KMnO₄ disinfection"), prescribing doctor, date, and recovery status (In Treatment / Recovered)
- Search-and-filter across both panels

This page lets a district officer see at a glance which blocks have under-coverage and which doctors are overloaded.

#### 🐠 Hatcheries — `/dashboard/hatcheries`
The hatchery operator oversight view.

- **Batches in production:** every active spawn → fingerling pipeline with batch number, hatchery name, species & variant (Jayanti Rohu / Amrita Katla / Standard), current stage (Spawning → Hatching → Yolk Absorption → Nursery → Rearing → Fingerling Ready), days in stage, brood-stock counts (male/female), expected ready date, estimated fingerling yield
- **Sales ledger:** every fingerling sale — TXN reference, buyer name & phone, species, quantity, total amount, delivery status, date
- **QR code action** on each batch — exports a traceability QR that the officer can paste onto physical batch tags during field inspection
- Search across hatcheries, batch numbers, and buyer records

#### 👥 Farmers (Onboarding Funnel) — `/dashboard/farmers`
The growth & retention analytics page — answers "where are farmers dropping off in the funnel and why?"

- **5-stage funnel** with counts and conversion percentages:
  - Registered (1,240 — 100%)
  - Profile Complete (980 — 79%)
  - First Pond Added (640 — 51%)
  - Active Cycle (420 — 33%)
  - Water Logging (180 — 14%)
- **District-wise breakdown table:** for each Bihar district — registered count, active count, drop-off percentage — sortable so officers can identify the worst-performing blocks for targeted outreach
- **Stuck farmers list:** every farmer who has been frozen at the same funnel stage for more than 30 days — with their name, phone, district, block, stuck-days counter, and a deep-link to call them
- **Bulk export** of the funnel as CSV for monthly reporting

#### ⚙️ Settings — `/dashboard/settings`
The control panel for the officer's own thresholds and identity.

- **Water-quality thresholds** — DO minimum, pH min/max, ammonia maximum — saved to `localStorage` and **read live by the Map page**, so changing the DO threshold here immediately re-classifies which ponds appear as critical on the atlas
- **Yojana targets & budget** — total scheme target count and total budget in crores, used to size the progress bars on the Subsidies page
- **Officer identity** — name, district, block — pre-fills audit log entries and shows in the top-bar greeting
- All settings persist in `localStorage` so they survive refresh without a backend round-trip

### Authentication & Security

The dashboard treats security as a first-class concern — see `dashboard/SECURITY.md` for the full posture document. Highlights:

- **Roles:** `block_officer`, `district_officer`, `dlc_member`, `superadmin`. Each admin has `assigned_state_codes / district_codes / block_codes` and backend routes filter all data by that jurisdiction (no district officer can see another district's farmers)
- **No public signup** — admins are created only by a superadmin via the dashboard. Bootstrap superadmin uses `seed_admin.ts` with a `must_change_password` flag forcing rotation on first login
- **bcrypt cost 12** for password hashing; **8-hour JWT** signed with `iss=matsyamitra-admin`
- **30-minute idle auto-logout** — any mouse / keyboard / scroll / touch resets a throttled timer; on expiry the token is wiped and the officer is bounced to login
- **Per-account lockout:** 5 consecutive failed password attempts → 30-minute lock. Successful login clears the counter
- **Per-IP rate limit:** 20 admin login attempts per 15 minutes (successful logins don't count toward the cap)
- **Generic error messages** — UI shows `Invalid email or password` regardless of which field failed; specific reasons live only in the `admin_audit_log` (which is append-only by policy — no `DELETE` or `UPDATE` queries exist anywhere in the codebase)
- **CSP, helmet, HSTS, X-Frame-Options: DENY** on all admin responses; password fields disable autocorrect/autocapitalize/spellcheck

### Glass Design System

The dashboard runs its own dark-glass aesthetic, distinct from the mobile app's Fishing God v2 system:

- **Canvas:** deep navy (`canvas-900` / `canvas-950`) with backdrop-blur glass cards (`GlassCard` component)
- **Accent:** teal (`teal-400` / `teal-500`) for primary, rose (`rose-400`) for critical / alert, amber for warnings
- **Typography:** Inter for body, monospace numerics for tabular figures (water chem strip, budgets) so columns stay aligned
- **Icons:** `lucide-react` exclusively — no emoji, no Ionicons (the mobile app uses Ionicons)
- **Animations:** subtle — critical counters use `animate-pulse`, active sidebar items get a glowing 3px teal rail

### First Login (Dev Seed)

```
email:    superadmin@matsyamitra.in
password: ChangeMe!2026
```

To set a real password against the dockerised backend:

```bash
ADMIN_PASSWORD='YourStrongPassword' \
  docker exec -i fishing-god-backend node /app/dist/scripts/seed_admin.js
```

### Build Phases

The dashboard is built in layered passes:

- **L0** — auth, layout shell, alert ticker, placeholder map *(complete)*
- **L1** — typed API client + shared types *(complete)*
- **L2** — full Map canvas, Alerts page, Schemes CMS *(complete)*
- **L3** — Subsidy pipeline, Production analytics, Doctor/Hatchery overlays, Farmer onboarding funnel *(complete)*
- **L4** — Audit log viewer, error monitoring, mobile event instrumentation *(in progress)*

---

## Screens

| Screen | Route Name | Role |
|--------|-----------|------|
| Auth (Login / Register) | `Auth` | All |
| Home Dashboard | `Home` | Farmer |
| Ponds List | `PondsList` | Farmer |
| Add / Edit Pond | `AddEditPond` | Farmer |
| Crop Cycles | `CropCycle` | Farmer |
| Farm Assets | `FarmAssets` | Farmer |
| Species Browser | `Species` | Farmer |
| Species Detail | `SpeciesDetail` | Farmer |
| Economics / ROI | `Economics` | Farmer |
| Economics Result | `EconomicsResult` | Farmer |
| Policy Guidance | `PolicyGuidance` | Farmer |
| Water Quality | `WaterQuality` | Farmer |
| Market Prices | `MarketPrices` | Farmer |
| Disease List | `DiseaseList` | Farmer |
| Disease Detail | `DiseaseDetail` | Farmer |
| Doctor Network | `DoctorNetwork` | Farmer |
| Equipment Catalog | `EquipmentCatalog` | Farmer |
| Feed Catalog | `FeedCatalog` | Farmer |
| Learning Center | `LearningCenter` | Farmer |
| Map | `Map` | Farmer |
| Notifications | `Notifications` | All |
| Personal Info | `PersonalInfo` | All |
| Profile & Settings | `Profile` | All |
| Marketplace Browse | `MarketListings` | Farmer |
| Listing Detail | `ListingDetail` | Farmer |
| My Orders | `MyOrders` | Farmer |
| Hatchery Dashboard | `HatcheryDashboard` | Hatchery |
| Hatchery Profile | `AddHatchery` | Hatchery |
| Manage Listings | `ManageListings` | Hatchery |
| Create Listing | `CreateListing` | Hatchery |
| Incoming Orders | `IncomingOrders` | Hatchery |
| Doctor Dashboard | `DoctorDashboard` | Doctor |

---

## Architecture

```
fishery_app/
├── docker-compose.yml        # 4-service stack: postgres + redis + backend + worker
├── .env                      # Root env consumed by docker-compose
│
├── mobile/                   # React Native (Expo) — farmer / hatchery / doctor app
│   ├── app.json              # Expo config — name: MatsyaMitra, slug: matsyamitra
│   ├── eas.json              # EAS Build profiles (development, preview, apk, production)
│   ├── metro.config.js       # Standalone Metro config (no monorepo hoisting)
│   ├── start.sh              # Fast launcher — forces Node 22 LTS, auto-detects LAN IP
│   ├── .env                  # EXPO_PUBLIC_BACKEND_URL
│   └── src/
│       ├── screens/          # 40+ screens (Farmer + Hatchery + Doctor)
│       ├── components/       # Shared (LocationCascadePicker, CalendarPickerModal, …)
│       ├── services/         # apiService.ts, authService.ts, syncService.ts, profileService.ts
│       ├── database/         # WatermelonDB schema, adapter (SQLite native / LokiJS Expo Go)
│       ├── utils/            # speciesLookup, notificationCenter, diseaseContent, uidFormatter
│       ├── i18n/             # i18next — en.json, hi.json
│       ├── ThemeContext.tsx  # Dark / light mode context
│       └── AuthContext.tsx   # JWT auth state (DEV_SKIP_AUTH = false for production)
│
├── backend/                  # Node.js / Express / TypeScript REST API + Worker
│   ├── Dockerfile            # Multi-stage build → runs migrate then server
│   ├── Dockerfile.worker     # Separate image for the market-data scraper
│   ├── start.sh              # Entrypoint: runs migrations then starts API
│   ├── src/
│   │   ├── routes/           # 18 route modules (auth, marketplace, hatcheries, doctors, …)
│   │   ├── services/         # Domain services (DoctorRouting, EconomicsSimulator, PMMSY, …)
│   │   ├── middleware/       # auth, adminAuth, audit, security, validate
│   │   ├── workers/          # fmpisScraper, marketDataIngestion
│   │   ├── cron/             # hatcheryNotifications (node-cron schedules)
│   │   ├── scripts/          # migrate.ts + 13 versioned migrate scripts + seed scripts
│   │   └── index.ts          # Express app entry
│   └── migrations/           # 41 SQL migration files (001–041)
│
├── dashboard/                # Next.js 15 admin dashboard (separate node_modules)
│   ├── next.config.ts
│   ├── tailwind.config.ts    # Glass design system tokens
│   ├── .env.local            # NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
│   └── src/
│       ├── app/
│       │   ├── (auth)/login/ # Officer login + idle-watcher boundary
│       │   └── dashboard/    # 9 oversight pages (map, alerts, schemes, subsidies, …)
│       ├── components/
│       │   ├── map/          # deck.gl + react-map-gl canvas + map-type toggle
│       │   ├── shell/        # sidebar, topbar, layout-shell, alert-ticker
│       │   └── ui/           # glass-card, button, input, password-input, theme-toggle
│       └── lib/
│           ├── api.ts        # Typed fetch client with JWT injection
│           ├── auth-context.tsx
│           ├── idle-watcher.tsx  # 30-min idle auto-logout
│           └── theme-context.tsx
│
└── documentation/            # Living spec docs
    ├── ARCHITECTURE_AUDIT.md          # Monorepo → standalone migration audit
    ├── DEVELOPER_README.md            # Dev status, known gaps, roadmap
    ├── ECONOMICS_MATH.md              # BCR / ROI formulas and calibration
    ├── YOJANA_INTEGRATION_PLAN.md     # Scheme catalog integration spec
    ├── MatsyaMitra_Hatchery_Feature_Implementation.md
    ├── AGENTS.md                      # AI agent prompts used during development
    └── SECURITY.md                    # Platform-wide security posture
```

### Offline-First Data Flow (Mobile)

```
User Action (on phone, possibly offline)
    │
    ▼
WatermelonDB (SQLite on device)   ←──── reads/writes always work offline
    │
    │  (when network available)
    ▼
Express API (Postgres)            ←──── sync, location lookup, market data, marketplace
    │
    ▼
Render.com (production) or Docker (local dev)
```

### Online-First Data Flow (Dashboard)

```
Officer browser
    │
    ▼
Next.js 15 (port 3001)            ←──── server components + client islands
    │
    │  (JWT in Authorization header — never in cookies, CSRF-immune)
    ▼
Express API (port 3000)           ←──── jurisdiction-scoped queries (state/district/block)
    │
    ▼
PostgreSQL + admin_audit_log      ←──── every auth event recorded, append-only
```

---

## Tech Stack

### Mobile

| Layer | Technology |
|-------|-----------|
| Framework | React Native 0.81 + Expo SDK 54 |
| Navigation | React Navigation v6 (stack + bottom tabs) |
| Offline DB | WatermelonDB 0.27 (SQLite adapter on device) |
| State | React hooks + Zustand (global slices) |
| HTTP | Axios (auto-switches localhost ↔ Render by `__DEV__` flag) |
| Maps | react-native-maps (Google Maps Android / Apple Maps iOS) |
| Location | expo-location (GPS + reverse geocode) |
| i18n | i18next + react-i18next |
| Build | EAS Build (Expo Application Services) |

### Backend

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20 + TypeScript 5 |
| Framework | Express 4 |
| Database | PostgreSQL 15 (Render managed in prod, postgis/postgis:15-3.4 in dev) |
| Cache / Queue | Redis 7-alpine |
| Auth | JWT (jsonwebtoken) + bcrypt cost-12 — separate realms for farmer vs. admin |
| Validation | Zod (request body schemas, no string interpolation in SQL) |
| Rate Limiting | express-rate-limit |
| Security | helmet (CSP, HSTS, X-Frame-Options) |
| Cron | node-cron (market price refresh, hatchery notifications) |
| Scraping | puppeteer + chromium (AGMARKNET, FMPIS market data) |
| Logging | Winston |
| Hosting | Render.com (Docker container) for prod; docker-compose for local |

### Dashboard

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) + React 19 |
| Language | TypeScript 5 (strict) |
| Styling | Tailwind 3 + custom glass design tokens |
| Maps | MapLibre GL 4 + react-map-gl 7 + deck.gl 9 (heatmap, scatter layers) |
| Google Maps integration | `@vis.gl/react-google-maps` (alternate map backend) |
| Icons | lucide-react |
| Class merging | clsx + tailwind-merge |
| Validation | Zod 3 |
| Auth | Same Express backend, separate `ADMIN_JWT_SECRET`, 8h tokens, 30-min idle expiry |
| Hosting | Vercel (production), `npm run dev -p 3001` (local) |

---

## Backend & Database

### API Base URL
- **Production:** `https://fishery-app.onrender.com`
- **Local dev (Android emulator):** `http://10.0.2.2:3000`
- **Local dev (iOS simulator):** `http://localhost:3000`

### Key API Endpoints

```
# Catalogs & knowledge
GET    /api/v1/species                                    All species
GET    /api/v1/species/:id                                Species detail
GET    /api/v1/knowledge-rules                            Subsidy/policy rules
GET    /api/v1/diseases                                   Disease library
GET    /api/v1/market-prices                              Current prices by state

# Locations
GET    /api/v1/locations/districts?stateCode=BR            Bihar districts (38)
GET    /api/v1/locations/blocks?districtCode=BR-PATNA      Blocks for district
GET    /api/v1/locations/panchayats?blockCode=BR-...       Panchayats

# Auth (extended with Bucket 1 / Section A survey fields)
POST   /api/v1/auth/signup                                 Register (FARMER / DOCTOR / HATCHERY)
POST   /api/v1/auth/login                                  Login → JWT
PATCH  /api/v1/auth/profile/:userId                        Update profile incl. Section A fields

# Doctors
GET    /api/v1/doctors                                     Doctor list (filtered by panchayat)
POST   /api/v1/doctors/mapping                             Assign doctor to farmer

# Hatcheries
GET    /api/v1/hatcheries/me-profile                       Get my hatchery profile
PATCH  /api/v1/hatcheries/me-profile                       Update gov UID, contact, email, UPI

# Marketplace — Listings
GET    /api/v1/marketplace/listings                        Browse (?includeUpcoming, ?stage, ?species, ?district)
GET    /api/v1/marketplace/listings/mine                   Hatchery's own listings
GET    /api/v1/marketplace/listings/:id                    Listing detail
POST   /api/v1/marketplace/listings                        Create DRAFT
PATCH  /api/v1/marketplace/listings/:id                    Update (status-gated fields)
DELETE /api/v1/marketplace/listings/:id                    Delete (DRAFT only)
POST   /api/v1/marketplace/listings/:id/publish            DRAFT → UPCOMING / AVAILABLE
POST   /api/v1/marketplace/listings/:id/mark-available     UPCOMING → AVAILABLE
POST   /api/v1/marketplace/listings/:id/close              any → CLOSED

# Marketplace — Orders
POST   /api/v1/marketplace/orders                          Place purchase order
GET    /api/v1/marketplace/orders/mine                     My orders (farmer or hatchery side)
GET    /api/v1/marketplace/orders/:id                      Order detail
PATCH  /api/v1/marketplace/orders/:id/accept               Hatchery accepts (reserves qty)
PATCH  /api/v1/marketplace/orders/:id/reject               Hatchery rejects
PATCH  /api/v1/marketplace/orders/:id/pay                  Farmer marks paid
PATCH  /api/v1/marketplace/orders/:id/confirm              Hatchery confirms (reserved → confirmed)
PATCH  /api/v1/marketplace/orders/:id/fulfill              Either marks fulfilled
PATCH  /api/v1/marketplace/orders/:id/cancel               Either cancels
PATCH  /api/v1/marketplace/orders/:id/dispute              Either raises dispute (5 reasons)

# Marketplace — Advance Interest
POST   /api/v1/marketplace/listings/:id/interest           Farmer expresses interest
PATCH  /api/v1/marketplace/orders/:id/acknowledge          Hatchery acknowledges interest
PATCH  /api/v1/marketplace/orders/:id/decline              Hatchery declines interest
POST   /api/v1/marketplace/orders/:id/convert              Farmer converts interest → real order

# Marketplace — Notifications
GET    /api/v1/marketplace/notifications                   List in-app notifications
PATCH  /api/v1/marketplace/notifications/:id/read          Mark read

# Survey — Crop cycles (Section B recurring + B-16 costs)
GET    /api/v1/crop-cycles?pondId=&status=                 List cycles
GET    /api/v1/crop-cycles/:id                             Cycle detail
POST   /api/v1/crop-cycles                                 Create cycle
PATCH  /api/v1/crop-cycles/:id                             Update cycle (explicit allowlist)
DELETE /api/v1/crop-cycles/:id                             Delete

# Survey — Farm assets (Section E, auto-depreciation)
GET    /api/v1/farm-assets?pondId=                         List assets
GET    /api/v1/farm-assets/:id                             Asset detail
POST   /api/v1/farm-assets                                 Create asset
PATCH  /api/v1/farm-assets/:id                             Update asset
DELETE /api/v1/farm-assets/:id                             Delete
```

### Location Code Format

```
State:      BR
District:   BR-PATNA
Block:      BR-PATNA-SADAR
Panchayat:  BR-PATNA-SADAR-NAUBATPUR
```

---

## Backend Worker Service

Alongside the main Express API, a **separate worker container** runs in the background. It exists because long-running scrape jobs and cron schedules shouldn't share a process with user-facing request handlers.

### What the worker does

| Job | Source | Cadence | Purpose |
| :--- | :--- | :--- | :--- |
| **AGMARKNET scrape** | `workers/marketDataIngestion.ts` | Daily 02:00 IST | Pulls wholesale fish & shrimp prices from the Government of India AGMARKNET portal — feeds the Market Prices screen and the Economics simulator's break-even calculation |
| **FMPIS scrape** | `workers/fmpisScraper.ts` | Twice weekly | Fish Market Price Information System — supplementary state-level price data for districts AGMARKNET doesn't cover |
| **Hatchery notifications** | `cron/hatcheryNotifications.ts` | Hourly | Sends in-app notifications: listing due-today reminders, advance-interest conversion prompts, stale-order nudges |
| **Marketplace auto-expiry** | inline in `routes/marketplace.ts` | Lazy (on every browse) | Listings past their `last_available_date` flip from `AVAILABLE` → `EXPIRED` on the next read — no scheduler needed for this one |

### Why a separate Docker image

The worker bundles **Chromium + Puppeteer** for headless scraping. That payload is ~700 MB. Keeping it out of the API image means the API container stays small, boots fast on Render, and a scrape OOM doesn't take down user requests.

Both images share the same `backend/` source — the only difference is which entry script they run (`dist/index.js` for API, worker entrypoints for the worker).

---

## Location System

### Three-Tier Cascade Picker

The `LocationCascadePicker` component provides a seamless district → block → panchayat selection for Bihar farmers with full offline support:

1. **Instant local data** — 38 Bihar districts and 250+ blocks load immediately from hardcoded fallback. No spinner on first open.
2. **API upgrade** — When Render is reachable, API data silently replaces local data with the full seeded dataset.
3. **Code normalization** — `normalizeLocalCode()` strips the `BR-` state prefix so that API codes (`BR-PATNA`) and local fallback codes (`patna`) resolve to the same block/panchayat lookup key. No cross-contamination between online and offline modes.
4. **Manual input** — For unsupported states or typo correction; `autoCorrect={false}` prevents iOS from mutating place names.
5. **No premature cascade** — Block row only appears after a district is confirmed. Panchayat row only appears after a block is confirmed. Manual text inputs call `onChange` on `blur`/`submit`, not per keystroke.

### Extending to New States

Add the state code to `SUPPORTED_STATES` in `LocationCascadePicker.tsx`, add a migration seeding its districts/blocks/panchayats following the `BR-*` code pattern, and the picker automatically switches from text input to cascade mode for users in that state.

---

## Design System

MatsyaMitra uses the **"Fishing God v2"** design system — a dark-mode-first glassmorphism + minimalism aesthetic optimized for rural outdoor use.

### Palette

| Token | Dark Mode | Light Mode | Use |
|-------|-----------|------------|-----|
| `primary` | `#4FC3F7` (aqua blue) | `#0277BD` | Brand, CTAs |
| `secondary` | `#80CBC4` (teal) | `#00897B` | Success, active |
| `background` | `#0A1628` (deep navy) | `#F0F4F8` | Page background |
| `surface` | `#0F2040` | `#FFFFFF` | Cards |
| `surfaceAlt` | `#162845` | `#EBF5FB` | Input backgrounds |
| `error` | `#EF5350` | `#C62828` | Alerts, critical |
| `textPrimary` | `#E8F4FD` | `#0D1B2A` | Headings |
| `textSecondary` | `#90CAF9` | `#1565C0` | Body |
| `textMuted` | `#546E7A` | `#78909C` | Labels, hints |

### Key Design Decisions
- **Dark-mode-first** — primary target use is outdoors in bright daylight; dark UI reduces glare
- **Glassmorphism cards** — `surface` with `borderGlass` border and subtle shadows
- **44px minimum touch targets** — all interactive elements meet WCAG touch guidelines
- **Bento grid layout** on home for scannable at-a-glance metrics
- **No emoji as icons** — Ionicons used exclusively throughout

---

## Local Development Setup

### Prerequisites
- **Node.js 22 LTS** (`brew install node@22`) — Node 25/26 has broken module resolution that hangs Metro
- **Docker Desktop** — runs the full backend stack with one command
- **Expo CLI / EAS CLI** — `npm install -g expo-cli eas-cli` (EAS only needed for APK builds)
- macOS: ensure `/Applications/Docker.app/Contents/Resources/bin` is in `PATH` (add to `~/.zshrc`)

### 1. Start the Backend Stack (recommended path)

From the repo root:

```bash
docker compose up -d --build
```

This brings up **4 containers** in one shot:

| Container | Role | Port |
| :--- | :--- | :--- |
| `fishing-god-postgres` | PostgreSQL 15 with PostGIS — auto-runs all 41 migrations on first boot via `docker-entrypoint-initdb.d` mount | 5432 |
| `fishing-god-redis` | Cache + job queue | 6379 |
| `fishing-god-backend` | Express API (multi-stage built from `backend/Dockerfile`) | 3000 |
| `fishing-god-worker` | Puppeteer scraper + cron schedules (`backend/Dockerfile.worker`) | — |

Credentials come from the **root `.env`** — already pre-filled for dev (`DB_USER=fishinggod`, `DB_PASSWORD=aquaculture2024`, dev JWT secrets). No manual setup needed.

**Verify everything is up:**

```bash
docker ps                                       # should list all 4 healthy containers
curl http://localhost:3000/api/v1/species       # should return JSON with 63 species
```

### 2. Mobile (Expo)

```bash
cd mobile
npm install --legacy-peer-deps
./start.sh                                       # auto-detects LAN IP, points app at Docker backend
```

The `start.sh` launcher does three smart things:
- Forces **Node 22 LTS** path (`/opt/homebrew/opt/node@22/bin/node`) to avoid Node 25/26 hangs
- Auto-detects your Mac's en0/en1 IP and exports `EXPO_PUBLIC_DEV_BACKEND_URL=http://<ip>:3000` so the phone hits your local Docker backend
- Supports `--remote` to instead point at the Render production backend
- Supports `--tunnel` (passed straight to Expo) for cross-network testing via ngrok

> **Expo Go works** — the WatermelonDB adapter auto-falls back to LokiJS (in-memory) when the native SQLite bridge is absent. Native build (`expo run:android` / `run:ios`) is only needed for SQLite persistence between launches.

### 3. Dashboard (Next.js — optional)

```bash
cd dashboard
cp .env.local.example .env.local                 # set NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
npm install
npm run dev                                      # → http://localhost:3001
```

Then log in with the dev superadmin seed (see [Government Oversight Dashboard → First Login](#first-login-dev-seed)).

### 4. Manual Backend (without Docker — for IDE debugging)

If you want the backend running directly on the host (e.g. to attach a debugger) while still using the dockerised postgres + redis:

```bash
docker compose up -d postgres redis              # just the data layer
cd backend
cp .env.example .env                             # points at localhost:5432 / :6379
npm install
npm run build
npm run db:migrate
npm run dev                                      # nodemon + ts-node on :3000
```

### Stopping the stack

```bash
docker compose down                              # stop containers (preserves data)
docker compose down -v                           # also wipes the postgres volume (full reset)
```

---

## Containerised Dev Stack (Docker)

The full local platform is reproducible via `docker-compose.yml`. This is the **recommended way to run the backend** in development because it mirrors the Render production environment byte-for-byte.

### Service topology

```
                ┌─────────────────────────────┐
                │   fishing-god-network        │  bridge driver
                │                              │
                │  ┌──────────┐   ┌─────────┐ │
                │  │ postgres │←──│ backend │ │←─── :3000 → host
                │  │  :5432   │   │  :3000  │ │
                │  └──────────┘   └─────────┘ │
                │       ↑              ↑       │
                │       │              │       │
                │  ┌─────────┐   ┌──────────┐ │
                │  │ worker  │   │  redis   │ │←─── :6379 → host
                │  └─────────┘   │  :6379   │ │
                │                └──────────┘ │
                └─────────────────────────────┘
```

### What each layer adds

- **`postgres`** mounts `./backend/migrations` to `/docker-entrypoint-initdb.d` so every SQL file runs alphabetically on a fresh database. Postgres image includes PostGIS for geospatial queries
- **`backend`** depends on postgres `service_healthy` — it won't even attempt to boot until postgres reports ready
- **`worker`** independently bundles Chromium for headless scraping; it's deliberately ~10x larger than `backend` but isolated
- **`redis`** is used by rate limiters and the scrape worker's job queue

### Rebuilding after code changes

```bash
docker compose up -d --build backend             # rebuild only the API image
docker compose up -d --build                     # rebuild API + worker
docker compose build --no-cache backend          # full clean rebuild ignoring layer cache
docker compose logs -f backend                   # tail backend logs while attached
```

### Why this matters

Without Docker, you'd be juggling: a local Postgres install, a Redis install, schema migrations, env files in two places, port collisions with anything else listening on 5432, and Node version skew between dev and Render. With `docker compose up -d` it's one command, every time, reproducible to byte.

---

## Building the APK

MatsyaMitra uses [EAS Build](https://docs.expo.dev/build/introduction/) for production APK generation.

```bash
cd mobile

# Install EAS CLI if needed
npm install -g eas-cli

# Login to your Expo account
eas login

# Build a direct-install APK (not AAB)
eas build --platform android --profile apk
```

When the build completes, EAS provides a download URL for the `.apk` file. The APK:
- Points to `https://fishery-app.onrender.com` via `EXPO_PUBLIC_BACKEND_URL`
- Requires real login (no dev bypass)
- Has `versionCode: 4`, `version: 1.0.0`
- Bundle ID: `com.pranjalupadhyay.matsyamitra`

---

## Environment Variables

### Root (`.env` — consumed by `docker-compose.yml`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | Yes | `development` | Sets Express to dev-mode logging and CORS |
| `DB_USER` | No | `fishinggod` | Postgres superuser |
| `DB_PASSWORD` | Yes | — | Postgres password (dev: `aquaculture2024`) |
| `DB_NAME` | No | `fishing_god` | Database name |
| `JWT_SECRET` | Yes | — | Signing secret for **farmer** JWTs |
| `ADMIN_JWT_SECRET` | Yes | — | Signing secret for **admin / officer** JWTs — must differ from `JWT_SECRET` |
| `REDIS_URL` | No | `redis://redis:6379` | Redis connection inside the docker network |
| `ALLOWED_ORIGINS` | Yes | — | Comma-separated CORS allowlist (e.g. `http://localhost:3001` for the dashboard) |

### Mobile (`mobile/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `EXPO_PUBLIC_BACKEND_URL` | Yes | Backend API base URL (Render in production, `http://<lan-ip>:3000` for local Docker) |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | Yes | Google Maps SDK key for Android — Apple Maps used on iOS, no key needed |
| `EXPO_PUBLIC_DEV_BACKEND_URL` | Auto | Auto-set by `start.sh` to your Mac's LAN IP at launch |

### Backend (`backend/.env` — only needed for non-Docker host runs)

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | `development` or `production` |
| `PORT` | No | HTTP port (default: 3000) |
| `HOST` | No | Bind address (default: 0.0.0.0) |
| `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` | Yes | Postgres connection — set to `localhost:5432` when targeting the dockerised postgres from the host |
| `REDIS_URL` | No | Redis connection string |
| `JWT_SECRET` | Yes | Farmer JWT signing secret |
| `ADMIN_JWT_SECRET` | Yes | Admin JWT signing secret |
| `ALLOWED_ORIGINS` | Yes | CORS allowlist |

### Dashboard (`dashboard/.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_BASE_URL` | Yes | Where the dashboard reaches the backend (default `http://localhost:3000`) |

---

## Database Migrations

Migrations live in `backend/migrations/` and are run automatically on container start via `backend/start.sh`. The runner (`migrate.ts`) processes files alphabetically and tracks applied migrations in the `schema_migrations` table.

| # | Migration | Description |
|---|-----------|-------------|
| 001 | `initial_schema` | Users, ponds, species, market prices core tables |
| 002 | `seed_data` | Initial species and equipment seed data |
| 003 | `expanded_equipment_and_feed` | Additional equipment and feed products |
| 004–005 | `species_update` | 42 species with complete profiles |
| 006–010 | `equipment_images` | Equipment image URLs (open-license sources) |
| 011 | `add_password_to_users` | bcrypt password field |
| 012 | `fix_market_duplicates` | Market price deduplication |
| 013 | `feed_shop_url` + `species_descriptions` | Feed supplier links and species descriptions |
| 014 | `runtime_alignment` | Schema runtime fixes |
| 015 | `knowledge_rules` | Policy and subsidy knowledge rules table |
| 016 | `aquaculture_health_network` + `geographic_zones` | Doctor network + zone mapping |
| 017 | `conservative_economic_models` | Calibrated BCR/profitability model coefficients |
| 018 | `feed_images` | Feed product image URLs |
| 019 | `doctor_routing_profile_location` | Doctor panchayat routing, profile location fields |
| 020 | `bihar_location_hierarchy` + `create_location_hierarchy` | Location tables (loc_states/districts/blocks/panchayats) |
| 021 | `fix_location_code_widths` | Increase VARCHAR widths for longer codes |
| 022 | `seed_pmmsy_knowledge_rules` | PMMSY subsidy rules, NABARD highlights, Bihar benchmarks (22 rules) |
| 023 | `add_disease_image_urls` | Disease clinical image URLs |
| 024 | `seed_bihar_location_data` | Full Bihar seed: 38 districts, 250+ blocks, major panchayats. Creates tables IF NOT EXISTS (handles Render baseline-skip edge case). Idempotent via `ON CONFLICT DO UPDATE` |
| 025–026 | `fix_location_column_names` + `doctor_auth_dashboard` | Doctor-side schema, auth role expansion |
| 027 | `seed_indian_aquaculture_diseases` | Disease library expansion |
| 028–029 | `biofloc_equipment` + `ras_equipment` + `remove_coastal_species` | Catalog expansion |
| 030–032 | `pangasius_enrichment` + `new_species_from_research` + `seed_government_suppliers` | Species + supplier seed |
| 033 | `farmer_notifications` | Farmer notification table |
| 034–035 | `hatchery_core` + `hatchery_stage_logs` | Hatchery operator: facilities, batches, stage logs |
| 036 | `ponds_grow_out_fields` | Pond grow-out lifecycle: stocking + harvest fields |
| 037 | `user_uid_and_hatchery_role` | Adds HATCHERY role + auto-generated `uid` (prefix FM/HC/DR + district + 4 digits) |
| 038 | `marketplace` | Initial marketplace v1: `fingerling_listings`, `fingerling_orders` |
| 039 | `marketplace_v2` | **Marketplace v2:** government UID + contact snapshots on listings, expected_ready_date + last_available_date with auto-expiry, bulk pricing, pickup/delivery flags, reserved + confirmed inventory model, 8 purchase-order statuses + 4 advance-interest statuses, dispute fields, `marketplace_notifications` table |
| 040 | `farmer_profile_and_pond_survey` | **Gov survey Buckets 1 + 2:** 13 new `users` columns (father/husband, Aadhaar, gender, DOB, education, household, experience, occupation, income, KCC/BPL, consent) + 11 new `ponds` columns (ownership, water availability, culture intensity, activity type, 4 survey photos, insurance, flood impact, disease occurrence). All with CHECK enum constraints |
| **041** | **`crop_cycles_and_farm_assets`** | **Gov survey Bucket 3:** `crop_cycles` (per-pond per-season: production, 8 input cost rows, revenue) + `farm_assets` (11 asset types with `GENERATED ALWAYS AS ((cost − salvage) / life) STORED` annual depreciation column). Per-user RLS via WHERE clauses; PATCH uses explicit column allowlist |

### Render Baseline-Skip Fix

On first Render deploy, if core tables (`ponds`, `users`, etc.) already existed, the migration runner would mark **all** migrations as applied without running them — leaving location tables empty. Migration 024 solves this permanently by using `CREATE TABLE IF NOT EXISTS` before all INSERTs, so it is safe to run on any database state.

---

## Project Documentation

In addition to this README, the repository ships a living `documentation/` folder of spec documents that go deeper on specific subsystems:

| Document | Topic |
| :--- | :--- |
| **`ARCHITECTURE_AUDIT.md`** | Why the project moved from an npm Workspaces monorepo to standalone mobile / backend / dashboard projects — Metro hoisting issues, Node 22 LTS pinning, IP-discovery fixes |
| **`DEVELOPER_README.md`** | Current dev status, known gaps, roadmap items, and TODOs not yet tracked elsewhere |
| **`ECONOMICS_MATH.md`** | The maths behind the ROI Simulator — CAPEX/OPEX line items, BCR formula, break-even quantity derivation, scenario calibration coefficients |
| **`YOJANA_INTEGRATION_PLAN.md`** | The PMMSY scheme catalog integration spec — application lifecycle, DLC escalation, milestone proof requirements |
| **`MatsyaMitra_Hatchery_Feature_Implementation.md`** | The hatchery marketplace v2 feature build plan — listing lifecycle, order state machine, dispute taxonomy |
| **`AGENTS.md`** | AI agent prompts and operating guidance used during development |
| **`SECURITY.md`** | Platform-wide security posture (mobile + backend); see also `dashboard/SECURITY.md` for the admin-side document |
| **`backend/MARKET_DATA_STRATEGY.md`** | AGMARKNET + FMPIS scraping strategy, fallback chains, data quality guarantees |
| **`mobile/METRO_HANG_RESOLUTION.md`** | Field log of every Metro / Node / Expo hang we've hit and how we fixed it |
| **`mobile/TESTFLIGHT_SETUP.md`** | iOS build and TestFlight workflow |
| **`dashboard/README.md`** | Dashboard quick-start (matches the section above) |
| **`dashboard/SECURITY.md`** | Dashboard threat model, lockout policy, password policy, deployment checklist |

---

## Changelog

### v2.0.0 — Current (June 2026)

#### Hatchery Marketplace v2 (Migration 039 + `routes/marketplace.ts` rewrite)

A full-spec rewrite of the marketplace layer connecting hatcheries and farmers.

**Listings**
- New columns on `fingerling_listings`: government UID snapshot, contact/email/UPI snapshots, district/block/panchayat snapshots, geo lat/lng, size description, bulk price + threshold, expected ready date, last available date, pickup_available, delivery_available, logistics notes, reserved_quantity, confirmed_quantity
- Status enum expanded: `DRAFT / UPCOMING / AVAILABLE / CLOSED / EXPIRED`
- Auto-expiry runs lazily on every browse/detail read (no scheduler infra needed)

**Orders**
- New columns: order_type (PURCHASE_ORDER / ADVANCE_INTEREST), price snapshot, bulk_price_applied, logistics_preference, preferred_date, payment_screenshot_url, dispute fields, interest_converted_to FK
- Purchase-order status enum expanded to 8 values; advance-interest enum adds 4 more
- New: `marketplace_notifications` table with `recipient_id`, `type`, `listing_id`/`order_id` FKs

**Hatchery profile gating**
- `GET/PATCH /api/v1/hatcheries/me-profile` endpoints
- Listing creation refuses without `hatchery_uid` + `contact_number` — forces hatcheries to complete profile first
- `AddHatcheryScreen` becomes dual-mode (create OR edit)

**Mobile screens** — full rewrites of:
- `MarketListingsScreen` (browse with UPCOMING toggle)
- `ListingDetailScreen` (purchase or interest based on status)
- `MyOrdersScreen` (7 status tabs + payment flow + interest conversion + dispute modal)
- `ManageListingsScreen` (4 status tabs + publish/close/delete)
- `IncomingOrdersScreen` (accept/reject/confirm/fulfill/dispute + interest acknowledge/decline)
- `CreateListingScreen` (gated by profile completeness)
- Inline dispute UI as bottom-sheet modal (5 reasons)

#### Government Survey Compliance — Bucket 1 (Migration 040)

`PersonalInfoScreen` extended with Section A fields:
- Father / husband name, Aadhaar (12-digit validated), gender, **DOB via reusable `CalendarPickerModal`** with year-jump arrows
- Education level (6-step enum), household size, years of farming experience
- Primary occupation (7 enum values), annual income range (5 brackets)
- KCC holder, BPL holder, consent toggle with server-side timestamp

Backend `auth.ts` profile update uses `COALESCE($N, existing_column)` so missing fields preserve their value. Consent timestamp recorded only on first true flip.

#### Government Survey Compliance — Bucket 2 (Migration 040 cont'd)

`AddEditPondScreen` extended with Section B/D/F fields:
- Pond ownership (Owned / Leased / Shared / Government)
- Water availability (Seasonal / Perennial)
- Culture intensity (Extensive / Semi-intensive / Intensive)
- Pond activity (Nursery / Rearing / Grow-out / Broodstock / Mixed)
- 4 survey photo slots (Wide / Embankment / Close / Farmer-with-pond)
- Risk: insurance Y/N, flood impact last 3yrs Y/N, disease occurrence (None/Minor/Major)

WatermelonDB schema bumped to **v5** with additive migration adding the 11 new pond columns. Pond model extended with typed enums (`OwnershipType`, `WaterAvailability`, `CultureSystemCategory`, `PondActivityType`, `DiseaseOccurrence`).

#### Government Survey Compliance — Bucket 3 (Migration 041)

Two new tables + screens for cycle-based survey data:

**`crop_cycles`** (per-pond, per-season)
- Cycle name, species, start/end dates, status (Ongoing/Harvested/Cancelled)
- Present production + total production (kg)
- Full 8-row input cost breakdown: Feed-Formulated, Feed-Homemade, Probiotic, Medicine, Electricity, Labour-Hired, Labour-Family, Other
- Revenue + auto-computed profit display

**`farm_assets`** (per-farmer, optional pond link)
- 11 asset types
- Cost / economic life / salvage value
- `annual_depreciation_inr NUMERIC GENERATED ALWAYS AS (ROUND((cost - salvage) / NULLIF(life, 0), 2)) STORED` — Postgres computes, mobile mirrors for live preview only
- Summary strip: total assets, total cost, total annual depreciation

**Reusable `CalendarPickerModal`** component extracted — bottom-sheet calendar with year-jump arrows, used by DOB, cycle dates, and asset purchase dates.

**Navigation entry points:**
- From any existing pond's edit screen → "Crop Cycles" + "Pond Assets" nav cards
- From Home screen → "Farm Assets" quick action tile

**Bucket 4 (Surveyor remarks/signature) intentionally skipped** — those fields belong on a future government officer portal, not the farmer app.

#### Other Improvements
- `app.json`: removed `experiments.baseUrl` that was leaking into Metro bundle URL (broke Expo Go loading)
- `app.json`: added `"checkAutomatically": "ON_ERROR_RECOVERY"` to updates config so `expo start` doesn't block on EAS server pings
- `LocationCascadePicker`: panchayat manual entry moved inside the modal (was floating below cascade row, confusing users)
- Filter chip rendering: added `alignSelf: 'flex-start'` to MyOrders/MarketListings/etc. so chips hug their text instead of stretching
- DB migration 040: all new CHECK enum constraints wrapped in `IF NOT EXISTS` `DO $$` blocks for idempotency
- Backend dynamic PATCH operations use explicit allowlist column maps — no string interpolation, SQL-injection safe

---

### v1.0.0 — May 2026

#### App Rename & Branding
- **Renamed:** "Fishing God" → **"MatsyaMitra"** across all user-visible surfaces
- Updated `app.json`: name, slug, bundle ID (`com.pranjalupadhyay.matsyamitra`), Android package
- Updated Home screen brand text, Auth screen, i18n locale strings
- Internal AsyncStorage keys and DB name retain `fishing_god_*` prefix to avoid breaking existing installs

#### Location Cascade Picker (Major Rewrite)
- Full `District → Block → Panchayat` cascade with modal search
- 38 Bihar districts hardcoded as instant offline fallback
- 250+ Bihar blocks per district hardcoded
- Major panchayats per block hardcoded
- API used as optional upgrade (does not block UI)
- `normalizeLocalCode()` added: strips `BR-` prefix so API codes and local codes resolve identically in block/panchayat lookup tables
- `autoCorrect={false}` on all text inputs — prevents iOS autocorrect from mutating place names (e.g., "Patna" → "Parma")
- Manual text inputs fire `onChange` only on `blur`/`submit`, not per keystroke — prevents premature cascade triggers
- Spinner (`loading` prop) only shown when `loadingBlocks && blocks.length === 0` — suppressed when local fallback is already loaded

#### Production Auth
- `DEV_SKIP_AUTH` set to `false` — real login required in APK
- "Skip Login (Dev Mode)" button removed from AuthScreen

#### Backend — Bihar Location Data (Migration 024)
- Added `024_seed_bihar_location_data.sql`
- All 4 location tables created with `IF NOT EXISTS` (Render baseline-skip safe)
- 38 Bihar districts seeded (`BR-PATNA`, `BR-MUZAFFARPUR`, …)
- 250+ blocks seeded (`BR-PATNA-SADAR`, `BR-PATNA-DANAPUR`, …)
- 200+ panchayats for major blocks seeded
- All INSERTs idempotent via `ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name`

#### Home Screen
- Bento grid with active pond count + critical alert count
- Harvest Countdown horizontal card strip for active ponds
- Weather Card for district conditions
- 8 Quick Actions grid
- Notification bell with unread badge dot

#### EconomicsScreen
- **Auto Locate button** in Location & Scale section header
- Loads farmer profile location first; falls back to GPS reverse geocode
- `expo-location` integration with foreground permission request

#### ProfileScreen
- `SwitchRow` changed to `TouchableOpacity` (full row tap area)
- Fixed `height: 56` for consistent row height
- `Switch` given `alignSelf: 'center'` — vertically centered in row

#### PersonalInfoScreen
- `textInput` style: explicit `height: 44`, `paddingVertical: 0` — fixes iOS touch target issue that made the name field appear non-typable
- `inputRow` height fixed to `52`
- Font size increased for readability

#### Disease Intelligence (DiseaseListScreen + DiseaseDetailScreen)
- Searchable disease library
- Clinical images with fallback placeholder
- Severity indicators and treatment protocol cards

#### Doctor Network
- Panchayat-based routing with block/district fallback
- Doctor card with contact info and booking CTA

#### Learning Center
- Accordion-style modules (replaces nested ScrollView approach)
- Covers beginner guides, business concepts, water management

#### Feed Catalog
- Icon-based card grid (no broken remote images)
- Feed type, protein content, target species, price range

#### Design System — "Fishing God v2 / MatsyaMitra"
- Dark-mode-first glassmorphism + minimalism
- Full light mode support
- Consistent token-based palette across all 22 screens
- 44px minimum touch targets throughout
- Ionicons used exclusively (no emoji icons)

---

## For Developers

- **`documentation/DEVELOPER_README.md`** — development status, known gaps, and roadmap
- **`documentation/ARCHITECTURE_AUDIT.md`** — monorepo → standalone migration rationale
- **`documentation/ECONOMICS_MATH.md`** — economic formulas, BCR assumptions, and calculations
- **`documentation/YOJANA_INTEGRATION_PLAN.md`** — scheme catalog spec
- **`documentation/SECURITY.md`** + **`dashboard/SECURITY.md`** — security posture
- **`mobile/TESTFLIGHT_SETUP.md`** — iOS build and TestFlight workflow
- **`mobile/METRO_HANG_RESOLUTION.md`** — Metro / Node / Expo troubleshooting log
- **`backend/MARKET_DATA_STRATEGY.md`** — AGMARKNET + FMPIS scrape pipeline

---

## License

MIT
