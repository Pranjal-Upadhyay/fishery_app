# Bihar Aquaculture Yojana Integration Plan for MatsyaMitra App

**Version 1.0** | **Last Updated:** June 3, 2026

---

## Executive Summary

This document provides a comprehensive integration strategy for incorporating 33 Bihar government and central government aquaculture schemes into the MatsyaMitra app. The integration targets three primary user personas (Farmers, Hatchery Operators, Doctors), a government admin dashboard, and API-level integration with the National Fisheries Digital Platform (NFDP).

---

## Part 1: Database Schema Modifications

### 1.1 Core Yojana Entity

```sql
-- Yojana Master Table
CREATE TABLE yojanas (
  id UUID PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,  -- e.g., "MMTMV", "MTVY"
  name_hi VARCHAR(255) NOT NULL,     -- Hindi name
  name_en VARCHAR(255) NOT NULL,     -- English name
  description TEXT,
  total_budget_lakh DECIMAL(10, 2),  -- Budget in lakhs (₹)
  launch_year INT,
  classification VARCHAR(50),         -- "capacity_building", "infrastructure", "opex_mitigation", "ecology", "post_harvest", "tribal", "central"
  target_beneficiary_type VARCHAR(50), -- "farmers", "hatcheries", "fishers", "vendors", "cooperatives"
  eligibility_rules JSONB,            -- Complex eligibility logic
  subsidy_structure JSONB,            -- Tier-based subsidy rules
  required_documents JSONB,           -- Document requirements
  application_workflow VARCHAR(100),  -- "online_only", "hybrid", "offline"
  approval_authority VARCHAR(100),    -- "block_officer", "district_officer", "dlc"
  milestone_based_disbursement BOOLEAN,
  geofenced_to_districts TEXT[],     -- Null = all districts
  geofenced_to_regions TEXT[],       -- "north_bihar", "south_bihar", etc.
  is_active BOOLEAN DEFAULT true,
  scheme_data JSONB,                  -- Store additional scheme-specific metadata
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Subsidy Tier Definition
CREATE TABLE subsidy_tiers (
  id UUID PRIMARY KEY,
  yojana_id UUID REFERENCES yojanas(id),
  category VARCHAR(50),   -- "general", "ebc", "sc", "st", "women"
  subsidy_percentage DECIMAL(5, 2),
  subsidy_cap_lakh DECIMAL(10, 2),
  priority_score INT,     -- Higher = better priority in DLC queue
  created_at TIMESTAMP
);

-- Equipment & Infrastructure Unit Costs
CREATE TABLE scheme_components (
  id UUID PRIMARY KEY,
  yojana_id UUID REFERENCES yojanas(id),
  component_name VARCHAR(255),       -- "Advanced Seed Production Unit", "Solar Pump 7.5 HP"
  unit_cost_lakh DECIMAL(10, 2),
  physical_unit VARCHAR(100),        -- "acres", "units", "number"
  min_size DECIMAL(10, 4),
  max_size DECIMAL(10, 4),
  specifications JSONB,              -- Equipment specs, dimensions, etc.
  annual_target_units INT,
  created_at TIMESTAMP
);

-- Eligibility Criteria Rules
CREATE TABLE eligibility_criteria (
  id UUID PRIMARY KEY,
  yojana_id UUID REFERENCES yojanas(id),
  criterion_name VARCHAR(255),
  criterion_type VARCHAR(50),        -- "land_area", "caste", "location", "prior_training", "infrastructure_type"
  min_value DECIMAL(10, 4),
  max_value DECIMAL(10, 4),
  allowed_values TEXT[],             -- For categorical criteria
  validation_logic VARCHAR(100),     -- "range_check", "list_match", "geofence_check"
  priority_order INT,
  created_at TIMESTAMP
);

-- Farmer Application for Scheme
CREATE TABLE scheme_applications (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  yojana_id UUID REFERENCES yojanas(id),
  application_number VARCHAR(100) UNIQUE,
  status VARCHAR(50),                -- "draft", "submitted", "incomplete_docs", "approved", "rejected", "payment_released"
  application_date TIMESTAMP,
  submitted_date TIMESTAMP,
  eligibility_check_status VARCHAR(50), -- "eligible", "ineligible", "pending_verification"
  eligibility_check_reason TEXT,
  subsidy_amount_lakh DECIMAL(10, 2),
  applicant_category VARCHAR(50),    -- "general", "ebc", "sc", "st"
  applicant_caste_certificate_id UUID,
  land_area_acres DECIMAL(10, 4),
  land_lease_agreement_id UUID,
  proposed_infrastructure JSONB,     -- Selected components
  gps_coordinates POINT,             -- PostGIS type for geo-validation
  geo_validation_passed BOOLEAN,
  estimated_cost_lakh DECIMAL(10, 2),
  applicant_contribution_lakh DECIMAL(10, 2),
  bank_account_id UUID,
  approval_date TIMESTAMP,
  dlc_approved_by_officer_id UUID REFERENCES officers(id),
  disbursement_schedule JSONB,       -- Milestone dates & amounts
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Document Registry (single upload, reuse across schemes)
CREATE TABLE document_registry (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  document_type VARCHAR(100),        -- "aadhaar", "caste_cert", "bank_passbook", "land_lease"
  document_number VARCHAR(100),
  file_path TEXT,
  ocr_text TEXT,                     -- Extracted OCR text for search/validation
  validity_start_date DATE,
  validity_end_date DATE,
  is_verified BOOLEAN,
  verified_by_officer_id UUID REFERENCES officers(id),
  verification_date TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Milestone-Based Payment Tracking
CREATE TABLE scheme_milestones (
  id UUID PRIMARY KEY,
  application_id UUID REFERENCES scheme_applications(id),
  milestone_number INT,              -- 1, 2, 3, etc.
  milestone_name VARCHAR(255),       -- "Construction Complete", "Post-Stocking"
  payment_percentage DECIMAL(5, 2),
  payment_amount_lakh DECIMAL(10, 2),
  expected_completion_date DATE,
  actual_completion_date DATE,
  inspector_verification_status VARCHAR(50), -- "pending", "approved", "rejected"
  inspector_notes TEXT,
  geo_tagged_photo_ids UUID[],       -- Photo evidence
  payment_released_date DATE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Prior Benefit Verification
CREATE TABLE farmer_benefit_history (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  yojana_id UUID REFERENCES yojanas(id),
  application_id UUID REFERENCES scheme_applications(id),
  benefit_type VARCHAR(100),         -- "subsidy", "training", "equipment"
  amount_received_lakh DECIMAL(10, 2),
  equipment_installed JSONB,         -- Equipment IDs for tracking
  benefit_date TIMESTAMP,
  is_renewable BOOLEAN,              -- Can apply again?
  next_eligible_date DATE,           -- When eligible again
  created_at TIMESTAMP
);

-- Training & Exposure Visit Batches
CREATE TABLE training_batches (
  id UUID PRIMARY KEY,
  yojana_id UUID REFERENCES yojanas(id),
  batch_name VARCHAR(255),           -- "Bhraman Darshan Batch 1 - Chaur Sites"
  batch_size INT,                    -- Usually 20 farmers per batch
  visit_location VARCHAR(255),       -- "Chaur Development site in Madhubani"
  visit_type VARCHAR(50),            -- "biofloc", "ras", "chaur", "hatchery"
  scheduled_date DATE,
  completion_status VARCHAR(50),     -- "planned", "completed", "cancelled"
  budget_per_batch_lakh DECIMAL(10, 2),
  registered_farmers UUID[],         -- User IDs
  actual_attendees INT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### 1.2 Admin Officer Management

```sql
CREATE TABLE officers (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(100) UNIQUE,
  phone VARCHAR(20),
  role VARCHAR(50),                  -- "block_officer", "district_officer", "dlc_member"
  assigned_districts TEXT[],
  assigned_blocks TEXT[],
  jurisdiction_type VARCHAR(50),     -- "block", "district", "state"
  scheme_assignment JSONB,           -- Which schemes they administer
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- DLC (District Level Committee) Members
CREATE TABLE dlc_members (
  id UUID PRIMARY KEY,
  officer_id UUID REFERENCES officers(id),
  district VARCHAR(100),
  designation VARCHAR(100),          -- "Chairperson", "Member"
  assigned_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true
);

-- Application Review Audit Trail
CREATE TABLE application_audit_log (
  id UUID PRIMARY KEY,
  application_id UUID REFERENCES scheme_applications(id),
  reviewed_by_officer_id UUID REFERENCES officers(id),
  action VARCHAR(50),                -- "document_check", "field_verification", "eligibility_review", "approval"
  review_date TIMESTAMP,
  review_notes TEXT,
  status_before VARCHAR(50),
  status_after VARCHAR(50),
  created_at TIMESTAMP
);
```

---

## Part 2: Farmer-Facing Features

### 2.1 Scheme Discovery & Eligibility Engine

**Feature:** Dynamic scheme filtering based on profile data

```
Farmer Profile Data → Eligibility Rules Engine → Filtered Scheme List
```

**Technical Requirements:**

1. **Profile-Based Filtering:**
   - Parse user's caste certificate (if available) → Extract category (General/EBC/SC/ST)
   - Parse user's location from GPS/pincode → Determine North/South Bihar (for geofencing)
   - Extract land ownership from survey data → Land area & plot coordinates
   - Check benefit history → Prior scheme participation, waiting period status

2. **Eligibility Calculation:**
   - Rule Engine: Match user attributes against `eligibility_criteria` table
   - Return: List of eligible schemes with specific subsidy tier (50%, 70%, 80%, 100%)
   - Mark ineligible schemes with reason (e.g., "Not applicable to North Bihar", "Land too small")

3. **UI Implementation:**
   - Add "Explore Schemes" tab in home or marketplace
   - Display filtered list with:
     - Scheme name (bilingual)
     - Expected subsidy amount (₹ value)
     - Land area required
     - Key eligibility criteria
     - "View Details" button

### 2.2 Scheme Details Screen

**Content per Scheme:**

1. **Overview Section:**
   - Full description (translated to English if original is Hindi)
   - Budget allocation & target beneficiaries
   - Total state investment

2. **Subsidy Breakdown:**
   - Unit cost of infrastructure
   - Subsidy % based on farmer category
   - Expected out-of-pocket cost
   - Payment schedule (e.g., "60% after construction, 40% after stocking")

3. **Required Infrastructure:**
   - Components available under scheme with individual costs
   - Equipment specifications (dimensions, capacity, ISI marks required)
   - Supplier list (government-empanelled vendors)

4. **Eligibility Checker:**
   - Interactive form with conditional fields
   - Real-time validation (e.g., "Land area must be 0.4-1.0 acres")
   - Success/failure message with actionable next steps

5. **Application Button:**
   - "Start Application" → Begins form flow
   - Pre-fills profile data where available
   - Validates completeness before submission

### 2.3 Unified Application Form Flow

**Multi-Step Form Architecture:**

**Step 1: Personal & Farm Details**
- Name, Aadhaar, phone, email (pre-filled)
- Farm location (GPS + manual entry)
- Total cultivable land area
- Land ownership proof selection

**Step 2: Category & Eligibility**
- Caste category selection (with certificate upload)
- Annual income (if applicable)
- Prior training certificates
- Prior subsidy history auto-check

**Step 3: Infrastructure Selection**
- Display eligible components for the scheme
- Component-wise quantity/size selection
- Real-time cost calculator
  - Component cost × subsidy% = expected subsidy
  - Total cost - subsidy = farmer contribution
- Equipment specifications review

**Step 4: Land & Location Validation**
- Land area confirmation
- Lease agreement upload (validate min duration)
- Site photos upload
- GPS verification (system confirms location matches claimed area)

**Step 5: Financial Details**
- Bank account (Aadhaar-seeded preferred)
- Bank passbook photo
- Apply for insurance subsidy (if applicable)
- Loan documentation (if applicable)

**Step 6: Document Checklist**
- Display required documents for scheme
- Check registry for previously uploaded docs
- Upload missing documents
- Timestamp & version each upload

**Step 7: Declaration & Submission**
- Self-signed declaration statement
- Checkbox confirmation of truthfulness
- Digital signature (Aadhaar eKYC integration recommended)
- Submit for district-level verification

**Post-Submission:**
- Application ID generated
- Status: "Submitted - Awaiting Document Verification"
- Notification sent to block officer
- Farmer receives SMS/push: "Application received. Decision in 7-10 days."

### 2.4 Eligibility-Specific Variations

**Example: Talab Matsyiki Vishesh Sahayata Yojana (SC/ST/EBC only)**
- Eligibility engine hides scheme if General category detected
- Form enforces 0.4-1.0 acres land constraint
- Budget: Flat ₹10.10 lakh/acre (₹5.72 lakh minimum)
- Subsidy: Fixed 70%

**Example: Jalkrishi Saurikaran (Solar Pump - North/South difference)**
- Geofencing check: If North Bihar → Max 5 HP pump (₹4,28,515)
- Geofencing check: If South Bihar → Max 7.5 HP pump (₹5,42,629)
- Require 9-year land lease (not 11-month)
- Mandatory site photo + GPS verification
- Prior benefit check: Flag if farmer previously received tube-well subsidy

### 2.5 Application Status & Tracking

**Status Lifecycle:**

```
Draft → Submitted → Documents Verified → Eligibility Reviewed 
→ Approved → Payment Schedule Created → Milestone Tracking → Closed
```

**Farmer-Facing Status Screen:**

| Status | Action | Timeline |
|--------|--------|----------|
| Draft | Continue editing or submit | N/A |
| Submitted | Under review at block office | 3-5 days |
| Documents Incomplete | Upload missing docs (red flag items) | 1 day to respond |
| Eligible - DLC Queue | Waiting for DLC approval | 5-15 days |
| Approved | Accept or reject offer | Immediate |
| Awaiting Payment | Milestone work in progress | Variable |
| Payment Released | Funds transferred to account | Same day notification |
| Closed | Scheme completed | Historical record |

**Notifications:**
- SMS/Push for status changes
- Monthly progress updates if longer than 30 days
- Reminder: "Submit photo of completed construction by [DATE]" (milestone reminder)

---

## Part 3: Hatchery Operator & Vendor Features

### 3.1 Specialized Schemes for Hatcheries

**Relevant Schemes:**
1. **Matsya Prajati ka Vividhikaran Yojana** (Species Diversification)
   - Minor Carps hatchery (₹13.12 lakh)
   - Catfish hatchery (₹15.37 lakh)
   - 60% subsidy
   - 9-year lease agreement required

2. **Mukhyamantri Talab Matsyiki Vikas Yojana** (Carp Hatchery Input Units)
   - Carp hatchery input unit (₹8.00 lakh)
   - Renovation of existing hatchery (₹5.00 lakh)
   - 50-70% subsidy based on category

3. **Mukhyamantri Matsya Vipanan Yojana** (B2B: Feed Mill Subsidies)
   - Monthly electricity subsidy (₹3/unit, capped at ₹2 lakh/month)
   - Upload commercial electricity bills
   - Production logs verification

### 3.2 Hatchery Operator Dashboard

**Key Screens:**

1. **Hatchery Profile**
   - Operational status (active/inactive/under-renovation)
   - Current species cultured
   - Capacity (units/year)
   - Current infrastructure (ponds, tanks, equipment)
   - Land lease status

2. **Equipment Inventory**
   - Existing equipment with serial numbers
   - Equipment acquired via subsidy (linked to applications)
   - Maintenance schedule
   - Life remaining

3. **Scheme Eligibility**
   - Auto-detect: "You have Biofloc unit → You're eligible for Matsyiki Vishesh Prashikshan"
   - Show training opportunities
   - Suggest equipment upgrades

4. **Active Subsidy Tracking**
   - Current subsidy applications
   - Milestone status
   - Expected payment dates
   - Payment received vs. expected

### 3.3 Feed Mill Operator Integration

**B2B Portal Features:**

1. **Application for Feed Mill Electricity Subsidy**
   - Register operational feed mill (>=2 tons/day capacity)
   - Capacity rating (2 ton, 8 ton, 20 ton, 100 ton)
   - Upload monthly commercial electricity bills
   - Input production logs (certified by auditor)

2. **Subsidy Calculation Engine**
   - Benchmark: 150 units electricity per ton of feed
   - Read electricity bill → Extract units consumed
   - Calculate: electricity units ÷ 150 = eligible tons
   - Apply formula: eligible tons × ₹3/unit
   - Enforce monthly cap:
     - Small (2-8 ton): ₹50K/month
     - Medium (20 ton): ₹1.5L/month
     - Large (100 ton): ₹2L/month

3. **Payment Processing**
   - Admin reviews bill + production log
   - Automated calculation shown
   - DLC approval flow
   - Monthly direct benefit transfer to mill's bank account

---

## Part 4: Doctor Network Features

### 4.1 Doctor Eligibility

**Review of Schemes:** Currently, no direct subsidies for doctors are documented in yojana.pdf. However, integration opportunities:

1. **Indirect Relevance:**
   - Awareness building: Doctors → Farmer health advice (fish quality, safety)
   - Training certifications (doctors as trainers for ornamental fish health)

2. **Suggested Features:**
   - Doctor can browse "Fish Health & Disease Management" training schemes
   - Link to specialist hatchery veterinarians
   - Reference lab services for fingerling health certification

**Recommendation:** Keep doctor module flexible for future integration.

---

## Part 5: Government Admin Dashboard

### 5.1 Role-Based Access Control (RBAC)

```
Block Officer
├── View applications in assigned block
├── Verify physical documents
├── Update application status
└── Flag for DLC review

District Fisheries Officer
├── View all applications in district
├── Manage DLC queue
├── Track milestone completions
├── Generate district performance reports
└── Manage officer assignments

DLC (District Level Committee)
├── View applications flagged for approval
├── Approve/reject applications
├── Set payment schedules
├── Release milestone payments
└── Audit compliance
```

### 5.2 Admin Dashboard Modules

#### A. Application Management

**Inbox/Queue View:**
- Filter by scheme, status, block, category
- Sort by: submission date, subsidy amount, category priority
- Bulk actions: "Approve selected", "Request docs from selected"

**Application Detail View:**
- All sections of farmer's application
- Document checklist with verification status
- Officer can:
  - Check/uncheck verified documents
  - Add notes per document
  - Flag for senior review
  - Request document resubmission
  - Approve and auto-generate payment schedule

**Eligibility Verification:**
- System shows eligibility score
- Officer can override with reason logged
- Audit trail required

#### B. Payment & Milestone Tracking

**Disbursement Schedule Dashboard:**
- View: All active applications with pending milestone payments
- See: Milestone name, expected completion date, payment amount
- Inspector mobile app integration: Upload geo-tagged construction photos
- System auto-validates: Construction photo → Milestone approved → Payment released

**Payment Status View:**
- Show: Which farmers have been paid, when, for which milestones
- Filter by: Scheme, block, payment date, amount range
- Export: CSV for audit purposes

**Payment Release Process:**
1. Inspector uploads milestone photo + geo-tag
2. System: Validates photo quality, location match
3. Officer: Reviews & approves milestone
4. System: Triggers payment from state fund → Farmer bank account
5. Notification: SMS sent to farmer: "₹[amount] released for [milestone]"

#### C. District Performance Analytics

**Key Metrics Dashboard:**

```
This FY vs Last FY:
├── Total Applications Received: 450 (+12%)
├── Applications Approved: 380 (+18%)
├── Applications Rejected: 45 (-8%)
├── Pending DLC Review: 25
├── Total Subsidy Disbursed: ₹4,250 lakh (+25%)
├── Average Approval Time: 9 days
└── By-Scheme Breakdown:
    ├── Mukhyamantri Talab Matsyiki Vikas: 120 approved
    ├── Jalkrishi Saurikaran: 85 approved
    ├── Talab Matsyiki Vishesh Sahayata: 95 approved
    └── [Others]
```

**Geographic Heatmap:**
- Show: Approved applications by GPS location
- Identify: Underserved blocks
- Flag: Concentrated application areas (may indicate duplicate claims)

**Beneficiary Category Breakdown:**
- General: 180 approved (47%)
- SC: 75 approved (20%)
- ST: 45 approved (12%)
- EBC: 80 approved (21%)
- Verify: Scheme targets met (e.g., "766 units: 300 General, 200 EBC, 200 SC, 66 ST")

#### D. Infrastructure Project Management

**For infrastructure schemes like "Mukhyamantri Matsya Vipanan Yojana" (Block markets):**

1. **Project View:**
   - 12 Block-level markets (₹23L each)
   - 31 Panchayat-level markets (₹15.6L each)
   - Track: Foundation laid → Construction → Handover

2. **Milestone Tracking:**
   - Phase 1: Land identified & site plan approved
   - Phase 2: Tender issued & contractor selected
   - Phase 3: Construction 25% complete
   - Phase 4: Construction 75% complete
   - Phase 5: Handover & inauguration
   - Each phase: Photo evidence required, payment released

#### E. Training Batch Management

**For "Matsya Prasar Yojana" & "Bhraman Darshan Karyakram":**

1. **Batch Creation:**
   - Target: 9,455 trainees across 294 "Bhraman Darshan" batches (20 farmers/batch)
   - Intra-state training: ₹100 registration fee
   - Inter-state training (e.g., Kakinada): ₹250 registration fee

2. **Batch Management Screen:**
   - Create batch → Assign 20 farmers
   - Set training date & location (e.g., "Chaur Development site, Madhubani")
   - Register farmers (system auto-filters eligible users)
   - Track: Registered, Attended, Certificates issued
   - Payment: Verify fees received, disburse trainer honorarium

3. **Exposure Visit Tracking:**
   - Batch size: 20 farmers per visit
   - Expenditure cap: ₹0.31 lakh per batch
   - Track: Transport, accommodation, meals
   - Post-visit: Farmers fill "Knowledge Gain" survey
   - System: Link to farmer's benefit history → "Completed Exposure Visit training"

#### F. GIS & Geofencing Tools

**For geo-restricted schemes (Chaur Development, Plateau schemes):**

1. **Map View:**
   - Overlay approved applications on district map
   - Color-code: Chaur Development (north districts only), Plateau schemes (8 southern districts)
   - Hover on point: See applicant name, land area, approved amount

2. **Overlap Detection:**
   - System: Flag if 2 applications in "Entrepreneur Model" (>20 ha) overlap geographically
   - Alert: "Large-scale project A (45 ha) overlaps with Project B (35 ha). Please review."

3. **Boundary Enforcement:**
   - Chaur Vikas Yojana: Auto-reject if location outside 22 designated districts
   - Pathari Kshetra: Auto-reject if location outside 8 plateau districts
   - Solar Pump: Different max-HP based on N/S boundary (GPS check)

#### G. Compliance & Audit

**Document Audit Trail:**
- Every document: Upload date, officer verified date, verification status
- OCR extraction stored for search
- Flagged docs (expired, unclear, suspicious) highlighted

**Duplicate Prevention:**
- System cross-checks:
  - Aadhaar number across applications
  - Land parcel (using GPS coordinates + area) across schemes
  - Equipment serial numbers (to prevent subsidy "recycling")
- Alert: "Farmer X already approved for Solar Pump in 2024. Mark as ineligible for 2025 request."

**Financial Reconciliation:**
- By-district total subsidy disbursed vs. budget
- Flag if: Over-budget or significantly under-spending
- Monthly report to state finance department

### 5.3 Officer Tools

#### A. Field Verification Mobile App

**For block officers conducting physical document checks:**

1. **Offline Sync:**
   - Download assigned applications (offline-first)
   - View farmer details, location, photo requirements
   - Cellular/WiFi sync when available

2. **Verification Workflow:**
   - Read OCR-extracted Aadhaar → Cross-check with physical card
   - Verify land lease (copy) → Match land area GPS
   - Photo verification: "Site meets infrastructure requirements"
   - Sign with digital signature (or offline OTP)
   - Sync: Verification status → Dashboard

3. **Milestone Inspection:**
   - Inspector arrives at farmer's site
   - Geo-tagged photo + timestamp
   - Geo-tag auto-captured from phone GPS
   - Upload: Triggers milestone payment (if approved)

#### B. Report Generation

**Block Officer Reports:**
- Daily: Applications processed today
- Weekly: Pending applications older than 5 days
- Monthly: Block performance (approval rate, avg approval time)

**District Officer Reports:**
- By-block comparison: Approval rates, timeline performance
- Scheme-wise performance: Target vs. achievement
- Category-wise: SC/ST/EBC/General breakdown

### 5.4 API Integration: NFDP (National Fisheries Digital Platform)

**Component 1A of PM-MKSSY mandates:**
- Issue digital fisheries identity to all value-chain actors
- Farmer using MatsyaMitra can:
  1. Click "Generate National Fisheries ID"
  2. System calls NFDP API with farmer's data
  3. NFDP issues digital ID (unique across India)
  4. Store NFDP ID in user profile
  5. Use NFDP ID for cross-state scheme eligibility & benefit tracking

**Implementation:**
- REST API to NFDP: POST /issue-identity with (Aadhaar, Name, Phone, Role="farmer")
- Response: Digital ID + QR code
- Display: In farmer's profile as printable card

---

## Part 6: Technical Architecture

### 6.1 Backend API Endpoints

#### Farmer-Facing Endpoints

```
GET /api/v1/schemes
  Query params: ?category=sc&location=madhubani&landArea=0.5
  Response: [{ id, name, subsidy%, eligibility_reason }]

GET /api/v1/schemes/:id
  Response: { name, description, components[], eligibility_criteria[], subsidy_tiers[] }

POST /api/v1/schemes/:id/check-eligibility
  Body: { category, location, landArea, priorTrainingCerts }
  Response: { eligible: true/false, reason, eligibleSubsidy% }

POST /api/v1/applications
  Body: { schemeId, userProfile, selectedComponents, bankAccount }
  Response: { applicationId, status: "draft" }

PUT /api/v1/applications/:id
  (Continue form entry, save draft)

POST /api/v1/applications/:id/submit
  (Finalize & submit for review)

GET /api/v1/applications/:id
  Response: { status, documents[], milestones[], payments[] }

POST /api/v1/documents/upload
  (Single upload, reuse across schemes)
  Body: { documentType, file, expiryDate }
  Response: { documentId, ocrText }

GET /api/v1/training-batches
  Query: ?schemeId=MPVY&location=madhubani
  Response: [{ batchId, scheduledDate, registeredCount }]

POST /api/v1/training-batches/:id/register
  (Join training)

GET /api/v1/benefit-history
  Response: { priorSubsidies[], eligibleSchemes[], waitPeriods[] }
```

#### Admin-Facing Endpoints

```
GET /api/v1/admin/applications
  Query: ?block=madhubani&status=submitted&sort=submitDate
  Response: [{ appId, schemeId, farmerName, status, docs_verified_count }]

GET /api/v1/admin/applications/:id
  Response: Full application + audit log

PUT /api/v1/admin/applications/:id/verify-documents
  Body: { documentId: { status: "approved", notes: "Clear, not expired" } }

PUT /api/v1/admin/applications/:id/status
  Body: { status: "eligible_approved", notes: "Sending to DLC" }
  Triggers: Notification to DLC members

GET /api/v1/admin/dlc-queue
  Response: [{ appId, farmerName, subsidy%, category, eligibleScore }]
  Sorted by: Category priority, then subsidy amount

POST /api/v1/admin/applications/:id/approve-payment
  Body: { milestoneId, inspectorPhotoId }
  Triggers: Payment to farmer's bank account

GET /api/v1/admin/analytics/district
  Response: { applicationsReceived, approved, rejected, totalSubsidyDisbursed, byScheme{} }

GET /api/v1/admin/analytics/geo-heatmap
  Response: GeoJSON with application density by location

POST /api/v1/admin/geofence-check
  Body: { lat, lng, schemeId }
  Response: { allowed: true/false, reason }

POST /api/v1/nfdp/issue-identity
  Body: { aadhaar, name, phone, role: "farmer" }
  Response: { nfdpId, qrCode }

GET /api/v1/admin/scheme-performance
  Query: ?schemeId=MMTMV&startDate=2026-01-01&endDate=2026-06-03
  Response: { targetUnits, achievedUnits, targetBudget, spentBudget, categoryBreakdown{} }
```

### 6.2 Database Indexing Strategy

**Performance-Critical Queries:**

```sql
-- User eligibility filter
CREATE INDEX idx_user_location ON users(location_geom);
CREATE INDEX idx_user_caste ON users(caste_category);

-- Application status queries
CREATE INDEX idx_app_status_date ON scheme_applications(status, submitted_date DESC);
CREATE INDEX idx_app_officer_block ON scheme_applications(block, status);

-- Geo-queries
CREATE INDEX idx_app_location_geo ON scheme_applications USING GIST(gps_coordinates);

-- Benefit history lookups
CREATE INDEX idx_farmer_benefit_yojana ON farmer_benefit_history(user_id, yojana_id);
```

### 6.3 Data Validation & Error Handling

**Field Validators:**

```
Land Area:
  - Land area 0.25 acres: ✓ (Solar pump schemes)
  - Land area 0.4-1.0 acres: ✓ (Special Assistance scheme)
  - Land area 0.5 acres: ✓ (Species Diversification culture)
  - Land area >5 acres: ✗ Chaur scheme max

Caste Certificate:
  - Must be valid (not expired)
  - OCR extraction validates: Category matches selection
  
GPS Coordinates:
  - Cross-check: GPS ± location district geofence
  - Alert if: Large discrepancy (>500m) from claimed address

Lease Agreement:
  - Minimum duration: 9 years (Solar), 11 months (ponds), 9 years (hatcheries)
  - Extract dates from OCR → Validate >= today + min duration
  
Bank Account:
  - IFSC code validation
  - Aadhaar-seeded preferential (auto-enable DigiYatra benefit)
```

### 6.4 Security Considerations

**Sensitive Data:**

1. **Aadhaar & Personal Documents:**
   - Store encrypted on server
   - Serve only to verified officers
   - Audit log all access (who, when, why)
   - Purge after 5 years (compliance rule)

2. **Land Coordinates:**
   - Accurate GPS = farmer's land location exposed
   - Store with reduced precision (village-level only) for non-officers
   - Show exact GPS only to assigned block/district officers

3. **Bank Account Numbers:**
   - Encrypt with HSM (Hardware Security Module)
   - Never transmit in plaintext
   - PCI-DSS compliance

---

## Part 7: UI/UX Specifications

### 7.1 Farmer App Screens

#### Home/Dashboard (Farmer)

**Top Section:**
- "Welcome back, [Name]"
- "Active Applications: [count]" (quick link)
- "New Eligible Schemes Available: [count]" (CTA)

**Scheme Discovery Banner:**
- "You're eligible for these 5 schemes!"
- "Expand land area by 0.2 acres to unlock 2 more"

**Active Applications Card:**
```
┌─────────────────────┐
│ Pond Development    │
│ Status: DLC Review  │
│ Subsidy: ₹10L       │
│ Days Left: 8        │ ← Link to detail
└─────────────────────┘
```

**Quick Links:**
- Explore Schemes
- My Applications
- Training & Exposure Visits
- Document Vault
- Profile Settings

#### Scheme List Screen

**Filter Bar (sticky):**
```
[Category ▼] [Max Subsidy ▼] [Land Area ▼] [Scheme Type ▼]
              [Reset Filters]
```

**Scheme Card (repeated):**
```
┌──────────────────────────────────┐
│ 🎯 Mukhyamantri Talab Matsyiki    │
│                                   │
│ ₹10L subsidy (70% for you)        │
│ Land: 0.4-1.0 acres              │
│ Duration: Milestone-based payment │
│                                   │
│ [View Details] [Start Application]│
└──────────────────────────────────┘
```

#### Scheme Details Screen

**Tabs:**
1. **Overview:** Description, budget, targets
2. **Eligibility:** Interactive form (green checkmark if eligible)
3. **Subsidy:** Cost breakdown, your payment
4. **Components:** Equipment list, costs, specs
5. **Timeline:** Expected completion, milestone dates

**Subsidy Breakdown Section:**
```
Equipment Cost:        ₹ 14.5 Lakh
Your Category:         SC (70% eligible)
Government Subsidy:    ₹ 10.15 Lakh (70%)
Your Contribution:     ₹ 4.35 Lakh (30%)

[Pay in 2 milestones: 60% after construction, 40% after stocking]
```

**CTA Button:**
```
[Start Application] → Scroll to reviews first
```

#### Multi-Step Application Form

**Step Indicator (top):**
```
1. Details > 2. Category > 3. Infrastructure > 4. Location > 
5. Documents > 6. Declaration > Submit
```

**Step 1: Farm Details**
```
Farm Name:        [input] (optional)
District:         [madhubani ▼]
Block:            [select after district]
Village:          [input]
GPS Location:     [📍 Auto-capture] [Manual lat/long]

Land Area:        [0.5] acres
    ⚠️ Scheme requires 0.4-1.0 acres. You're eligible.

Land Lease Until: [June 2033] (Must be ≥2 years from now)
    Upload Lease [📎 Choose File]
```

**Step 2: Category**
```
Your Category:    ⦿ SC  ◯ ST  ◯ EBC  ◯ General
    Upload Caste Certificate [📎 Choose File]
    ✓ Verified
```

**Step 3: Infrastructure**
```
Components Available Under This Scheme:

☐ Pond Construction (0.5 acres)    ₹5.00L → You pay ₹1.50L
☑ Tube Well & Pump                 ₹1.20L → You pay ₹0.36L
☑ Mechanical Aerator               ₹0.50L → You pay ₹0.15L
☐ Shed Construction                ₹1.50L → You pay ₹0.45L

Total Cost:  ₹6.70L
Subsidy:     ₹5.01L (70%)
Your Share:  ₹1.69L
```

**Step 4: Location & Photos**
```
Site Preparation:
- Clear photo of proposed site [📷 Capture] [Upload]
- Geo-tag confirmed: Madhubani, [Verified ✓]
```

**Step 5: Documents**
```
Required Documents:
☐ Aadhaar Card            [Upload] or [From Vault ✓]
☑ Caste Certificate       [Uploaded 5 days ago]
☐ Bank Passbook           [Upload] or [From Vault]
☐ Land Lease Agreement    [Uploaded 3 days ago]
☐ Land Tax Receipt        [Upload]

New Upload:
[Drag or click to upload]
```

**Step 6: Declaration**
```
I declare that the information provided is true and complete.
I understand that false information may result in subsidy cancellation.

☐ I agree to the terms and conditions
☐ I authorize GPS location verification

[🔐 Verify with Aadhaar eKYC]  or  [Sign Digitally]
```

**Step 7: Review & Submit**
```
Application Summary:

Scheme:           Mukhyamantri Talab Matsyiki Vikas Yojana
Category:         SC (70% subsidy)
Land Area:        0.5 acres
Components:       Pond + Tube Well + Aerator
Total Cost:       ₹6.70L
Your Subsidy:     ₹5.01L
Your Payment:     ₹1.69L

Milestone Schedule:
  Milestone 1 (60%): ₹3.00L after pond construction (30 days)
  Milestone 2 (40%): ₹2.01L after fingerling stocking (60 days)

[Cancel]  [Back]  [✓ Submit Application]
```

**Post-Submission:**
```
✓ Application Submitted

Your Application ID:    MMTMV-MAD-2026-0048
Status:                Awaiting Document Verification
Block Officer:        Ramesh Kumar (📞 contact)
Next Step:            Block officer will verify documents within 3-5 days

[View Application] [Track Progress]
```

#### Application Status Screen

**Status Timeline:**

```
◯─────○─────●─────○─────○
  1         2         3      4       5
Submitted   Docs       Eligible  DLC     Payment
            Verified   Approved  Review   Released

Current: Stage 2 (Document Verification)
  ✓ Aadhaar verified (5 days ago)
  ✓ Caste Certificate verified (4 days ago)
  ⏳ Land Lease Agreement under review
  ❌ Land Tax Receipt: MISSING
     [⚠️ Upload within 2 days]

Expected Completion: June 12, 2026
  If delayed, contact: Block Officer Ramesh (📞)
```

**Milestone Tracking (after approval):**

```
Milestone 1: Pond Construction
  Status: In Progress
  Expected: July 5, 2026
  Payment: ₹3.00L (60%)
  [📸 Upload Site Photo]

Milestone 2: Fingerling Stocking
  Status: Not Started
  Expected: August 10, 2026
  Payment: ₹2.01L (40%)
  [📞 Schedule Inspector Visit]
```

### 7.2 Admin Dashboard Screens

#### Applications Queue (Block Officer)

**Filters (sticky):**
```
[Status: Submitted ▼] [Block: Madhubani ▼] 
[Days Pending: >5 ▼] [Sort: Oldest First ▼]
```

**Paginated List:**
```
┌─ ID ─┬─ Farmer ─┬─ Scheme ─────┬─ Category ─┬─ Docs ─┬─ Action ┐
│ 48   │ Rajesh   │ Talab Matsyiki│ SC         │ 3/5   │ [Review]│
│ 47   │ Meera    │ Chaur Vikas   │ ST         │ 5/5   │ [Verify]│
│ 46   │ Arjun    │ Solar Pump    │ General    │ 2/5   │ [Review]│
└──────┴──────────┴───────────────┴────────────┴───────┴─────────┘
```

**Row Click → Application Detail:**
```
[Back to Queue]

Farmer Details:
  Name: Rajesh Singh
  Aadhaar: ****2048
  Phone: ****5678
  Category: SC
  Land Area: 0.6 acres

Scheme:
  Mukhyamantri Talab Matsyiki Vikas Yojana
  Expected Subsidy: ₹4.20L (70%)

Documents:
  ✓ Aadhaar (verified by system, Timestamp: May 28)
    [Officer notes: Clear, date valid]
  
  ✓ Caste Certificate
    [Officer notes: Grade C paper, visible watermark]
  
  ❌ Land Lease
    [Status: Pending Review]
    [Officer can: Approve / Request Resubmission]
  
  ⏳ Bank Passbook
    [Status: Awaiting Upload]

Officer Actions:
  [Request Missing Document] → Auto-SMS to farmer
  [Approve & Forward to DLC]
  [Reject with Reason]
  [Mark for Senior Officer Review]
```

#### DLC Approval Queue

**High-Priority Section:**
```
Category Priority Order:
  1. SC (₹4.20L subsidy) - Rajesh Singh [Approved ✓]
  2. ST (₹5.00L subsidy) - Meera (waiting)
  3. EBC (₹3.50L subsidy) - Arjun (waiting)

Latest Score: SC = 75 (high priority due to subsidy), ST = 68
```

**Bulk Approval:**
```
[☑ Select All SC Applicants] [☑ Select top 10 by subsidy]
[✓ Batch Approve 5] [↓ Details]
```

#### Payment & Milestone Dashboard

**Overview:**
```
This Month Disbursements:  ₹25.40L / ₹50.00L budget (50%)
Pending Milestones:        12 (awaiting photo verification)
Completed & Paid:          48
Rejected Milestones:       1
```

**Active Milestones (awaiting verification):**
```
┌─────────────────────────────────┐
│ Rajesh Singh - Pond Construction│
│ Application: MMTMV-MAD-2026-0048│
│ Expected Payment: ₹3.00L         │
│ Photo Status: [📷 Pending]       │
│ [Review & Approve Payment]       │
└─────────────────────────────────┘
```

**Inspector Mobile Flow:**
```
Inspector App:
  [Milestone Details]
  Farmer: Rajesh Singh
  Work: Pond Construction
  Expected Size: 0.5 acres
  
  [📍 Auto-capture GPS]
  [📷 Take Site Photo] → Geo-tagged
  [✓ Work Appears Complete]
  
  [Submit Inspection]
  
Dashboard notification:
  ✓ Inspection submitted by Officer Ashok
  [👁️ Review Photo] [✓ Approve & Release ₹3.00L]
```

---

## Part 8: Data Migration & Rollout Plan

### 8.1 Phase 1: Setup & Configuration (Weeks 1-2)

1. **Database Setup:**
   - Create yojana schema tables
   - Load 33 schemes with eligibility rules
   - Set up officer/DLC roles & assignments
   - GIS data: Load district/block boundaries

2. **API Development:**
   - Implement v1 endpoints (scheme list, eligibility check, application CRUD)
   - NFDP integration (API client)
   - Payment gateway integration (state bank)

3. **Admin Tools:**
   - Build officer authentication & RBAC
   - Application queue UI
   - Analytics dashboard backend

### 8.2 Phase 2: MVP Launch (Weeks 3-6)

**Schemes to Launch (Priority: High-applicant-volume, simple eligibility):**

1. **Mukhyamantri Talab Matsyiki Vikas Yojana** (766 units, ₹1629.59L)
   - Simplest eligibility, clear component costs
   - High state budget → Quick disbursement

2. **Jalkrishi Saurikaran (Solar Pump)** (500 estimated applications, ₹1364L)
   - High demand, geofencing needed

3. **Talab Matsyiki Vishesh Sahayata Yojana** (749 units, ₹2998.99L)
   - SC/ST/EBC only, straightforward land requirements

**Soft Launch:**
- Deploy to 2-3 pilot blocks (e.g., Madhubani, Araria)
- Onboard 5-10 block officers, 2-3 DLC members
- Run parallel with existing offline system (no cutover risk)
- Collect feedback for 2 weeks

**Full Launch:**
- Roll out to all 24 blocks
- Migration: Digitize any existing paper applications
- Officer training: 3-day workshops in each district

### 8.3 Phase 3: Advanced Schemes (Weeks 7-12)

1. **Training & Exposure Schemes** (Matsya Prasar Yojana)
   - Batch management UI
   - Fee collection integration

2. **Feed Mill Electricity Subsidy** (B2B portal)
   - Feed mill onboarding
   - Automated subsidy calculation

3. **Chaur Development & Plateau Schemes**
   - GIS mapping, overlap detection
   - Entrepreneur Model (large-scale) support

4. **Tribal Welfare Schemes** (DAJGUA)
   - Geofenced to Banka/Bhagalpur
   - 100% subsidy tracking

---

## Part 9: Key Decision Points & Constraints

### 9.1 Design Decisions Made

| Decision | Reasoning |
|----------|-----------|
| Single document vault (not per-scheme) | Reduces upload burden, improves UX |
| Eligibility rules in DB (not hardcoded) | Allows admins to adjust without code deploy |
| Milestone-based subsidy (not upfront) | Ensures infrastructure built; reduces fraud |
| GPS validation (within 500m) | Prevents land-coordinate fraud; maintains privacy |
| Category priority in DLC queue | Ensures SC/ST/EBC targets met per scheme |

### 9.2 Technical Constraints

1. **Offline-First Mobile:**
   - Farmer registration possible offline; sync when connected
   - GPS capture works without internet
   - Document uploads queue if offline; auto-sync

2. **State Banking Integration:**
   - State Finance Department likely uses core banking system (CBS)
   - Payment API: Likely NEFT/RTGS for fund transfer
   - Sync: Daily reconciliation needed

3. **Geofencing Accuracy:**
   - GPS ±500m margin acceptable for village-level schemes
   - Highly restrictive schemes (Plateau 8 districts): District-level check only

4. **Scalability:**
   - Peak load: ~5,000 concurrent applications during announcement
   - Database: Index strategy crucial (see Section 6.2)
   - Payment processing: Batch processes nightly (async)

---

## Part 10: Success Metrics & KPIs

### 10.1 Farmer Experience

| Metric | Target |
|--------|--------|
| Application completion time | <20 min per application |
| Approval turnaround (block verification) | <5 days |
| Total approval to payment (DLC to first milestone) | <30 days |
| Farmer app engagement (monthly active) | >40% of eligible farmers |

### 10.2 Administrative Efficiency

| Metric | Target |
|--------|--------|
| Officer time per application review | <15 min |
| Duplicate application detection | 99%+ |
| Payment processing accuracy | 99.9%+ |
| Data entry error rate | <0.1% |

### 10.3 Scheme Delivery

| Metric | Target |
|--------|--------|
| Applications received vs. target | >80% of scheme quota |
| Category distribution (SC/ST/EBC) | Within ±5% of target |
| Subsidy disbursement (actual vs. budget) | 90-110% of budget |
| Farmer satisfaction (post-scheme survey) | >4.0/5.0 stars |

---

## Part 11: Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Forged documents (Aadhaar, caste cert) | OCR extraction + officer physical verification |
| Duplicate applications (Aadhaar fraud) | Unique Aadhaar constraint; cross-check via NFDP |
| GPS spoofing (fake location) | Cross-check GPS with satellite imagery (optional) |
| Payment to wrong account | Verify Aadhaar-seeded account; 48-hour reversal window |
| Data breach (sensitive docs) | Encryption, RBAC audit logs, geo-restricted storage |
| Scheme rule changes mid-year | Freeze applications at announcement date; grandfathering rules |

---

## Part 12: Appendix: Scheme Mapping Quick Reference

### Schemes by Category

**Capacity Building (Training):**
- Matsya Prasar Yojana (₹945.61L)
- Matsyiki Vishesh Prashikshan Yojana (₹187.20L)

**Infrastructure: Ponds & Hatcheries:**
- Mukhyamantri Talab Matsyiki Vikas Yojana (₹1629.59L)
- Talab Matsyiki Vishesh Sahayata Yojana (₹2998.99L)
- Mukhyamantri Samekit Chaur Vikas Yojana (₹3119.42L)
- Pathari Kshetra Talab Nirman Yojana (₹2919.01L)

**Renewable Energy:**
- Jalkrishi Saurikaran (₹1364L)
- Fish Feed Mill Electricity Assistance (₹TBD)

**Ecology & Geogr. Eng.:**
- Jalashay Matsyiki Vikas Yojana (₹2201.44L) [Reservoir cage culture]

**Biological Diversification:**
- Matsya Prajati ka Vividhikaran Yojana (₹321.28L)

**Post-Harvest & Marketing:**
- Mukhyamantri Machhua Kalyan Yojana (₹1499.90L)
- Mukhyamantri Matsya Vipanan Yojana (₹759.60L)

**Tribal Welfare:**
- Dharti Aaba Janjatiya Gram Utkarsh Abhiyan (₹138.595L)

**Central Schemes:**
- PM-MKSSY Components 1A, 1B, 2, 3
- PMMSY Group Accidental Insurance

---

**Document End. For questions on specific scheme integration or technical implementation, refer to respective section or contact Project Lead.**
