# MatsyaMitra Admin Dashboard: Refinement Checklist & Issues Tracking

This document outlines the detailed review, refinement, and verification checklist for the Next.js admin oversight dashboard. Each item maps directly to user feedback.

---

## 1. Top Bar Search Integration
- [ ] **Issue**: The search input in the top bar is a static placeholder and does not work.
- [ ] **Refinement Plan**:
  - Convert the search bar in `topbar.tsx` into a clickable search trigger.
  - Implement a lightweight, glassmorphic **Command Palette** modal (toggled via click or `⌘K`).
  - Search dynamically across active farmers, ponds, and yojanas (schemes).
  - Provide direct click-to-navigate links for matching records (e.g. redirecting to `/dashboard/farmers?search=...`, `/dashboard?search=...`, or `/dashboard/schemes?search=...`).
- [ ] **Verification**: Click the search input, type query words, click search results, and ensure navigation resolves correctly.

---

## 2. Interactive Map Marker (Farmer Profile Redirect)
- [ ] **Issue**: Clicking "View Farmer Profile" on a map popup opens the generic `/dashboard/farmers` list, but does not select or open that specific farmer's detailed profile.
- [ ] **Refinement Plan**:
  - Update the map popup link to pass the selected farmer's details (e.g., `/dashboard/farmers?search=Ramesh%20Prasad%20Singh`).
  - Modify `farmers/page.tsx` using `useSearchParams` (wrapped in a Next.js `<Suspense>` block) to auto-initialize the search term.
  - Implement a **Farmer Detailed Profile Drawer/Modal** inside `farmers/page.tsx`.
  - Auto-open the matching farmer's profile when a matching query parameter is provided.
- [ ] **Verification**: Click a pond/hatchery marker on the map, click "View Farmer Profile", verify it redirects to the farmers page and automatically opens the correct profile card.

---

## 3. Alerts Feed Expandability & Contact Details
- [ ] **Issue**: Alerts in the biological feed are static cards. Clicking them does not expand or show contact, location, or communication details.
- [ ] **Refinement Plan**:
  - Make alert cards in `alerts/page.tsx` clickable and expandable.
  - When expanded, reveal additional metadata:
    - Target Farmer's name, phone number, and block/district coordinates.
    - Clickable communication options (e.g., direct call button using `tel:phone`).
    - An **"App Notification Trigger"** button that simulates sending an emergency push notification directly to the farmer's mobile app.
- [ ] **Verification**: Click an alert card, check that the contact card slides open, verify the call link triggers correctly, and ensure the app notification button shows success feedback.

---

## 4. Yojana Scheme Application Review & Approve Flow
- [ ] **Issue**: Clicking on a scheme card in the Yojana Master List doesn't show descriptive guidelines. The approval flow for scheme applications and direct benefit transfers (DBT) is confusing.
- [ ] **Refinement Plan**:
  - Expand the Yojana Detail cards to show explicit rules, classification criteria, and milestone weight percentages.
  - **Explain the workflow**:
    - **Step 1 (Submit)**: Farmers apply for subsidies in the mobile app. Their applications show up in the admin dashboard queue.
    - **Step 2 (Document Check)**: Admins review Aadhaar, Land Possession, and Bank passbook documents and click "Verify doc".
    - **Step 3 (DLC Queue)**: Once all documents are verified, the "Flag for DLC Approval Queue" button unlocks, allowing the admin to escalate the yojana application to the District Level Committee.
    - **Step 4 (Release Payout)**: As farmers complete milestones and upload geo-tagged photos of excavation or water stocking, the admin confirms the photos and clicks "Release Payout".
    - **Step 5 (DBT Transfer)**: The system processes a simulated direct bank transfer, registers a unique bank transaction UTR number, and updates the application status.
- [ ] **Verification**: Select a scheme, view the rules configuration card, complete the document verification checklist on a pending application, escalate it, verify a milestone photo, and trigger a simulated payout.

---

## 5. Subsidies Section Interactive Detail Modals
- [ ] **Issue**: Subsidies summary cards (Total Budget, Total DBT Disbursed, Pending DLC Approvals, Budget Utilization Rate) are static and non-clickable.
- [ ] **Refinement Plan**:
  - Make all financial summary cards in `subsidies/page.tsx` interactive.
  - Clicking a card will open a **breakdown modal**:
    - *Total Budget*: Displays allocation breakdown by scheme (TMVSY, JKSY, MPVY) and district.
    - *Total DBT*: Shows total disbursed amounts categorized by farmer caste groups (General, EBC, SC, ST) with live transaction updates.
    - *Pending DLC*: Displays a list of all applications awaiting committee approval.
    - *Utilization Rate*: Shows actual expenditure vs target budget.
- [ ] **Verification**: Click each financial card, check that the modal pops up, and ensure the numbers match the aggregated ledger stats.

---

## 6. Water Quality Clickable Analysis & Alerts
- [ ] **Issue**: Parameter overview cards are static. Pond logs tables do not show details or let admins contact or notify farmers with high-ammonia/low-oxygen ponds.
- [ ] **Refinement Plan**:
  - Make parameter cards (pH, DO, Temp, Ammonia) clickable to show scientific explanation modals (e.g. why 7.6 pH is safe, why 0.06 ppm Ammonia is borderline).
  - Make rows in the Water Quality logs table clickable to open a **Pond Owner Detail Card** showing the owner profile, current parameters, crop details, and historical readings.
  - Add a **"Generate App Alert"** button for ponds showing warning/critical status. Clicking it triggers an alert sent directly to the farmer's mobile app.
- [ ] **Verification**: Click the pH card, inspect the educational modal, click a pond owner's row, and trigger a critical ammonia alert notification.

---

## 7. Production Analytics & Yield Breakdown
- [ ] **Issue**: Production cards (Total Yield, FCR, Survival Rate, Jayanti Rohu Growth) are static. The Rohu growth comparison graph is not interactive.
- [ ] **Refinement Plan**:
  - Make all summary cards in `production/page.tsx` clickable to open details modals:
    - *Total Yield*: Shows yield breakdown (in kg) by species (Rohu, Katla, Mrigal) and districts.
    - *Average FCR*: Explains the Feed Conversion Ratio formula, lists ideal vs actual parameters, and shows average FCR per species.
    - *Average Survival Rate*: Lists survival rates across Patna, Mithila, and Gaya grow-out cycles and shows the calculation math.
    - *Jayanti Rohu +18%*: Shows data explaining the genetically improved growth advantage of Jayanti Rohu.
  - Make the comparison graph clickable. Clicking it opens a **Jayanti Rohu Comparative Growth Screen** explaining why Jayanti Rohu yields more (genetically improved strain, better feed conversion efficiency, and shorter cycle durations) and how this graph dynamically aggregates weight-to-age logs from live cycles.
- [ ] **Verification**: Click on FCR and Survival cards, check calculations, click the comparison graph, and verify that the Jayanti Rohu informational panel renders correctly.
