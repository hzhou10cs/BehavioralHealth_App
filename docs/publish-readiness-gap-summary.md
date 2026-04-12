# BehavioralHealth App Publish-Readiness Gap Summary

## Purpose

This document summarizes the gap between the current repository state and a version that is ready to publish to the Apple App Store and Google Play Store.

It is based on the code and configuration currently in this repo:

- Expo / React Native frontend
- FastAPI backend
- SQLite persistence
- local, Docker, and Expo Go development workflows
- backend and frontend automated tests

## Current State Snapshot

The app is already in a solid prototype / internal-demo stage.

What is working today:

- account registration and login
- lesson list and lesson detail flows
- chat session creation and assistant reply flow
- chat history listing
- per-user backend isolation for conversations and lessons
- SQLite persistence on the backend
- Docker-based local integration setup
- frontend tests passing
- most backend tests passing

What this means:

- the core product loop exists
- the app can be demonstrated end to end
- the codebase is not yet configured like a production mobile product
- several release, privacy, security, UX, and infrastructure gaps still separate it from store-ready quality

## Executive Summary

The main gap is not "missing app functionality" as much as "missing production readiness."

The app currently behaves like a development build:

- the frontend uses simple placeholder-style UI and basic navigation
- the mobile app config is incomplete for store submission
- authentication and session handling are not production-grade
- sensitive behavioral-health data is stored with minimal protection
- backend deployment and operations are still development oriented
- there is no store-release package preparation, legal documentation, or compliance workflow

Before publishing, the team should treat the next phase as a product-hardening and release-preparation project, not just a feature sprint.

## Gap Areas

### 1. UI and Product Design

Current state:

- the app uses clean but very basic screens, cards, buttons, and forms
- design is functional, but it still looks like an MVP / prototype
- there is no evident brand system, illustration system, icon set, or polished onboarding experience
- chat, lessons, and history are present, but the flows are minimal

Gap to publish-ready:

- define a clear visual identity:
  - brand colors
  - typography
  - iconography
  - spacing rules
  - reusable design tokens
- improve first-run experience:
  - welcome / onboarding
  - explanation of what the app does
  - expectations and safety boundaries for the assistant
- improve screen polish:
  - stronger hierarchy
  - better empty states
  - better loading states
  - clearer error states
  - more deliberate navigation cues
- improve chat UX:
  - composer polish
  - assistant typing / waiting state
  - clearer message grouping and timestamps
  - ability to revisit a specific session from history
- improve lesson UX:
  - progress tracking that feels intentional, not just seeded status values
  - lesson completion interactions
  - activity entry and save flow

Recommended result:

- a version that feels designed for patients or users, not just for developers testing screens

### 2. Mobile App Configuration and Native Build Readiness

Current state:

- `frontend/app.json` is minimal
- there is no visible native release metadata such as:
  - app icon
  - splash asset
  - bundle identifier
  - Android package name
  - store categories
  - permissions review
- there is no visible `eas.json` or release profile setup in the repo
- current workflows focus on Expo Go and web export

Gap to publish-ready:

- define iOS and Android identity:
  - iOS bundle identifier
  - Android application ID / package
  - release versioning policy
  - build numbers / version codes
- create branded app assets:
  - app icon
  - adaptive icon
  - splash screen
  - store screenshots
  - feature graphic for Google Play
- add native build pipeline:
  - EAS build configuration
  - staging and production profiles
  - signing and credentials management
- review platform permissions and remove anything unnecessary
- test actual release builds on physical devices, not only Expo Go

Recommended result:

- reproducible iOS and Android release builds with complete store metadata and assets

### 3. Authentication, Session Handling, and Security

Current state:

- the backend supports login and registration
- password hashing is present
- access tokens are custom signed tokens
- frontend auth state is in memory only
- no secure mobile token storage is visible
- no token expiration or refresh flow is visible
- default development secret values are still part of the configuration shape

Gap to publish-ready:

- move auth to production-grade session design:
  - token expiration
  - refresh tokens or equivalent renewal flow
  - session revocation strategy
  - password reset flow
  - email verification if required by product policy
- store tokens securely on device:
  - Expo SecureStore or native secure storage equivalent
- add account-management features:
  - change password
  - delete account
  - logout from all sessions if needed
- harden backend security:
  - rate limiting
  - brute-force protection
  - request logging and abuse monitoring
  - tighter CORS and environment-specific origins
- remove all development defaults from production deployments

Recommended result:

- a secure and durable authentication system that can survive app restarts, user support issues, and store review scrutiny

### 4. Behavioral-Health Privacy, Data Protection, and Compliance

Current state:

- the app stores chat content, coach state, and session reports
- the backend uses SQLite
- there is no visible encryption-at-rest strategy
- there is no visible privacy policy, consent flow, or legal copy in the repo
- there is no visible crisis disclaimer or emergency escalation guidance in the user experience

Gap to publish-ready:

- define the data classification model:
  - is this app handling PHI, sensitive health data, or wellness data only
  - what jurisdictions and compliance requirements apply
- add privacy and consent artifacts:
  - privacy policy
  - terms of use
  - in-app consent language
  - data usage disclosures for Apple and Google forms
- add safety boundaries for a behavioral-health assistant:
  - not for crisis use warning
  - emergency resource guidance
  - escalation messaging for self-harm or acute distress scenarios
- implement stronger protection for stored user data:
  - encryption strategy
  - backup strategy
  - retention and deletion policy
  - auditability and access controls
- confirm whether HIPAA or other healthcare compliance applies before production launch

Recommended result:

- a release that can responsibly handle health-adjacent user data and withstand legal / privacy review

### 5. Backend and Server Development

Current state:

- the backend is a good local API foundation
- it includes conversation, lesson, assistant-reply, state, and session-report routes
- SQLite is appropriate for development and local testing
- Docker exists for local integration
- assistant configuration still defaults to test mode and local stub-oriented values

Gap to publish-ready:

- define real deployment architecture:
  - hosting provider
  - staging vs production environments
  - secrets management
  - persistent production database choice
- replace local-first persistence assumptions:
  - evaluate PostgreSQL or another managed production database
  - add migrations
  - define backup / restore procedures
- harden the API:
  - structured logging
  - request tracing
  - monitoring / alerting
  - retry and timeout policies
  - rate limits and API abuse controls
- make assistant integrations production ready:
  - production model selection
  - cost controls
  - timeout / fallback behavior
  - error handling when the LLM provider is unavailable
  - prompt / response safety review
- decide whether assistant generation should stay synchronous or move to job-based / background processing if latency becomes too high

Recommended result:

- a backend that can run continuously, recover from failures, and support real users without manual developer intervention

### 6. Technical Quality and Engineering Gaps

Current state:

- tests exist on both frontend and backend
- frontend tests passed in this review
- backend test suite mostly passed, but one test currently fails
- there is no visible CI pipeline configuration in the repo
- there is no visible crash reporting, analytics, or production observability

Known issue observed in this review:

- backend test failure in `tests/test_sqlite_persistence.py`: `create_auth_user()` is now called without the required `name` argument in one test, which suggests test coverage and interface changes are not fully synchronized

Gap to publish-ready:

- restore a fully green test baseline
- add CI for:
  - backend tests
  - frontend tests
  - linting / type checking
  - build verification
- add production diagnostics:
  - crash reporting
  - performance monitoring
  - server logs and alerts
- increase test depth:
  - end-to-end mobile flows
  - auth persistence tests
  - failure-path tests
  - release build smoke tests

Recommended result:

- a release process where the team can trust builds, detect regressions early, and support users after launch

### 7. Lessons, Content, and Clinical Product Quality

Current state:

- the lesson catalog is seeded and accessible
- the app includes 24 lessons with structured content
- lesson progress appears system-seeded rather than driven by a complete interaction model

Gap to publish-ready:

- review all lesson content for:
  - tone consistency
  - reading level
  - accessibility
  - clinical / behavioral accuracy
  - legal suitability for public release
- define lesson progression rules:
  - what unlocks content
  - what marks completion
  - whether users can journal or save activities
- add content operations workflow:
  - content editing ownership
  - versioning
  - review / approval process

Recommended result:

- content that feels intentional, validated, and maintainable after launch

### 8. App Store and Play Store Preparation

Current state:

- there is no visible store-submission package in the repo
- there are no visible review notes, marketing copy, privacy disclosures, or asset bundles

Gap to publish-ready:

- prepare store listing materials:
  - app subtitle / short description
  - full description
  - keywords
  - screenshots
  - promotional copy
  - support URL
  - marketing URL
- prepare compliance submissions:
  - Apple privacy nutrition labels
  - Google Play data safety form
  - age rating questionnaires
  - content declarations
- prepare review support:
  - demo account if needed
  - reviewer instructions
  - explanation of AI assistant behavior
  - explanation of health-related disclaimers and limitations

Recommended result:

- a complete submission package that reduces the chance of store rejection or review delay

### 9. Operations, Support, and Release Management

Current state:

- the repo supports local development well
- there is little visible evidence of launch operations planning

Gap to publish-ready:

- define operational ownership:
  - who responds to outages
  - who handles user support
  - who rotates secrets
  - who reviews production incidents
- create release processes:
  - staging signoff checklist
  - production rollout checklist
  - rollback plan
  - hotfix process
- add support processes:
  - support email / URL
  - bug intake
  - user issue triage
  - account deletion handling

Recommended result:

- a team that can operate the app after launch, not just build it before launch

## Priority View

### Must Do Before Any Public Store Submission

- finish mobile app metadata and native release configuration
- implement production-grade auth persistence and token security
- define privacy, consent, and behavioral-health safety language
- move backend configuration and secrets to production-safe patterns
- choose real production hosting and database strategy
- restore all tests to green and add CI
- produce required store assets and listing materials

### Should Do Before Broad User Launch

- redesign the UI from prototype polish to production-grade UX
- improve chat and lesson completion flows
- add monitoring, crash reporting, and analytics
- harden assistant error handling and safety responses
- add account recovery and account deletion flows

### Can Follow Shortly After Launch if Scope Must Be Controlled

- deeper personalization
- richer history browsing
- advanced analytics dashboards
- content authoring tools

## Suggested Publish Roadmap

### Phase 1: Product Hardening

- finalize scope for v1
- identify compliance level required for the product
- fix failing backend test
- add CI and enforce green builds
- define production environment model

### Phase 2: Mobile Release Foundation

- add native build config
- create icons, splash, screenshots, and branding assets
- implement secure auth persistence
- test device builds on iOS and Android

### Phase 3: Privacy, Safety, and Backend Readiness

- publish privacy policy and terms
- add crisis and safety boundaries in product copy and flows
- move to production-safe database and server setup
- add monitoring and incident readiness

### Phase 4: UX Polish and Store Submission

- refine onboarding, chat, lessons, and history UX
- complete store listing copy and disclosures
- prepare reviewer instructions
- run final QA on release builds

## Bottom Line

This app is already a credible working prototype with a real end-to-end user flow.

The gap to "ready to publish" is mainly in:

- product polish
- production infrastructure
- security and privacy hardening
- store packaging
- operations and compliance

In short:

- the app is ready for continued internal testing and iteration
- it is not yet ready for public app-store publication without a focused release-hardening phase

