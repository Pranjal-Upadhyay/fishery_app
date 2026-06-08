# Developer Readme (Internal)

This file is for maintainers and contributors.  
Use this for implementation status, known gaps, and engineering notes.

## Current Working Areas

- Species list and detail flows
- Economics simulation flow and result rendering
- Policy-backed subsidy preview integration
- Water quality logging base flow
- Feed and equipment catalog screens
- Basic auth flow (signup/login foundation)
- Dockerized local infra setup (Postgres + Redis)

## Partially Working / In Progress

- Pond lifecycle features are partially wired and still being completed end-to-end
- Notifications are transitioning from placeholder UX to a full notification center
- Pond-linked water quality integration is in progress
- Multi-language coverage exists but is not complete for every screen
- Offline sync behavior needs deeper scenario testing

## Known Gaps

- No full production-grade alerting pipeline yet
- Some profile/account sections are still limited in backend sync depth
- Advanced export/report workflows are limited
- Operational analytics and outbreak/doctor network modules are not fully integrated

## Recommended Dev Workflow

1. Start infra: `docker compose up -d postgres redis`
2. Run backend migrations + seed before app testing
3. Run mobile via Expo and verify both iOS simulator and API connectivity
4. Validate any schema/API change against economics, species, and pond-linked flows

## Primary Internal Docs

- `mobile/TESTFLIGHT_SETUP.md`
- `backend/MARKET_DATA_STRATEGY.md`
- `ECONOMICS_MATH.md`
