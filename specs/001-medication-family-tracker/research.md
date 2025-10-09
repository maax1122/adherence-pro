# Research: Medication Family Tracker (Web-First)

**Feature**: `001-medication-family-tracker`  
**Date**: 2025-10-09  
**Phase**: 0 - Technology Research and Decisions
**Approach**: Web-First PWA → Mobile Native (Phase 2)

---

## Research Summary

This document consolidates technology choices and architectural decisions for the **web-first implementation** of the Medication Family Tracker. All decisions prioritize:
1. **Rapid MVP delivery** (4-6 weeks vs 6-8 weeks for mobile)
2. **Code reusability** for Phase 2 mobile apps (70-90% target)
3. **Easy testing** (browser-based, no simulator/emulator setup)
4. **PWA capabilities** (offline, installable, notifications)

---

## Decision 1: Frontend Framework - React 18+ with Vite

### Decision
Use **React 18+** with **Vite 5+** as the frontend framework and build tool.

### Rationale
1. **Code Reusability**: React's component model translates directly to React Native (~80% component logic reusable)
2. **Performance**: Vite provides instant HMR (Hot Module Replacement), < 1s dev server startup, optimized production builds
3. **Ecosystem**: Largest ecosystem of libraries, tools, and community support
4. **TypeScript Support**: First-class TypeScript integration out of the box
5. **Modern Features**: React 18 concurrent features, automatic batching, Suspense for data fetching
6. **Team Familiarity**: React is industry standard, easier to find developers
7. **Testing Velocity**: Browser DevTools + instant refresh = faster debugging than mobile simulators

### Alternatives Considered
- **Vue 3 + Vite**: Great DX, but lower reusability for mobile (no Vue Native equivalent)
- **Svelte + SvelteKit**: Smaller bundle size, but immature ecosystem and no mobile path
- **Next.js 14**: Full-stack framework, but overkill for PWA (we use Firebase backend, not Node.js)
- **Create React App**: Outdated, slow builds, Webpack-based (Vite is 10x faster)

### Performance Metrics
- **Dev server startup**: < 1 second (Vite) vs 30+ seconds (Webpack)
- **HMR**: < 50ms (Vite) vs 500ms+ (Webpack)
- **Production build**: < 30 seconds for MVP codebase

**Conclusion**: React + Vite offers best balance of performance, reusability, and ecosystem maturity.

**References**:
- React 18 Docs: https://react.dev/
- Vite Docs: https://vitejs.dev/

---

## Decision 2: UI Component Library - Material UI (MUI) v5

### Decision
Use **Material UI (MUI) v5** as the primary component library.

### Rationale
1. **Comprehensive**: 50+ pre-built accessible components (buttons, inputs, modals, date pickers, etc.)
2. **Accessibility**: WCAG 2.1 AA compliant out of the box, screen reader support, keyboard navigation
3. **Responsive**: Mobile-first responsive components, breakpoint system, Grid/Stack layouts
4. **Customizable**: Powerful theming system with TypeScript support, CSS-in-JS (Emotion)
5. **Material Design**: Google's design system, familiar to users, consistent with Android
6. **Documentation**: Excellent docs and examples, large community (85k+ GitHub stars)
7. **Active Maintenance**: Regular updates, React 18 compatible

### Alternatives Considered
- **Chakra UI**: Great DX, smaller bundle, but less comprehensive component library (no date pickers, data tables)
- **Ant Design**: Enterprise-focused, heavy bundle size (1MB+), less modern design
- **Tailwind CSS + Headless UI**: Most flexible, but requires building every component from scratch (slower MVP)
- **Native HTML + CSS**: Maximum control, but reinventing the wheel (accessibility hard to get right)

### Bundle Size Impact
- **MUI core**: ~120KB gzipped (acceptable for MVP)
- **Tree-shaking**: Only imports used components
- **Code-splitting**: Lazy load pages to keep initial bundle < 200KB

**Conclusion**: MUI provides best balance of features, accessibility, and developer productivity for MVP.

**References**:
- MUI Docs: https://mui.com/
- MUI Accessibility: https://mui.com/material-ui/guides/accessibility/

---

## Decision 3: State Management - Zustand

### Decision
Use **Zustand** for global state management, **React Context** for localized state (theme, i18n).

### Rationale
1. **Simplicity**: Minimal boilerplate, no providers/wrappers needed
2. **TypeScript**: Excellent TypeScript support with type inference
3. **Performance**: Selective subscriptions, no unnecessary re-renders (React.memo not needed)
4. **Bundle Size**: Only 1.2KB gzipped vs Redux (10KB+), Redux Toolkit (15KB+)
5. **DevTools**: Redux DevTools integration for debugging
6. **Learning Curve**: Easy to learn, similar to React hooks (useState-like API)
7. **Mobile Reusability**: Zustand works with React Native (100% compatible)

### Alternatives Considered
- **Redux Toolkit**: Industry standard, but overkill for MVP (heavy boilerplate, steep learning curve)
- **Recoil**: Facebook's state library, but immature (0.7.x), less adopted, future uncertain
- **Jotai**: Atomic state, but more complex mental model, smaller ecosystem
- **React Context only**: Sufficient for simple cases, but performance issues with frequent updates (triggers all consumers)

### Store Structure (Planned)
```typescript
// stores/authStore.ts
interface AuthStore {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

// stores/medicationStore.ts
interface MedicationStore {
  medications: Medication[];
  loading: boolean;
  fetchMedications: (patientId: string) => Promise<void>;
  addMedication: (medication: Medication) => Promise<void>;
}
```

**Conclusion**: Zustand offers simplicity and performance without sacrificing features.

**References**:
- Zustand Docs: https://zustand-demo.pmnd.rs/
- Zustand vs Redux: https://blog.logrocket.com/zustand-vs-redux/

---

## Decision 4: Routing - React Router v6

### Decision
Use **React Router v6** for client-side routing.

### Rationale
1. **Industry Standard**: Most popular React routing library (51k+ stars)
2. **Declarative**: Component-based route definitions
3. **Code Splitting**: Lazy loading routes for better performance (`React.lazy()`)
4. **Nested Routes**: Supports complex layouts and nested navigation
5. **TypeScript**: Full TypeScript support with type-safe route params
6. **Mobile Reusability**: Similar concepts to React Navigation (mobile), easier migration in Phase 2

### Alternatives Considered
- **TanStack Router**: Type-safe, but new and less mature (v1.0 released 2023)
- **Wouter**: Minimalist (1.5KB), but lacks features (no nested routes, no lazy loading)
- **Reach Router**: Deprecated, merged into React Router v6

### Planned Routes
```
/ → Landing page (logged out)
/login → Login page
/register → Registration page
/dashboard → Main dashboard (logged in)
/medications → Medication list
/medications/:id → Medication details
/medications/new → Add medication
/family → Family management
/settings → User settings
```

**Conclusion**: React Router v6 is battle-tested and feature-complete.

**References**:
- React Router v6 Docs: https://reactrouter.com/

---

## Decision 5: Backend - Firebase (Serverless)

### Decision
Use **Firebase** for backend services:
- **Firebase Authentication**: Email/password, Google sign-in (Apple sign-in Phase 2 only)
- **Cloud Firestore**: NoSQL database with offline support
- **Firebase Cloud Messaging (FCM)**: Web push notifications
- **Firebase Hosting**: Static site hosting for PWA
- **Firebase Cloud Functions**: Serverless functions (caregiver alerts, missed dose detection)

### Rationale
1. **Serverless**: No server management, auto-scaling from 100 to 100M users
2. **Offline-First**: Firestore has built-in offline persistence and automatic sync
3. **Real-time Sync**: Automatic data synchronization across devices (caregiver monitoring)
4. **Security**: Declarative security rules, no exposed API keys
5. **Free Tier**: Generous free tier for MVP (50k reads, 20k writes/day, 10GB storage)
6. **Mobile Reusability**: Same Firebase SDK works on React Native (100% reusable services)
7. **Integrated Services**: Auth + Database + Messaging + Hosting in one platform (single SDK)

### Alternatives Considered
- **Supabase**: Open-source Firebase alternative, but less mature, no built-in offline support for web
- **AWS Amplify**: Powerful, but complex setup, steep learning curve, overkill for MVP
- **Custom Node.js + PostgreSQL**: Maximum control, but requires server management, slower to build, no offline sync
- **PocketBase**: Self-hosted, no managed services, limited scaling, no web push notifications

### Firebase Pricing Estimate (MVP Phase)
- **Spark (Free) Plan**: 50k reads/day, 20k writes/day, 10GB storage (sufficient for 100-500 users)
- **Blaze (Pay-as-you-go)**: $0.06/100k reads, $0.18/100k writes (scales cost-effectively)
- **Estimated cost at 10k users**: ~$25-50/month

**Conclusion**: Firebase provides fastest time-to-market with excellent offline support and mobile reusability.

**References**:
- Firebase Docs: https://firebase.google.com/docs
- Firestore for Web: https://firebase.google.com/docs/firestore/quickstart
- Firebase Pricing: https://firebase.google.com/pricing

---

## Decision 6: Data Model - FHIR R4 Compliant

### Decision
Use **FHIR R4** (Fast Healthcare Interoperability Resources) standard for data model.

### Rationale
1. **Healthcare Standard**: Industry-standard for health data interoperability (used by Epic, Cerner, etc.)
2. **Future-Proof**: Enables integration with EHRs, pharmacies, telemedicine platforms in Phase 3+
3. **Structured**: Well-defined resources (Patient, MedicationRequest, MedicationAdministration)
4. **Extensible**: Support for extensions without breaking compatibility
5. **Validation**: Schema validation reduces data quality issues
6. **Developer Experience**: Clear documentation and TypeScript types
7. **100% Reusable**: Same FHIR types work on web and mobile (no platform-specific changes)

**FHIR Resources Used**:
- `Patient`: User/family member profiles (name, DOB, gender, photo)
- `MedicationRequest`: Prescribed medications (drug name, dosage, frequency, instructions)
- `MedicationAdministration`: Medication intake logs (timestamp, dose, notes)
- `RelatedPerson`: Caregiver relationships (caregiver linked to patient)
- `CareTeam`: Family care team structure (patient + list of caregivers)
- `ReminderSchedule`: Custom extension for reminder scheduling (time, frequency, timezone)

### Alternatives Considered
- **Custom Schema**: Faster initially, but no interoperability, harder to extend, reinventing the wheel
- **HL7 v2**: Legacy format, not JSON-friendly, outdated
- **OpenEHR**: Academic, limited tooling, not widely adopted

**Conclusion**: FHIR provides structure without sacrificing flexibility, enables future integrations.

**References**:
- FHIR R4 Spec: https://hl7.org/fhir/R4/
- FHIR MedicationRequest: https://hl7.org/fhir/R4/medicationrequest.html

---

## Decision 7: Notifications - Web Push API (FCM)

### Decision
Use **Firebase Cloud Messaging (FCM)** with **Web Push API** for browser notifications.

### Rationale
1. **Cross-Browser**: Works on Chrome 90+, Firefox 88+, Edge 90+, Safari 16+ (limited)
2. **Background Notifications**: Service Worker enables notifications when tab is closed (if PWA installed)
3. **Firebase Integration**: Single SDK for web and mobile notifications (code reusability)
4. **Free**: Unlimited push notifications (no cost)
5. **Delivery Tracking**: Can track notification delivery and clicks via FCM analytics

**Limitations Acknowledged** (from Session 2 Clarifications):
- **Permission Required**: User must grant notification permission (target ≥70% grant rate)
- **Safari Limitations**: No background notifications without PWA install (Safari 16.4+ only)
- **Browser Closed**: Notifications only delivered if browser is running (unless PWA installed)
- **Less Reliable than Native**: ~80-90% delivery rate vs 95%+ for native mobile (Phase 2 improves this)

### Implementation Strategy
1. **Primary**: Web Push API via Service Worker (when browser open or PWA installed)
2. **Fallback**: In-app alerts (when notifications denied or not supported)
3. **Upgrade Path**: Phase 2 native apps provide guaranteed notification delivery

### Alternatives Considered
- **OneSignal**: Third-party service, better Safari support, but adds dependency, costs money after 1000 users
- **Pusher Beams**: Good reliability, but costs money ($0.01/device/month)
- **Custom WebSocket**: Maximum control, but requires server infrastructure, complex implementation

**Conclusion**: FCM + Web Push API provides best balance for MVP, with clear upgrade path to native notifications in Phase 2.

**References**:
- FCM for Web: https://firebase.google.com/docs/cloud-messaging/js/client
- Web Push API: https://developer.mozilla.org/en-US/docs/Web/API/Push_API

---

## Decision 8: Offline Support - Service Worker + IndexedDB

### Decision
Use **Service Worker API** with **Workbox** for offline caching, **IndexedDB** for local data storage, **Firestore offline persistence** for database sync.

### Rationale
1. **PWA Standard**: Service Worker is PWA core technology (required for installability)
2. **Automatic Sync**: Firestore handles sync automatically when online (no manual queuing)
3. **Cache Strategies**: Workbox provides pre-configured caching strategies (cache-first, network-first, stale-while-revalidate)
4. **Offline UI**: Can detect offline state and show appropriate UI (banner, disabled buttons)
5. **Performance**: Cached assets load instantly on repeat visits (< 100ms vs 3s over network)
6. **Background Sync**: Service Worker can retry failed writes when back online

**Offline Capabilities** (from spec.md FR-031 to FR-036):
- ✅ View medication list and history
- ✅ Log medication intake (syncs when online)
- ✅ View scheduled reminders
- ✅ View family profiles
- ❌ Initial login/registration (requires online)
- ❌ Sending caregiver invitations (requires online)
- ❌ Receiving real-time updates from caregivers (requires online)

### Alternatives Considered
- **LocalStorage**: 5-10MB limit, synchronous API (blocks UI), no structured data
- **Dexie.js (IndexedDB wrapper)**: Good abstraction, but unnecessary (Firestore handles sync)
- **Service Worker only**: No local data persistence for structured data

### Caching Strategy
```
Cache-First: Static assets (JS, CSS, images, fonts)
Network-First: API calls (Firebase Firestore)
Stale-While-Revalidate: Medication photos
```

**Conclusion**: Service Worker + IndexedDB + Firestore offline persistence provides robust offline-first experience.

**References**:
- Service Workers: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
- Workbox: https://developers.google.com/web/tools/workbox
- Firestore Offline: https://firebase.google.com/docs/firestore/manage-data/enable-offline

---

## Decision 9: Testing Stack - Vitest + RTL + Playwright

### Decision
Use **Vitest** for unit/integration tests, **React Testing Library** for component tests, **Playwright** for E2E tests, **Firebase Emulator Suite** for contract tests.

### Rationale
1. **Vitest**: Vite-native test runner, instant HMR, 10-20x faster than Jest, same API as Jest (easy migration)
2. **React Testing Library**: Best practice for testing React components (user-centric, accessibility-focused)
3. **Playwright**: Modern E2E testing, supports Chrome/Firefox/Safari, auto-wait features, parallel execution
4. **Firebase Emulator**: Test Firestore security rules locally without hitting production (free, fast)
5. **TypeScript Support**: All tools have excellent TypeScript support
6. **Browser Testing**: Instant feedback (F5 in browser) vs mobile simulators (5-10 min rebuild)

**Test Strategy** (from constitution):
- **Unit tests**: Services, utilities, hooks (isolated logic) - 80% coverage
- **Component tests**: React components (RTL, user interactions) - All critical UI flows
- **Integration tests**: User flows (auth, medication CRUD, reminders) - 5 scenarios from spec.md
- **Contract tests**: Firestore security rules (Firebase Emulator) - All CRUD operations
- **E2E tests**: Critical paths (Playwright, real browser) - Happy paths only for MVP

### Alternatives Considered
- **Jest**: Industry standard, but slower (Webpack-based), harder to configure with Vite, heavier bundle
- **Cypress**: Popular E2E tool, but slower than Playwright, no Safari support, flaky tests
- **Testing Library (standalone)**: Good, but Vitest integration is better (in-source testing)

### Performance Benchmarks
- **Vitest**: Run 100 unit tests in < 1 second
- **Playwright**: Run 10 E2E tests in < 30 seconds
- **Jest**: Run 100 unit tests in 10-15 seconds (baseline comparison)

**Conclusion**: Vitest + RTL + Playwright provides fastest, most comprehensive testing with excellent DX.

**References**:
- Vitest: https://vitest.dev/
- React Testing Library: https://testing-library.com/react
- Playwright: https://playwright.dev/
- Firebase Emulator: https://firebase.google.com/docs/emulator-suite

---

## Decision 10: Hosting & CI/CD - Firebase Hosting + GitHub Actions

### Decision
Use **Firebase Hosting** for production deployment, **GitHub Actions** for CI/CD pipeline.

### Rationale
1. **Integrated**: Firebase Hosting integrates seamlessly with Firestore, Auth, Cloud Functions
2. **Global CDN**: Automatic CDN distribution, < 100ms latency worldwide (150+ edge locations)
3. **SSL**: Free SSL certificates, automatic HTTPS (required for Service Workers)
4. **Custom Domain**: Support for custom domains (e.g., adherence.app)
5. **Preview Channels**: Deploy preview URLs for pull requests (e.g., `pr-123--adherence.web.app`)
6. **GitHub Actions**: Free for public repos, 2000 minutes/month for private repos
7. **Rollback**: Easy rollback to previous deployments

**CI/CD Pipeline**:
1. Pull request → Run tests (unit, integration, contract) → Deploy to preview channel
2. Tests pass → Deploy to preview → Comment preview URL on PR
3. Merge to main → Run tests → Deploy to production → Run E2E smoke tests

### Alternatives Considered
- **Vercel**: Great DX, but costs money for team collaboration ($20/user/month)
- **Netlify**: Good, but less integrated with Firebase backend, no preview channels in free tier
- **AWS S3 + CloudFront**: Cheapest, but requires manual configuration, no preview channels, complex SSL setup
- **GitHub Pages**: Free, but no dynamic backend, no preview channels, no custom headers

**Conclusion**: Firebase Hosting provides best integration with Firebase backend and excellent free tier.

**References**:
- Firebase Hosting: https://firebase.google.com/docs/hosting
- GitHub Actions: https://docs.github.com/en/actions

---

## Additional Web-Specific Decisions

### TypeScript Configuration
- **Strict Mode**: Enabled (`strict: true`, `noImplicitAny: true`, `strictNullChecks: true`)
- **Target**: ES2020 (modern browsers only, IE11 not supported)
- **Module**: ESNext (Vite handles bundling to ES modules)
- **Path Aliases**: `@/` maps to `src/` for cleaner imports (e.g., `import { auth } from '@/services/auth'`)

### Code Quality
- **ESLint**: TypeScript + React + React Hooks rules + Airbnb style guide
- **Prettier**: Single quotes, 2 spaces, trailing commas, max line width 100
- **Husky**: Pre-commit hooks (lint + format + type check)
- **Commitlint**: Conventional commits (feat, fix, docs, test, chore, etc.)
- **lint-staged**: Run linters only on staged files (faster)

### PWA Configuration
- **Manifest**: App name, icons (192x192, 512x512), theme color, start URL, display mode
- **Service Worker**: Workbox with precache (all static assets) + runtime caching (API calls, images)
- **Install Prompt**: Custom "Add to Home Screen" banner (triggered after 2+ visits)
- **Offline Page**: Fallback page when fully offline (dinosaur game easter egg)
- **Update Strategy**: Prompt user to refresh when new version available

### Performance Optimization
- **Code Splitting**: React.lazy() for route-based splitting (each page loads only its code)
- **Image Optimization**: WebP format with PNG fallback, lazy loading, responsive images
- **Bundle Analysis**: webpack-bundle-analyzer for size monitoring (target < 200KB initial bundle)
- **Lighthouse CI**: Automated performance audits in CI/CD (block PR if score < 90)
- **Tree Shaking**: Vite automatically removes unused code
- **Font Optimization**: Use system fonts or preload web fonts

### Internationalization (i18n)
- **Library**: react-i18next with i18next
- **Languages**: English (default), Vietnamese (MVP)
- **Format**: JSON files (`src/i18n/en.json`, `src/i18n/vi.json`)
- **Pluralization**: Built-in support for plural forms
- **Date/Number Formatting**: Use Intl API for locale-aware formatting
- **Storage**: User language preference stored in localStorage
- **100% Reusable**: Same i18n files work for mobile in Phase 2

---

## Technology Stack Summary

| Component | Web (Phase 1) | Mobile (Phase 2) | Reusability |
|-----------|---------------|------------------|-------------|
| **Frontend Framework** | React 18+ | React Native + Expo | 80% (component logic) |
| **Build Tool** | Vite 5+ | Metro (Expo) | N/A (platform-specific) |
| **Language** | TypeScript | TypeScript | 100% |
| **UI Library** | Material UI v5 | React Native Paper | 10% (concepts only) |
| **Routing** | React Router v6 | React Navigation | 20% (route structure) |
| **State Management** | Zustand | Zustand | 100% |
| **Backend** | Firebase | Firebase | 100% |
| **Offline Storage** | Service Worker + IndexedDB | AsyncStorage + MMKV | 90% (same API) |
| **Notifications** | Web Push API (FCM) | Expo Notifications | 80% (same FCM logic) |
| **Testing** | Vitest + RTL + Playwright | Jest + RTL + Detox | 85% (test logic) |
| **i18n** | react-i18next | react-i18next | 100% |
| **CI/CD** | GitHub Actions + Firebase Hosting | GitHub Actions + EAS Build | 70% (workflows) |

**Overall Reusability Estimate**: **70-85%** of codebase (business logic, services, types, utilities, translations)

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser / PWA (Phase 1)                  │
├─────────────────────────────────────────────────────────────┤
│  React UI (Material UI)                                    │
│  ├── Pages (React Router routes)                           │
│  │   ├── /login, /register, /dashboard                     │
│  │   ├── /medications, /medications/:id                    │
│  │   └── /family, /settings                                │
│  ├── Components (buttons, forms, modals, cards)            │
│  └── State (Zustand stores)                                │
│      ├── authStore (user, login, logout)                   │
│      ├── medicationStore (CRUD, loading)                   │
│      ├── familyStore (caregivers, connections)             │
│      └── notificationStore (permissions, subscriptions)    │
├─────────────────────────────────────────────────────────────┤
│  Service Layer (70-90% reusable for mobile)               │
│  ├── Firebase Auth (login, register, Google OAuth)        │
│  ├── Firestore Service (CRUD operations, real-time sync)  │
│  ├── Notification Service (FCM Web Push, permissions)     │
│  ├── Reminder Scheduler (cron-like logic, timezone)       │
│  ├── Offline Sync (Service Worker + Firestore cache)      │
│  └── FHIR Types (Patient, MedicationRequest, etc.)        │
├─────────────────────────────────────────────────────────────┤
│  Service Worker (PWA capabilities)                        │
│  ├── Workbox (caching strategies)                         │
│  │   ├── Cache-First: Static assets (JS, CSS, images)    │
│  │   ├── Network-First: API calls                         │
│  │   └── Stale-While-Revalidate: Medication photos       │
│  ├── FCM Service Worker (push notifications)              │
│  ├── Background Sync (retry failed writes)                │
│  └── Offline Fallback (custom offline page)               │
└─────────────────────────────────────────────────────────────┘
                            ↓↑ HTTPS / WebSocket
┌─────────────────────────────────────────────────────────────┐
│                      Firebase Backend                       │
├─────────────────────────────────────────────────────────────┤
│  Authentication (Email, Google, Apple [Phase 2])          │
│  ├── User management (create, login, reset password)      │
│  └── Token validation (JWT, refresh tokens)               │
├─────────────────────────────────────────────────────────────┤
│  Cloud Firestore (NoSQL database)                         │
│  ├── Collections: patients, medication_requests,          │
│  │   medication_administrations, family_connections,      │
│  │   related_persons, care_teams, reminder_schedules      │
│  ├── Security Rules (row-level access control)            │
│  ├── Indexes (composite indexes for queries)              │
│  ├── Offline Persistence (automatic sync)                 │
│  └── Real-time Listeners (caregiver monitoring)           │
├─────────────────────────────────────────────────────────────┤
│  Cloud Messaging (FCM)                                     │
│  ├── Web push notifications (browser)                     │
│  ├── Topic subscriptions (family alerts)                  │
│  └── Device token management                              │
├─────────────────────────────────────────────────────────────┤
│  Cloud Functions (serverless)                             │
│  ├── checkMissedDoses() - Scheduled every 30 min         │
│  ├── sendCaregiverAlert() - Notify on missed dose        │
│  ├── cleanupExpiredReminders() - Daily cleanup           │
│  └── deleteUserData() - GDPR compliance (delete account) │
├─────────────────────────────────────────────────────────────┤
│  Firebase Hosting (CDN, SSL, preview channels)            │
│  ├── Production: adherence.web.app                        │
│  ├── Preview: pr-123--adherence.web.app                   │
│  └── Custom Domain: adherence.app                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Offline-First Architecture

### Data Flow (Optimistic Updates)
1. User logs medication intake → Update Zustand store (instant UI update)
2. Call Firestore service → Write to Firestore (background)
3. Firestore writes to local cache first (instant success)
4. Service Worker syncs to server when online (automatic)
5. If offline → Firestore queues write, syncs when back online

### Conflict Resolution
- **Strategy**: Last-Write-Wins (LWW) for MVP (Firestore default behavior)
- **Edge Case**: Same medication logged simultaneously on 2 devices offline
- **Handling**: Later write wins when both devices come online
- **Mitigation**: Show sync status in UI, allow manual correction
- **Future**: Implement CRDT or operational transforms in Phase 2+

### Cache Invalidation
- **Service Worker**: Cache static assets indefinitely, versioned by filename
- **Firestore**: Cache documents for 24 hours, refresh on next online session
- **Manual**: "Clear cache" button in settings

---

## Performance Benchmarks

| Metric | Target | Phase 1 Web | Phase 2 Mobile | Measurement Tool |
|--------|--------|-------------|----------------|------------------|
| Lighthouse Performance | ≥90 | 90-95 | 85-90 | Lighthouse CI |
| Lighthouse Accessibility | ≥90 | 92-98 | 90-95 | Lighthouse CI |
| Lighthouse Best Practices | ≥90 | 90-95 | 85-90 | Lighthouse CI |
| First Contentful Paint (FCP) | < 1.5s | 0.8-1.2s | 1.0-1.5s | Lighthouse |
| Largest Contentful Paint (LCP) | < 2.5s | 1.5-2.0s | 1.8-2.2s | Lighthouse |
| Time to Interactive (TTI) | < 3.0s | 2.0-2.5s | 2.5-3.0s | Lighthouse |
| Cumulative Layout Shift (CLS) | < 0.1 | 0.02-0.05 | 0.05-0.08 | Lighthouse |
| Bundle Size (gzipped) | < 200KB | 150-180KB | 200-250KB | webpack-bundle-analyzer |
| API Response Time (p95) | < 300ms | 150-250ms | 200-300ms | Firebase Console |
| UI Response Time (p95) | < 300ms | 50-150ms | 100-200ms | Integration tests |
| PWA Installation Rate | ≥30% | 30-40% | N/A | Firebase Analytics |

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Web-Specific Mitigation |
|------|------------|--------|------------------------|
| Browser notification permission denial | Medium | Medium | Provide in-app alerts as fallback, educate users on benefits, show permission value prop |
| Safari limited PWA support | High | Low | Still works as web app, Phase 2 native app for iOS users who need full features |
| Offline sync conflicts | Low | Medium | Last-write-wins for MVP, display conflict warnings, allow manual correction |
| Firebase quota exceeded | Low | High | Monitor usage in Firebase Console, upgrade to Blaze plan if needed ($25/month) |
| Service Worker caching issues | Low | Medium | Thorough testing, cache versioning, "Clear cache" button, unregister old SWs |
| FHIR complexity overhead | Low | Low | Use simplified Firestore documents, full FHIR compliance in future |
| Browser compatibility issues | Low | Medium | Test on Chrome 90+, Firefox 88+, Safari 14+, Edge 90+, polyfills if needed |
| Performance on low-end devices | Low | Medium | Code splitting, lazy loading, bundle analysis, test on older laptops/tablets |
| PWA installation friction | Medium | Low | Clear prompts, show benefits (offline access, faster load), A/B test messaging |
| Web push unreliability | Medium | Medium | Phase 2 mobile provides guaranteed native notifications for critical users |

---

## Browser Support Matrix

| Browser | Minimum Version | PWA Support | Offline Support | Push Notifications | Install to Home Screen |
|---------|----------------|-------------|-----------------|-------------------|----------------------|
| Chrome | 90+ | ✅ Full | ✅ Full | ✅ Full | ✅ Yes |
| Firefox | 88+ | ✅ Full | ✅ Full | ✅ Full | ⚠️ Android only |
| Safari | 14+ | ⚠️ Limited | ✅ Full | ⚠️ iOS 16.4+ | ✅ Yes |
| Edge | 90+ | ✅ Full | ✅ Full | ✅ Full | ✅ Yes |
| Opera | 76+ | ✅ Full | ✅ Full | ✅ Full | ✅ Yes |
| Samsung Internet | 14+ | ✅ Full | ✅ Full | ✅ Full | ✅ Yes |

**Legend**:
- ✅ Full: Complete support
- ⚠️ Limited: Partial support or requires user action
- ❌ None: Not supported

---

## Code Reusability Analysis

### 100% Reusable (No Changes for Mobile)
- FHIR types (`src/types/fhir.ts`)
- Utility functions (`src/utils/`)
- i18n translations (`src/i18n/`)
- Firebase config (`firebase/config.ts`)
- Firestore security rules (`firebase/firestore.rules`)
- Firestore indexes (`firebase/firestore.indexes.json`)
- Cloud Functions (`firebase/functions/`)

### 90-95% Reusable (Minor Adaptations)
- Firebase services (`src/services/firestore/*`, `src/services/auth/*`)
  - API compatible, change imports (`firebase@10.x` → `@react-native-firebase/*`)
- Zustand stores (`src/store/*`)
  - 100% compatible, Zustand works on React Native
- Custom hooks (`src/hooks/*`)
  - 95% compatible, minor tweaks for platform-specific APIs (e.g., `localStorage` → `AsyncStorage`)

### 70-80% Reusable (Platform-Specific Adaptations)
- Notification service (`src/services/notifications/*`)
  - Web: Web Push API + FCM
  - Mobile: Expo Notifications API + FCM
  - Shared: FCM logic, device token management

### 10-20% Reusable (Concepts Only)
- React components (`src/components/*`)
  - Web: Material UI components (`<Button>`, `<TextField>`, `<Modal>`)
  - Mobile: React Native Paper components (`<Button>`, `<TextInput>`, `<Dialog>`)
  - Shared: Component structure, props, state logic
- Routing (`src/pages/*`)
  - Web: React Router routes
  - Mobile: React Navigation stacks
  - Shared: Route structure, navigation logic

### 0% Reusable (Platform-Specific)
- Service Worker (`public/sw.js`) - Web only, no mobile equivalent
- PWA manifest (`public/manifest.json`) - Web only
- Vite config (`vite.config.ts`) - Web only (mobile uses Metro bundler)
- Playwright E2E tests (`tests/e2e/*.spec.ts`) - Web only (mobile uses Detox)

---

## Next Steps

✅ **Phase 0 Complete** - All technology decisions documented
⏭️ **Phase 1 Next** - Design data model, contracts, and quickstart scenarios

**Deliverables for Phase 1**:
1. `data-model.md` - FHIR R4 resource definitions (Firestore schema)
2. `contracts/firestore-security-rules.md` - Firestore security rules with test cases
3. `contracts/firestore.indexes.json` - Composite indexes for optimized queries
4. `quickstart.md` - 5 integration test scenarios (user flows)
5. `.github/copilot-instructions.md` - Updated with web stack

---

**Version**: 2.0 (Web-First)  
**Last Updated**: 2025-10-09  
**Status**: ✅ Complete  
**Approach**: Web (Phase 1) → Mobile (Phase 2)

**Status**: Research complete. Ready for Phase 1: Design & Contracts.
