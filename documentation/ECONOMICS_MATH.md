# Fishery App — Economics Calculator: How the Math Works

This document explains every formula, assumption, and data source used in the
ROI Planner / Economics Simulator screen.  It is written to be read by a
non-programmer — no code knowledge needed.

---

## What the user provides (inputs)

| Input | What it means |
|---|---|
| Land size (hectares) | How many hectares the farmer has available |
| Water salinity (µS/cm) | Electrical conductivity of the water source — tells the app freshwater vs brackish vs saline |
| Available capital (₹) | Total money the farmer can put in (before subsidy) |
| Farmer category | General / Women / SC / ST — affects PMMSY subsidy % |
| Risk tolerance | Low / Medium / High — affects species suggestions |
| Preferred species | Optional — farmer can name what they want to grow |
| Water source type | River / Canal / Borewell / Pond — adds a pumping cost surcharge |
| State | Used to look up state-specific subsidy rules and benchmarks |

---

## Step 1 — Water classification

The app measures salinity in µS/cm (micro-Siemens per centimetre), which is how
conductivity meters sold in India report results.

```
≤ 1,000 µS/cm  →  FRESHWATER
1,001–3,000   →  BRACKISH
> 3,000        →  SALINE
```

This determines which species are eligible and which cultivation system is
recommended.

---

## Step 2 — Cultivation system selection

If the farmer doesn't pick a system manually, the app picks one automatically:

```
Water is BRACKISH or SALINE            → Brackish Pond
Capital < ₹1,50,000/ha                 → Traditional Pond
Capital > ₹15,00,000/ha + High risk    → RAS (Recirculating)
Capital > ₹6,00,000/ha                 → Biofloc
Otherwise                              → Traditional Pond
```

---

## Step 3 — CAPEX (Capital Expenditure) calculation

CAPEX is the one-time setup cost.  It is built up component by component:

```
CAPEX = Land preparation (₹/ha × hectares)
      + Pond construction (₹/ha × hectares)
      + Equipment (varies by system — see below)
      + Initial stocking cost (₹/ha × hectares)
      + Contingency buffer (% of subtotal above)
```

### Equipment by system

| System | Equipment added |
|---|---|
| Traditional Pond | 2 HP paddlewheel aerators — 1 per 0.5 ha — ₹28,000 each |
| Brackish Pond | Same aerators as traditional pond |
| Biofloc | 9 m PVC tarpaulin tanks — 1 per 0.1 ha — ₹31,000 each; plus 550 W vortex blowers — ₹13,500 each |
| RAS | 4 × 1 HP pumps/ha (₹8,500 each) + 2 × UV sterilisers/ha (₹12,000 each) |

### Contingency buffer

| System | Contingency |
|---|---|
| Traditional Pond | 10% |
| Biofloc | 15% |
| RAS | 20% |
| Brackish Pond | 15% |

The contingency covers unexpected site costs, price fluctuations in materials,
and installation labour — this is standard practice in project finance.

### Typical CAPEX ranges (1 hectare)

| System | Gross CAPEX |
|---|---|
| Traditional Pond | ₹3.6 – 4.5 lakh |
| Brackish Pond | ₹4.5 – 5.5 lakh |
| Biofloc (10 tanks) | ₹5.5 – 7.0 lakh |
| RAS | ₹12 – 20 lakh |

---

## Step 4 — PMMSY Subsidy

PMMSY (Pradhan Mantri Matsya Sampada Yojana) is a Government of India scheme
that subsidises aquaculture projects.

### Subsidy percentage by farmer category

| Category | Subsidy |
|---|---|
| General | 40% of project cost |
| Women / SC / ST | 60% of project cost |

### Subsidy caps (per hectare)

| Project type | Maximum subsidy |
|---|---|
| Freshwater pond | ₹4,00,000 |
| Brackish water pond | ₹6,00,000 |
| RAS | ₹8,00,000 |
| Integrated farming | ₹5,00,000 |

The cap is **multiplied by land area** — so a 2-hectare freshwater pond has a
maximum subsidy of ₹8,00,000.

### Formula

```
Raw subsidy     = Gross CAPEX × Subsidy %
Capped subsidy  = min(Raw subsidy, Cap × Hectares)
Effective CAPEX = Gross CAPEX − Capped subsidy
```

**Example** — General category, 1 ha traditional pond, gross CAPEX ₹4,00,000:
```
Raw subsidy    = 4,00,000 × 40% = 1,60,000
Cap            = 4,00,000 × 1 ha = 4,00,000
Capped subsidy = min(1,60,000, 4,00,000) = 1,60,000
Effective CAPEX = 4,00,000 − 1,60,000 = ₹2,40,000
```
The farmer only needs to spend ₹2.4 lakh of their own money.

---

## Step 5 — OPEX (Operational Expenditure) calculation

OPEX is the recurring cost to run one full production cycle.

```
Total OPEX = Feed cost
           + (Electricity + Labour) × months × hectares
           + Medicine cost per cycle × hectares
           + Miscellaneous % of subtotal
           + Water source surcharge (if applicable)
```

### Feed cost

Feed is the single biggest operational cost (50–70% of OPEX).

```
Feed cost = Harvest yield (kg) × Feed price (₹/kg) × FCR
```

- **FCR (Feed Conversion Ratio)** — how many kg of feed it takes to produce 1 kg
  of fish.  A FCR of 1.4 means 1.4 kg of feed → 1 kg of fish.
- **Default feed price** = ₹60/kg (conservative; specialist pellet feed costs
  ₹55–80/kg at farm gate in India).
- If the `knowledge_rules` table has a state/species-specific feed price, that
  overrides the default.

### Water source surcharge (per month)

| Source | Surcharge |
|---|---|
| Borewell | ₹2,500/ha/month (pumping cost) |
| Canal / River | ₹1,000/ha/month (filtering/cleaning) |
| Own pond / Rain | ₹0 |

### Miscellaneous buffer

| System | Misc % |
|---|---|
| Traditional / Brackish | 5% |
| Biofloc | 5% |
| RAS | 10% |

### Monthly OPEX

```
Monthly OPEX = Total OPEX ÷ Culture months
```

This is used for the breakeven and cash flow calculations.

---

## Step 6 — Revenue calculation

### Yield (conservative)

Rather than using the midpoint of the yield range, the app uses the **35th
percentile**.  This is intentional — research on first-cycle farmer outcomes in
India consistently shows that new farmers land near the lower third of the
range due to management inexperience, water quality variation, and disease
events.

```
Conservative yield = Min yield + (Max yield − Min yield) × 0.35
```

**Example** — Traditional Pond yield range 7,500–12,500 kg/ha, 1 ha:
```
= 7,500 + (12,500 − 7,500) × 0.35
= 7,500 + 1,750
= 9,250 kg
```

### Price (conservative)

Farm-gate prices in rural India are typically 10–25% below the national
averages published in extension literature.  The app uses the **40th percentile**:

```
Conservative price = Min price + (Max price − Min price) × 0.40
```

**Example** — Traditional Pond price range ₹120–₹160/kg:
```
= 120 + (160 − 120) × 0.40
= 120 + 16
= ₹136/kg
```

### Gross revenue (system-level)

```
Gross revenue = Conservative yield × Conservative price × Hectares
```

This is used for summary totals and the breakeven calculation.

---

## Step 7 — Per-species revenue and profit (species card calculations)

Each species card shows its own numbers because different species have
different survival rates, FCRs, and market prices.  The system yield from
Step 6 is used as the starting point.

### Survival adjustment

```
Species yield = System yield × (Survival rate % ÷ 100)
```

The app uses the **minimum survival rate** from the species data.  This is the
pessimistic/conservative scenario — disease events and water quality crashes
(which happen every few cycles even for experienced farmers) can kill 20–40% of
stock without warning.

| Species | Min survival used |
|---|---|
| Rohu / Catla | 70% |
| Pangasius | 75% |
| Tilapia | 80% |
| Vannamei Shrimp | 60% |
| Scampi (Giant Freshwater Prawn) | 50% |

### Species revenue

```
Species revenue = Species yield × Species average price
```

The species price is the **midpoint** of the species' price range (not
conservative — market price is less volatile than survival rate).

### Species feed cost

```
Feed cost = Species yield × FCR (midpoint) × Feed price (₹60/kg default)
```

### Species net profit

```
Net profit = Species revenue − Feed cost − Non-feed OPEX − Effective CAPEX
```

**Important**: Net profit here means "money left over after recovering the full
capital investment in this single cycle."  It is NOT the same as accounting
profit in a balance sheet (where you'd depreciate CAPEX over 10–20 years).
The purpose is to show how many cycles it takes to get your money back — which
feeds directly into the breakeven calculation.

### Benefit-Cost Ratio (BCR)

```
BCR = Species revenue ÷ (Effective CAPEX + Total OPEX)
```

A BCR of 1.4 means: for every ₹1 you spend, you get ₹1.40 back.
Anything above 1.2 is considered viable for a first-time farmer in Indian
aquaculture norms (NABARD benchmarks).

---

## Step 8 — Breakeven calculation

Breakeven tells you how many months until you have recovered the full Effective
CAPEX from profits.

```
Profit per cycle = Revenue − (Monthly OPEX × Culture months)
Cycles to recover = Effective CAPEX ÷ Profit per cycle
Breakeven months = ceil(Cycles to recover × Culture months)
```

**Example** — Traditional Pond, Rohu, 1 ha:
- Revenue = ₹8,80,000
- Monthly OPEX = ₹25,000
- Culture months = 10
- Effective CAPEX = ₹2,40,000

```
Profit per cycle = 8,80,000 − (25,000 × 10) = 8,80,000 − 2,50,000 = ₹6,30,000
Cycles to recover = 2,40,000 ÷ 6,30,000 = 0.38 cycles
Breakeven months = ceil(0.38 × 10) = 4 months
```

This means: if the first cycle succeeds, the farmer recovers their investment
within 4 months of the harvest sale.

---

## Step 9 — Compatibility score (species ranking)

Each species gets a 0–100 score so the app can rank them.  The score starts at
55 and adjusts up or down:

| Condition | Score change |
|---|---|
| Capital < ₹1.2L/ha and species needs intensive management | −20 |
| Capital > ₹5L/ha | +10 |
| Low risk tolerance + high-value species (>₹300/kg) | −20 |
| High risk tolerance + high-value species | +15 |
| FCR < 1.4 (very feed-efficient) | +15 |
| FCR > 2.2 (feed-hungry) | −15 |
| BCR > 2.5 | +20 |
| BCR 1.8–2.5 | +10 |
| BCR < 1.0 (not viable) | −25 |

Score is clamped to [10, 100].

---

## Step 10 — Sensitivity analysis

The app shows three scenarios to help the farmer understand the range of
outcomes:

| Scenario | Revenue multiplier | CAPEX multiplier | OPEX multiplier |
|---|---|---|---|
| Best case | ×1.25 (25% above base) | ×1.0 | ×1.0 |
| Base case | ×1.0 | ×1.0 | ×1.0 |
| Worst case | ×0.60 (40% below base) | ×1.0 | ×1.0 |

Additional stress tests shown:
- Price drop 10% → new net profit
- Price rise 10% → new net profit
- Yield drop 15% (disease/mortality) → new net profit
- Feed cost up 20% (feed price inflation) → new net profit

---

## Step 11 — Monthly cash flow chart

The chart shows cumulative cash position month by month over one cycle:

```
Month 1:  expenses = CAPEX (one-time)
          revenue  = 0 (nothing sold yet)
Months 2–N-1: expenses = Monthly OPEX
              revenue  = 0
Month N (harvest): expenses = Monthly OPEX
                   revenue  = full cycle revenue
```

The cumulative line goes deeply negative at month 1 (CAPEX hit), stays
negative through the growing period, then jumps positive at harvest.

---

## Data sources in the database

The economic model numbers (yield ranges, price ranges, OPEX rates) stored in
the `knowledge_nodes` table come from:

| System | Source |
|---|---|
| Traditional Pond (carps) | ICAR-CIFA pond culture benchmarks; MPEDA production statistics 2022-23 |
| Biofloc (Tilapia) | CIBA biofloc trial reports; NABARD model project reports |
| RAS (Pangasius) | CIFE RAS feasibility study; NaFDB project reports |
| Brackish Pond (Vannamei) | MPEDA 2022-23 national average 3.2 MT/ha for L. vannamei pond culture |

Species biological parameters (temperature, pH, DO, salinity) come from
peer-reviewed aquaculture literature and MPEDA/NFDB species guides.

State-specific benchmarks and subsidy rules are stored in the `knowledge_rules`
table and override the generic defaults when the farmer's state code is known.

---

## What the app does NOT calculate

- **Land cost** — assumes the farmer already owns or leases the land
- **Depreciation** — CAPEX is shown as a first-cycle recovery cost, not
  depreciated over asset lifespan (pond embankments last 20+ years; aerators
  5–8 years)
- **Loan interest** — NABARD/bank loan interest is not included; the PMMSY
  margin-money note in the UI reminds farmers to check loan terms separately
- **Tax** — agricultural income in India is generally exempt from income tax;
  no tax computation is done
- **Insurance** — National Fisheries Development Board crop insurance premium
  (~₹500–₹1,500/ha/cycle) is not included
- **Post-harvest losses** — transport, cold chain, and market commission
  (typically 8–12%) are not deducted from revenue

Farmers should treat the numbers as a conservative planning estimate, not an
accountant-certified projection.

---

## Why is the profit still positive even in the "conservative" scenario?

Aquaculture genuinely has good margins compared to traditional crop farming in
India, for two reasons:

1. Water is a much more productive medium than soil per unit area — fish
   convert feed to body mass far faster than cattle or poultry.
2. PMMSY subsidy reduces the capital burden significantly — a 40–60% grant is
   essentially free money that inflates effective ROI.

The conservative scenario the app now uses reflects what a **first-time farmer
with no prior experience** can reasonably expect in Year 1.  Farmers who reach
Year 3 with accumulated skill typically operate at the midpoint or above.
