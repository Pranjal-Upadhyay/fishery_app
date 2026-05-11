# MatsyaMitra — Aquaculture Intelligence Platform

**MatsyaMitra** (मत्स्यमित्र — "Friend of Fish") is an offline-first mobile app built specifically for Indian fish and shrimp farmers. It empowers farmers to make smarter decisions about species selection, pond management, government subsidies, and market timing — all without requiring constant internet connectivity.

Designed for Bihar and expanding to all Indian states, MatsyaMitra bridges the gap between rural aquaculture farmers and the expert knowledge, government schemes, and market intelligence they need to run profitable operations.

---

## Table of Contents

- [Why MatsyaMitra](#why-matsyamitra)
- [Features](#features)
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

### 🔔 Notification Center
- In-app notification feed
- Unread count badge on home screen bell
- Mark-as-read tracking via AsyncStorage

### 🗺️ Map View
- Pond location plotting on Google Maps (Android) / Apple Maps (iOS)
- GPS coordinate capture when adding ponds

### 👤 Profile & Settings
- Personal info: name, phone, farmer category, home location
- Language toggle (English / Hindi)
- Dark / Light mode toggle
- Notification preferences
- All toggles vertically centered and full-row tappable

---

## Screens

| Screen | Route Name |
|--------|-----------|
| Auth (Login / Register) | `Auth` |
| Home Dashboard | `Home` |
| Ponds List | `PondsList` |
| Add / Edit Pond | `AddEditPond` |
| Species Browser | `Species` |
| Species Detail | `SpeciesDetail` |
| Economics / ROI | `Economics` |
| Economics Result | `EconomicsResult` |
| Policy Guidance | `PolicyGuidance` |
| Water Quality | `WaterQuality` |
| Market Prices | `MarketPrices` |
| Disease List | `DiseaseList` |
| Disease Detail | `DiseaseDetail` |
| Doctor Network | `DoctorNetwork` |
| Equipment Catalog | `EquipmentCatalog` |
| Feed Catalog | `FeedCatalog` |
| Learning Center | `LearningCenter` |
| Map | `Map` |
| Notifications | `Notifications` |
| Personal Info | `PersonalInfo` |
| Profile & Settings | `Profile` |

---

## Architecture

```
fishery_app/
├── mobile/                   # React Native (Expo) app
│   ├── app.json              # Expo config — name: MatsyaMitra, slug: matsyamitra
│   ├── eas.json              # EAS Build profiles (development, preview, apk, production)
│   ├── .env                  # EXPO_PUBLIC_BACKEND_URL=https://fishery-app.onrender.com
│   └── src/
│       ├── screens/          # 22 screens
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
    └── migrations/           # 24 SQL migration files (001–024)
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
GET  /api/v1/species                          All species
GET  /api/v1/species/:id                      Species detail

GET  /api/v1/locations/districts?stateCode=BR  Bihar districts (38)
GET  /api/v1/locations/blocks?districtCode=BR-PATNA  Blocks for district
GET  /api/v1/locations/panchayats?blockCode=BR-PATNA-SADAR  Panchayats

GET  /api/v1/market-prices                    Current prices by state
GET  /api/v1/knowledge-rules                  Subsidy/policy rules
GET  /api/v1/diseases                         Disease library

POST /api/v1/auth/register                    New user registration
POST /api/v1/auth/login                       Login → JWT token

GET  /api/v1/doctors                          Doctor list (filtered by panchayat)
POST /api/v1/doctors/mapping                  Assign doctor to farmer
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
| **024** | **`seed_bihar_location_data`** | **Full Bihar seed: 38 districts, 250+ blocks, major panchayats. Creates tables IF NOT EXISTS (handles Render baseline-skip edge case). Idempotent via `ON CONFLICT DO UPDATE`.** |

### Render Baseline-Skip Fix

On first Render deploy, if core tables (`ponds`, `users`, etc.) already existed, the migration runner would mark **all** migrations as applied without running them — leaving location tables empty. Migration 024 solves this permanently by using `CREATE TABLE IF NOT EXISTS` before all INSERTs, so it is safe to run on any database state.

---

## Changelog

### v1.0.0 — Current (May 2026)

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
