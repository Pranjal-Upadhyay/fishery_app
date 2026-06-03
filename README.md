# MatsyaMitra — Aquaculture Intelligence Platform

**MatsyaMitra** (मत्स्यमित्र — "Friend of Fish") is an offline-first mobile app built specifically for Indian fish and shrimp farmers. It empowers farmers to make smarter decisions about species selection, pond management, government subsidies, and market timing — all without requiring constant internet connectivity.

Designed for Bihar and expanding to all Indian states, MatsyaMitra bridges the gap between rural aquaculture farmers and the expert knowledge, government schemes, and market intelligence they need to run profitable operations.

---

## Table of Contents

- [Why MatsyaMitra](#why-matsyamitra)
- [Features](#features)
- [Hatchery Marketplace](#hatchery-marketplace)
- [Government Survey Compliance](#government-survey-compliance)
- [Screens](#screens)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Backend & Database](#backend--database)
- [Location System](#location-system)
- [Design System](#design-system)
- [Local Development Setup](#local-development-setup)
- [Building the APK](#building-the-apk)
- [Environment Variables](#environment-variables)
- [Database Migrations](#database-migrations)
- [Changelog](#changelog)

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
├── mobile/                   # React Native (Expo) app
│   ├── app.json              # Expo config — name: MatsyaMitra, slug: matsyamitra
│   ├── eas.json              # EAS Build profiles (development, preview, apk, production)
│   ├── .env                  # EXPO_PUBLIC_BACKEND_URL=https://fishery-app.onrender.com
│   └── src/
│       ├── screens/          # 30+ screens (Farmer + Hatchery + Doctor)
│       ├── components/       # Shared components (LocationCascadePicker, WeatherCard, …)
│       ├── services/         # apiService.ts (axios), authService.ts, locationService
│       ├── database/         # WatermelonDB schema, adapter (SQLite native / LokiJS web)
│       ├── utils/            # speciesLookup, notificationCenter, feedImages
│       ├── i18n/             # i18next — en.json, hi.json
│       ├── ThemeContext.tsx   # Dark/light mode context
│       └── AuthContext.tsx   # JWT auth state (DEV_SKIP_AUTH = false for production)
│
└── backend/                  # Node.js / Express / TypeScript API
    ├── Dockerfile            # Multi-stage build → runs migrate then server
    ├── start.sh              # Entrypoint: runs migrations then starts API
    ├── src/
    │   ├── routes/           # REST routes: species, ponds, market, locations, doctors, …
    │   ├── scripts/
    │   │   ├── migrate.ts    # Migration runner (reads migrations/ alphabetically)
    │   │   └── seed.ts       # Seed helpers
    │   └── index.ts          # Express app entry
    └── migrations/           # 41+ SQL migration files (001–041)
```

### Offline-First Data Flow

```
User Action
    │
    ▼
WatermelonDB (SQLite on device)   ←──── reads/writes always work offline
    │
    │  (when network available)
    ▼
Render.com API (PostgreSQL)       ←──── sync, location lookup, market data
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
| Runtime | Node.js + TypeScript |
| Framework | Express 4 |
| Database | PostgreSQL 15 (Render managed) |
| Auth | JWT (jsonwebtoken) + bcrypt |
| Rate Limiting | express-rate-limit |
| Security | helmet (HTTP headers) |
| Cron | node-cron (market price refresh) |
| Logging | Winston |
| Hosting | Render.com (Docker container) |

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
- Node.js 20+
- Docker + Docker Compose
- Expo CLI (`npm install -g expo-cli`)
- EAS CLI (`npm install -g eas-cli`) — for APK builds only

### 1. Start Infrastructure

```bash
docker compose up -d postgres redis
```

### 2. Backend

```bash
cd backend
cp .env.example .env           # set DATABASE_URL, JWT_SECRET
npm install
npm run build
npm run migrate                # runs all 24 migrations
npm run dev                    # starts on :3000
```

### 3. Mobile

```bash
cd mobile
cp .env.example .env           # set EXPO_PUBLIC_BACKEND_URL
npm install
npx expo run:android           # native build (required for WatermelonDB)
# or
npx expo run:ios
```

> **Important:** `npx expo start` (Expo Go) does **not** work — WatermelonDB requires a native build. Always use `expo run:android` or `expo run:ios`.

### 4. Backend .env variables

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fishery_db
JWT_SECRET=your-secret-key
PORT=3000
REDIS_URL=redis://localhost:6379
```

### 5. Mobile .env variables

```env
EXPO_PUBLIC_BACKEND_URL=https://fishery-app.onrender.com
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-key
```

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

### Mobile (`mobile/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `EXPO_PUBLIC_BACKEND_URL` | Yes | Backend API base URL (Render in production) |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | Yes | Google Maps SDK key for Android |

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Secret for signing JWT tokens |
| `PORT` | No | HTTP port (default: 3000) |
| `REDIS_URL` | No | Redis for caching (optional) |

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

- **`DEVELOPER_README.md`** — development status, known gaps, and roadmap
- **`mobile/TESTFLIGHT_SETUP.md`** — iOS build and TestFlight workflow
- **`backend/MARKET_DATA_STRATEGY.md`** — market data pipeline and sourcing
- **`ECONOMICS_MATH.md`** — economic formulas, BCR assumptions, and calculations

---

## License

MIT
