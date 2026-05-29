# MatsyaMitra — Hatchery Tracking Feature: Full Implementation Guide

**For:** Gates Foundation Integration  
**Version:** 1.0 — May 2026  
**Scope:** Biological reference + database migrations + backend routes + mobile screens + notifications + sales calculator

---

## Part 1 — Validated Biological Timeline (Corrected & Combined)

| Stage | Duration | Size transition | Key note |
|---|---|---|---|
| Broodstock conditioning | 3 months | Mature adults 2–4 yr | Male/female separated, high-protein feed |
| Induced spawning | 4–18 hrs to release | — | Ovaprim/HCG primary + secondary dose |
| Hatching | 15–27 hrs post-fertilisation | Larval hatchling ~2 mm | 26–31°C required |
| Yolk-sac absorption | 72–96 hrs (3–4 days) | 2 mm → 5–6 mm spawn | No external feed; starvation risk after |
| Nursery pond | 15–25 days | 5–6 mm → 25–30 mm fry | 3–5M spawn/ha; zooplankton + rice bran feed |
| Rearing pond | 60–90 days | 25 mm → 100–150 mm fingerling | 8–15 g; survival 70–80% |
| **Total hatch→fingerling** | **≈ 99 days typical** | | Notification trigger: Day 89 (10 days before) |
| Grow-out pond | 6–12 months | 10 g → 500 g–1.2 kg | Polyculture; Jayanti Rohu 2 months faster |

**Correction note:** The "72 hours" is the yolk-sac absorption window AFTER hatching — not the spawning duration. Spawning itself occurs within 4–6 hours of the second hormone dose.

**Enhanced strains advantage (Jayanti Rohu, Amrita Katla):**
- 17–19% higher growth rate per generation
- Reach market weight ~2 months faster than standard stock
- Innate resistance to Aeromoniasis (Aeromonas hydrophila)

---

## Part 2 — New User Roles

Add a `user_type` field to the existing `users` table:

```sql
-- Migration 025_user_type.sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS user_type TEXT
  CHECK (user_type IN ('farmer', 'hatchery_operator', 'admin'))
  DEFAULT 'farmer';

ALTER TABLE users ADD COLUMN IF NOT EXISTS affiliated_hatchery_id UUID;
```

| Role | Access |
|---|---|
| `farmer` | Existing screens + Grow-out start log + Marketplace browse |
| `hatchery_operator` | Hatchery dashboard + Batch management + Sales recording |
| `admin` (Gates Foundation) | Cross-hatchery analytics + All notifications |

---

## Part 3 — Database Migrations

### Migration 025 — `hatchery_core`

```sql
-- 025_hatchery_core.sql

CREATE TABLE IF NOT EXISTS hatcheries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  operator_id     UUID REFERENCES users(id),
  district        TEXT,
  block           TEXT,
  panchayat       TEXT,
  location_code   TEXT,               -- BR-PATNA-SADAR format
  capacity_kg     NUMERIC,
  license_number  TEXT,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hatchery_batches (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hatchery_id             UUID REFERENCES hatcheries(id) ON DELETE CASCADE,
  batch_number            TEXT NOT NULL,              -- e.g. HB-2026-001
  species_id              UUID REFERENCES species(id),
  species_variant         TEXT,                       -- 'Jayanti Rohu' | 'Amrita Katla' | 'Standard'
  broodstock_male_count   INT,
  broodstock_female_count INT,
  broodstock_total_kg     NUMERIC,
  spawning_date           TIMESTAMPTZ,               -- Stage 2 start (hormone injection)
  hatching_date           TIMESTAMPTZ,               -- Stage 3 start
  nursery_stock_date      TIMESTAMPTZ,               -- Stage 4 start
  rearing_stock_date      TIMESTAMPTZ,               -- Stage 5 start
  estimated_fingerling_date DATE,                    -- auto-calc: rearing_stock_date + 75 days
  current_stage           TEXT CHECK (current_stage IN (
    'broodstock','spawning','hatching','yolk_absorption',
    'nursery','rearing','fingerling_ready','sold','cancelled'
  )) DEFAULT 'broodstock',
  estimated_spawn_count   BIGINT,                    -- in individual units
  estimated_fry_count     BIGINT,
  estimated_fingerling_count BIGINT,
  avg_fingerling_weight_g NUMERIC DEFAULT 12,        -- default 12g; updated after sampling
  notes                   TEXT,
  created_by              UUID REFERENCES users(id),
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hatchery_stage_benchmarks (
  stage           TEXT PRIMARY KEY,
  min_days        INT,
  max_days        INT,
  typical_days    INT,
  description     TEXT
);

INSERT INTO hatchery_stage_benchmarks VALUES
  ('spawning',          0,  1,  0,  'Hormone injection to egg release (4-18 hours)'),
  ('hatching',          1,  2,  1,  'Fertilisation to hatch (15-27 hours)'),
  ('yolk_absorption',   3,  4,  3,  'Sac fry yolk absorption — no external feed'),
  ('nursery',          15, 25, 21,  'Spawn to fry in nursery pond'),
  ('rearing',          60, 90, 75,  'Fry to fingerling in rearing pond')
ON CONFLICT (stage) DO UPDATE SET
  typical_days = EXCLUDED.typical_days,
  description  = EXCLUDED.description;
```

### Migration 026 — `hatchery_stage_logs`

```sql
-- 026_hatchery_stage_logs.sql

CREATE TABLE IF NOT EXISTS hatchery_stage_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id          UUID REFERENCES hatchery_batches(id) ON DELETE CASCADE,
  stage             TEXT NOT NULL,
  started_at        TIMESTAMPTZ NOT NULL,
  ended_at          TIMESTAMPTZ,                  -- null = currently in this stage
  count_at_entry    BIGINT,
  count_at_exit     BIGINT,
  survival_rate_pct NUMERIC GENERATED ALWAYS AS (
    CASE WHEN count_at_entry > 0 AND count_at_exit IS NOT NULL
    THEN ROUND((count_at_exit::NUMERIC / count_at_entry) * 100, 1)
    ELSE NULL END
  ) STORED,
  water_temp_c      NUMERIC,
  ph                NUMERIC,
  do_mgl            NUMERIC,
  ammonia_ppm       NUMERIC,
  nitrite_ppm       NUMERIC,
  feed_given_kg     NUMERIC,
  observations      TEXT,
  logged_by         UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
```

### Migration 027 — `fingerling_transactions`

```sql
-- 027_fingerling_transactions.sql

CREATE TABLE IF NOT EXISTS fingerling_sales (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id            UUID REFERENCES hatchery_batches(id),
  seller_hatchery_id  UUID REFERENCES hatcheries(id),
  buyer_user_id       UUID REFERENCES users(id),       -- null if walk-in buyer
  buyer_name          TEXT,
  buyer_phone         TEXT,
  buyer_district      TEXT,
  sale_date           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  pricing_model       TEXT CHECK (pricing_model IN ('per_piece','per_kg')) NOT NULL,
  quantity_pieces     INT,
  quantity_kg         NUMERIC,
  avg_weight_g        NUMERIC NOT NULL,               -- REQUIRED for conversion
  price_per_piece     NUMERIC,
  price_per_kg        NUMERIC,
  total_amount        NUMERIC,
  delivery_date       TIMESTAMPTZ,
  transaction_ref     TEXT UNIQUE,                    -- for QR code lookup
  status              TEXT CHECK (status IN ('pending','delivered','cancelled'))
                      DEFAULT 'pending',
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS grow_out_start_logs (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id                 UUID REFERENCES fingerling_sales(id),
  farmer_user_id          UUID REFERENCES users(id),
  pond_id                 UUID REFERENCES ponds(id),  -- links to existing ponds table
  received_date           DATE NOT NULL,
  stocked_date            DATE NOT NULL,              -- when placed in grow-out pond
  fingerling_count        INT,
  fingerling_avg_weight_g NUMERIC,
  expected_harvest_date   DATE,                       -- stocked_date + species benchmark
  actual_harvest_date     DATE,
  harvest_weight_kg       NUMERIC,
  notes                   TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Part 4 — Backend API Routes

Add these files to `backend/src/routes/`:

### `hatcheries.ts`

```typescript
// backend/src/routes/hatcheries.ts
import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import pool from '../db';

const router = Router();

// GET /api/v1/hatcheries — list (admin sees all, operator sees own)
router.get('/', authenticateToken, async (req, res) => {
  const { user } = req as any;
  const query = user.user_type === 'admin'
    ? 'SELECT * FROM hatcheries WHERE is_active = true ORDER BY created_at DESC'
    : 'SELECT * FROM hatcheries WHERE operator_id = $1 AND is_active = true';
  const params = user.user_type === 'admin' ? [] : [user.id];
  const { rows } = await pool.query(query, params);
  res.json(rows);
});

// GET /api/v1/hatcheries/:id/batches
router.get('/:id/batches', authenticateToken, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT b.*, s.name as species_name
     FROM hatchery_batches b
     LEFT JOIN species s ON b.species_id = s.id
     WHERE b.hatchery_id = $1
     ORDER BY b.created_at DESC`,
    [req.params.id]
  );
  res.json(rows);
});

// POST /api/v1/hatcheries/:id/batches — create batch
router.post('/:id/batches', authenticateToken, async (req, res) => {
  const {
    batch_number, species_id, species_variant,
    broodstock_male_count, broodstock_female_count,
    broodstock_total_kg, spawning_date, notes
  } = req.body;

  // Auto-calculate estimated fingerling date: spawning + 1 (hatch) + 3 (yolk) + 21 (nursery) + 75 (rearing)
  const spawnDate = new Date(spawning_date);
  const estDate = new Date(spawnDate);
  estDate.setDate(estDate.getDate() + 100); // 1+3+21+75

  const { rows } = await pool.query(
    `INSERT INTO hatchery_batches
     (hatchery_id, batch_number, species_id, species_variant,
      broodstock_male_count, broodstock_female_count, broodstock_total_kg,
      spawning_date, estimated_fingerling_date, current_stage, notes, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'spawning',$10,$11)
     RETURNING *`,
    [req.params.id, batch_number, species_id, species_variant,
     broodstock_male_count, broodstock_female_count, broodstock_total_kg,
     spawning_date, estDate.toISOString().split('T')[0], notes, (req as any).user.id]
  );
  res.status(201).json(rows[0]);
});

// PATCH /api/v1/hatcheries/batches/:batchId/stage — advance stage
router.patch('/batches/:batchId/stage', authenticateToken, async (req, res) => {
  const { new_stage, count_at_entry, observations } = req.body;
  const { batchId } = req.params;

  await pool.query(
    `UPDATE hatchery_stage_logs SET ended_at = NOW()
     WHERE batch_id = $1 AND ended_at IS NULL`,
    [batchId]
  );
  await pool.query(
    `INSERT INTO hatchery_stage_logs (batch_id, stage, started_at, count_at_entry, observations, logged_by)
     VALUES ($1, $2, NOW(), $3, $4, $5)`,
    [batchId, new_stage, count_at_entry, observations, (req as any).user.id]
  );
  const { rows } = await pool.query(
    `UPDATE hatchery_batches SET current_stage = $1, updated_at = NOW()
     WHERE id = $2 RETURNING *`,
    [new_stage, batchId]
  );
  res.json(rows[0]);
});

// POST /api/v1/hatcheries/sales — record fingerling sale
router.post('/sales', authenticateToken, async (req, res) => {
  const {
    batch_id, buyer_user_id, buyer_name, buyer_phone, buyer_district,
    pricing_model, quantity_pieces, quantity_kg, avg_weight_g,
    price_per_piece, price_per_kg, total_amount, delivery_date, notes
  } = req.body;

  const txRef = `TXN-${Date.now()}-${Math.random().toString(36).slice(2,7).toUpperCase()}`;
  const hatchery = await pool.query(
    'SELECT hatchery_id FROM hatchery_batches WHERE id = $1', [batch_id]
  );

  const { rows } = await pool.query(
    `INSERT INTO fingerling_sales
     (batch_id, seller_hatchery_id, buyer_user_id, buyer_name, buyer_phone,
      buyer_district, pricing_model, quantity_pieces, quantity_kg, avg_weight_g,
      price_per_piece, price_per_kg, total_amount, delivery_date,
      transaction_ref, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
     RETURNING *`,
    [batch_id, hatchery.rows[0]?.hatchery_id, buyer_user_id, buyer_name,
     buyer_phone, buyer_district, pricing_model, quantity_pieces, quantity_kg,
     avg_weight_g, price_per_piece, price_per_kg, total_amount, delivery_date,
     txRef, notes]
  );
  await pool.query(
    `UPDATE hatchery_batches SET current_stage = 'sold', updated_at = NOW() WHERE id = $1`,
    [batch_id]
  );
  res.status(201).json(rows[0]);
});

// GET /api/v1/hatcheries/sales/:txRef — buyer looks up transaction by QR code
router.get('/sales/:txRef', authenticateToken, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT fs.*, b.species_variant, b.batch_number, s.name as species_name
     FROM fingerling_sales fs
     JOIN hatchery_batches b ON fs.batch_id = b.id
     JOIN species s ON b.species_id = s.id
     WHERE fs.transaction_ref = $1`,
    [req.params.txRef]
  );
  if (!rows.length) return res.status(404).json({ error: 'Transaction not found' });
  res.json(rows[0]);
});

// POST /api/v1/hatcheries/grow-out — buyer logs stocking
router.post('/grow-out', authenticateToken, async (req, res) => {
  const {
    sale_id, pond_id, received_date, stocked_date,
    fingerling_count, fingerling_avg_weight_g, notes
  } = req.body;

  const sale = await pool.query(
    `SELECT b.species_id FROM fingerling_sales fs
     JOIN hatchery_batches b ON fs.batch_id = b.id WHERE fs.id = $1`,
    [sale_id]
  );
  // Grow-out: 10 months typical for IMC
  const stockedDt = new Date(stocked_date);
  stockedDt.setMonth(stockedDt.getMonth() + 10);
  const expectedHarvest = stockedDt.toISOString().split('T')[0];

  const { rows } = await pool.query(
    `INSERT INTO grow_out_start_logs
     (sale_id, farmer_user_id, pond_id, received_date, stocked_date,
      fingerling_count, fingerling_avg_weight_g, expected_harvest_date, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [sale_id, (req as any).user.id, pond_id, received_date, stocked_date,
     fingerling_count, fingerling_avg_weight_g, expectedHarvest, notes]
  );
  // Update pond with harvest date so Home dashboard Harvest Countdown works
  await pool.query(
    `UPDATE ponds SET expected_harvest_date = $1 WHERE id = $2`,
    [expectedHarvest, pond_id]
  );
  res.status(201).json(rows[0]);
});

export default router;
```

Register in `backend/src/index.ts`:
```typescript
import hatcheriesRouter from './routes/hatcheries';
app.use('/api/v1/hatcheries', hatcheriesRouter);
```

---

## Part 5 — Notification Cron Job

```typescript
// backend/src/cron/hatcheryNotifications.ts
import cron from 'node-cron';
import pool from '../db';

function daysBetween(date1: Date, date2: Date): number {
  return Math.floor((date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24));
}

export function startHatcheryCron() {
  // Run every day at 6:00 AM IST
  cron.schedule('0 0 30 6 * * *', async () => {
    const now = new Date();

    // Find all batches currently in rearing stage
    const { rows: batches } = await pool.query(`
      SELECT b.*, sl.started_at as rearing_started,
             h.name as hatchery_name,
             u.phone as operator_phone,
             u.id as operator_id
      FROM hatchery_batches b
      JOIN hatcheries h ON b.hatchery_id = h.id
      JOIN users u ON h.operator_id = u.id
      JOIN hatchery_stage_logs sl ON sl.batch_id = b.id
      WHERE b.current_stage = 'rearing'
        AND sl.stage = 'rearing'
        AND sl.ended_at IS NULL
    `);

    for (const batch of batches) {
      const daysInRearing = daysBetween(new Date(batch.rearing_started), now);

      let message: string | null = null;

      if (daysInRearing === 45) {
        message = `Batch ${batch.batch_number} is at Day 45 of rearing (50%). Begin identifying buyers now.`;
      } else if (daysInRearing === 60) {
        message = `Batch ${batch.batch_number} fingerlings ready in ~15 days. List on MatsyaMitra marketplace.`;
      } else if (daysInRearing === 75 - 10) {
        message = `URGENT: Batch ${batch.batch_number} is 10 days from fingerling stage. Confirm average weight via sampling and contact buyers immediately.`;
      } else if (batch.estimated_fingerling_date) {
        const daysToReady = daysBetween(now, new Date(batch.estimated_fingerling_date));
        if (daysToReady === 0) {
          message = `Batch ${batch.batch_number} has reached fingerling stage. Record your sale now.`;
        }
      }

      if (message) {
        await pool.query(
          `INSERT INTO notifications (user_id, title, body, type, reference_id, reference_type)
           VALUES ($1, $2, $3, 'hatchery_alert', $4, 'hatchery_batch')`,
          [batch.operator_id, 'Hatchery Alert', message, batch.id]
        );
        // Also notify Gates Foundation admin users
        await pool.query(
          `INSERT INTO notifications (user_id, title, body, type, reference_id, reference_type)
           SELECT id, $1, $2, 'hatchery_alert', $3, 'hatchery_batch'
           FROM users WHERE user_type = 'admin'`,
          ['Hatchery Alert — ' + batch.hatchery_name, message, batch.id]
        );
      }
    }
  });
}
```

Add to `backend/src/index.ts`:
```typescript
import { startHatcheryCron } from './cron/hatcheryNotifications';
startHatcheryCron();
```

---

## Part 6 — Mobile Utility Files

### `src/utils/seedSalesCalculator.ts`

```typescript
interface SaleInput {
  species: string;
  averageWeightGrams: number;
  saleMethod: 'PIECES' | 'WEIGHT';
  quantityInput: number;
}

interface SaleResult {
  totalEstimatedPieces: number;
  totalWeightKg: number;
  piecesPerKg: number;
  transactionPayload: object;
}

export function calculateFingerlingSale(input: SaleInput): SaleResult {
  const { species, averageWeightGrams, saleMethod, quantityInput } = input;

  if (averageWeightGrams <= 0) {
    throw new Error('Average fingerling weight must be greater than 0');
  }

  const piecesPerKg = Math.round(1000 / averageWeightGrams);
  let totalEstimatedPieces: number;
  let totalWeightKg: number;

  if (saleMethod === 'PIECES') {
    totalEstimatedPieces = Math.round(quantityInput);
    totalWeightKg = parseFloat(((totalEstimatedPieces * averageWeightGrams) / 1000).toFixed(2));
  } else {
    totalWeightKg = quantityInput;
    totalEstimatedPieces = Math.round(totalWeightKg * (1000 / averageWeightGrams));
  }

  return {
    totalEstimatedPieces,
    totalWeightKg,
    piecesPerKg,
    transactionPayload: {
      species,
      avgWeightG: averageWeightGrams,
      pricingModel: saleMethod,
      pieces: totalEstimatedPieces,
      totalKg: totalWeightKg,
      soldDate: new Date().toISOString().split('T')[0],
    }
  };
}
```

### `src/services/hatcheryNotifications.ts` (mobile — local push)

```typescript
import * as Notifications from 'expo-notifications';

const DAYS_HATCH       = 1;
const DAYS_YOLK        = 3;
const DAYS_NURSERY     = 21;
const DAYS_REARING     = 75;
const TOTAL_DAYS       = DAYS_HATCH + DAYS_YOLK + DAYS_NURSERY + DAYS_REARING; // 100

export function calculateFingerlingMaturityDate(spawningDate: Date): Date {
  const d = new Date(spawningDate);
  d.setDate(d.getDate() + TOTAL_DAYS);
  return d;
}

export async function scheduleHatcheryAlerts(batchNo: string, spawningTimestamp: number) {
  const spawning  = new Date(spawningTimestamp);
  const maturity  = calculateFingerlingMaturityDate(spawning);
  const rearingStart = new Date(spawning);
  rearingStart.setDate(rearingStart.getDate() + DAYS_HATCH + DAYS_YOLK + DAYS_NURSERY);

  const alerts = [
    {
      daysFromRearing: 45,
      title: 'Fingerling Alert — 50% through rearing',
      body:  `Batch ${batchNo}: Start identifying buyers. ~30 days remaining.`
    },
    {
      daysFromRearing: 60,
      title: 'Fingerling Alert — 80% through rearing',
      body:  `Batch ${batchNo}: List fingerlings on marketplace now. ~15 days remaining.`
    },
    {
      daysFromRearing: DAYS_REARING - 10,
      title: '🚨 Fingerlings ready in 10 days',
      body:  `Batch ${batchNo}: Sample-weigh fingerlings and finalise buyers immediately.`
    },
  ];

  for (const alert of alerts) {
    const triggerDate = new Date(rearingStart);
    triggerDate.setDate(triggerDate.getDate() + alert.daysFromRearing);
    if (triggerDate.getTime() <= Date.now()) continue;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: alert.title,
        body:  alert.body,
        data:  { batchNo, targetScreen: 'BatchDetail' },
      },
      trigger: { date: triggerDate } as any,
    });
  }
}
```

---

## Part 7 — New Screen Checklist (7 screens)

### Screen 1: `HatcheryDashboard`
- Operator/admin landing page
- Bento grid: active batches count, batches in rearing, fingerling-ready batches, total sales this season
- List of batches sorted by urgency (days to fingerling_ready ascending)
- FAB: "+ New Batch"

### Screen 2: `AddEditBatch`
- Fields: batch number (auto-generate), species picker, variant (Jayanti Rohu / Amrita Katla / Standard), broodstock counts M+F, total kg, spawning date
- On save: auto-calculate `estimated_fingerling_date`, schedule local push notifications via `scheduleHatcheryAlerts()`
- Shows estimated fingerling date preview before save

### Screen 3: `BatchDetail`
- Timeline progress bar across 5 stages (hatching → yolk → nursery → rearing → fingerling_ready)
- Days elapsed in current stage vs benchmark
- Countdown: "X days to fingerling stage"
- "Advance Stage" button → opens `StageLog` modal
- Water quality log entry shortcut (reuses existing WaterQuality component)
- "Record Sale" button appears only when `current_stage === 'fingerling_ready'`

### Screen 4: `StageLog` (modal/bottom sheet)
- Stage confirmation (read-only — shows next stage name)
- Count at entry field (estimated number of fish entering new stage)
- Water quality quick entry (DO, pH, temp)
- Observations text field
- Survival rate auto-shown if previous count available

### Screen 5: `FingerlingSales`
- Toggle: Sell by Piece / Sell by Weight
- Average weight input (g) — critical field, shown prominently
- Quantity input changes label based on mode
- Live calculation panel: pieces ↔ kg ↔ pieces-per-kg
- Buyer section: search existing users by phone or enter manually
- Price fields: per-piece and per-kg
- Preview of QR transaction payload
- "Generate Sale Record" → posts to API → navigates to success screen with QR

### Screen 6: `HatcheryMarketplace` (Farmers/buyers)
- District-filtered list of available fingerling batches
- Each card: species, variant, hatchery name, estimated pieces available, price range, pickup district
- "Request Purchase" button → opens chat/phone link
- Filter by species, variant, district

### Screen 7: `GrowOutStart`
- Triggered by notification OR accessed from "Log New Stocking" button
- Transaction reference input (manual) OR QR scanner
- Auto-fills: species, variant, fingerling count, avg weight (from sale record)
- Pond picker (existing pond list from WatermelonDB)
- Received date + Stocked date pickers
- Expected harvest date shown (auto-calculated, 10 months from stocked date)
- On confirm: creates `grow_out_start_log`, updates pond record → Harvest Countdown card auto-appears on Home dashboard

---

## Part 8 — WatermelonDB Schema (Mobile Offline)

```javascript
// Add to src/database/schema.js — increment version to 5

tableSchema({
  name: 'hatchery_batches',
  columns: [
    { name: 'server_id',                type: 'string', isOptional: true },
    { name: 'hatchery_id',              type: 'string' },
    { name: 'batch_number',             type: 'string' },
    { name: 'species_name',             type: 'string' },
    { name: 'species_variant',          type: 'string' },
    { name: 'current_stage',            type: 'string' },
    { name: 'spawning_date',            type: 'number' },       // timestamp
    { name: 'estimated_fingerling_date',type: 'number' },
    { name: 'estimated_fingerling_count',type:'number', isOptional: true },
    { name: 'avg_fingerling_weight_g',  type: 'number' },
    { name: 'notes',                    type: 'string', isOptional: true },
    { name: 'synced',                   type: 'boolean' },
    { name: 'created_at',               type: 'number' },
  ]
}),

tableSchema({
  name: 'grow_out_stockings',
  columns: [
    { name: 'server_id',                type: 'string', isOptional: true },
    { name: 'pond_id',                  type: 'string' },
    { name: 'transaction_ref',          type: 'string' },
    { name: 'species_name',             type: 'string' },
    { name: 'species_variant',          type: 'string' },
    { name: 'fingerling_count',         type: 'number' },
    { name: 'fingerling_avg_weight_g',  type: 'number' },
    { name: 'stocked_date',             type: 'number' },
    { name: 'expected_harvest_date',    type: 'number' },
    { name: 'notes',                    type: 'string', isOptional: true },
    { name: 'synced',                   type: 'boolean' },
    { name: 'created_at',               type: 'number' },
  ]
}),
```

---

## Part 9 — Navigation Integration

Add to your bottom tab navigator or drawer:

```typescript
// Add to src/navigation (role-gated)
// For hatchery_operator users:
<Stack.Screen name="HatcheryDashboard"  component={HatcheryDashboardScreen} />
<Stack.Screen name="AddEditBatch"       component={AddEditBatchScreen} />
<Stack.Screen name="BatchDetail"        component={BatchDetailScreen} />
<Stack.Screen name="FingerlingSales"    component={FingerlingSalesScreen} />

// For all users:
<Stack.Screen name="HatcheryMarketplace" component={HatcheryMarketplaceScreen} />
<Stack.Screen name="GrowOutStart"        component={GrowOutStartScreen} />
```

Role check helper:
```typescript
// src/utils/roleGuard.ts
import { useAuth } from '../AuthContext';

export function useIsHatcheryOperator() {
  const { user } = useAuth();
  return user?.user_type === 'hatchery_operator' || user?.user_type === 'admin';
}
```

---

## Part 10 — Implementation Order

| Priority | Task | Effort |
|---|---|---|
| 1 | Migrations 025–027 + register routes | 1 day |
| 2 | `HatcheryDashboard` + `AddEditBatch` | 2 days |
| 3 | `BatchDetail` + `StageLog` modal | 2 days |
| 4 | Cron notification job (server) + local push (mobile) | 1 day |
| 5 | `FingerlingSales` with dual-mode calculator | 1.5 days |
| 6 | `GrowOutStart` + pond linkage + Harvest Countdown auto-update | 1.5 days |
| 7 | `HatcheryMarketplace` | 1 day |
| 8 | WatermelonDB offline schema + sync | 1.5 days |
| **Total** | | **~11.5 dev days** |

---

## Appendix — Key API Endpoints Summary

| Method | Route | Used by |
|---|---|---|
| GET | `/api/v1/hatcheries` | Operator/admin — list hatcheries |
| GET | `/api/v1/hatcheries/:id/batches` | Operator — list batches |
| POST | `/api/v1/hatcheries/:id/batches` | Operator — create batch |
| PATCH | `/api/v1/hatcheries/batches/:id/stage` | Operator — advance stage |
| POST | `/api/v1/hatcheries/sales` | Operator — record sale |
| GET | `/api/v1/hatcheries/sales/:txRef` | Buyer — QR code lookup |
| POST | `/api/v1/hatcheries/grow-out` | Buyer — log grow-out stocking |
