# Research: Medication Family Tracker

**Date**: 2025-10-06
**Feature**: Medication Family Tracker MVP

## Research Questions & Resolutions

### 1. Cross-Platform Mobile Framework Selection

**Question**: Which framework best supports iOS/Android with offline-first architecture, push notifications, and rapid development for MVP?

**Decision**: React Native with Expo

**Rationale**:
- **Cross-platform parity**: Single codebase for iOS and Android reduces development time by ~50%
- **Expo managed workflow**: Simplifies push notifications, OTA updates, and native builds
- **Offline-first support**: Strong ecosystem for local storage (AsyncStorage, WatermelonDB, Realm)
- **Firebase integration**: Well-documented React Native Firebase library
- **Developer experience**: Hot reload, TypeScript support, extensive component libraries
- **Community & ecosystem**: Large community, React Native Paper for Material Design
- **MVP speed**: Expo EAS Build for quick beta distribution (TestFlight/Internal Testing)

**Alternatives Considered**:
- **Flutter**: Excellent performance but team unfamiliar with Dart; steeper learning curve
- **Native (Swift/Kotlin)**: Best performance but 2x development time; justified only if performance issues arise
- **Ionic/Capacitor**: Web-based; concerns about notification reliability and offline UX

**References**:
- React Native Docs: https://reactnative.dev/
- Expo Docs: https://docs.expo.dev/
- React Native Firebase: https://rnfirebase.io/

---

### 2. Backend & Data Storage Strategy

**Question**: What backend architecture supports offline-first, real-time sync, authentication, and scales from 100 to 100M users?

**Decision**: Firebase (Auth + Firestore + Cloud Messaging)

**Rationale**:
- **Offline-first native**: Firestore has built-in offline persistence and automatic sync
- **Real-time updates**: Live updates for caregiver monitoring without polling
- **Authentication**: Firebase Auth supports email, Google, Apple sign-in out of the box
- **Push notifications**: Firebase Cloud Messaging (FCM) integrated with Firestore triggers
- **Scalability**: Auto-scales from MVP to millions of users; pay-as-you-go pricing
- **Security**: Firestore Security Rules for fine-grained access control (patient/caregiver roles)
- **Development speed**: No backend code needed for MVP; focus on mobile app

**Alternatives Considered**:
- **Supabase**: Great Postgres alternative, but weaker offline story; more complex setup
- **AWS Amplify**: Powerful but steeper learning curve; overkill for MVP
- **Custom Node.js backend**: Full control but requires backend development, devops, scaling effort

**Trade-offs**:
- **Vendor lock-in**: Firebase is proprietary; migration path exists but costly
- **Cost at scale**: Can become expensive at 100M users; mitigation: optimize queries, consider hybrid approach later
- **Query limitations**: Firestore queries less flexible than SQL; acceptable for MVP use cases

**References**:
- Firebase Docs: https://firebase.google.com/docs
- Firestore Offline: https://firebase.google.com/docs/firestore/manage-data/enable-offline

---

### 3. Local Notification Scheduling (Offline Reminders)

**Question**: How to schedule notifications that fire even when app is closed or device offline?

**Decision**: Expo Notifications API with local scheduling

**Rationale**:
- **Works offline**: Local notifications scheduled on device, no server required
- **Background execution**: Notifications fire even when app is terminated
- **Cross-platform**: Single API for iOS and Android notification permissions and scheduling
- **Recurring schedules**: Supports daily, weekly patterns for medication reminders
- **Actionable notifications**: Can add "Taken" / "Missed" action buttons (iOS/Android differ)

**Implementation Approach**:
1. When medication added/edited, calculate all future reminder times (next 30 days)
2. Schedule local notifications using Expo Notifications
3. On app open, reschedule if needed (handle timezone changes, medication updates)
4. User action on notification → log intake → update Firestore → reschedule

**Alternatives Considered**:
- **Firebase Cloud Messaging only**: Requires internet; fails offline (dealbreaker)
- **React Native Push Notification**: More manual setup; Expo abstracts complexity better

**Edge Cases to Handle**:
- Device powered off at reminder time: Notification delivered when powered on (OS behavior)
- Timezone changes: Re-schedule on app open if timezone detected change
- Notification limit (iOS ~64, Android unlimited): Schedule rolling 30-day window, refresh weekly

**References**:
- Expo Notifications: https://docs.expo.dev/versions/latest/sdk/notifications/
- iOS Notification Best Practices: https://developer.apple.com/design/human-interface-guidelines/notifications

---

### 4. Offline Sync Conflict Resolution

**Question**: How to handle conflicts when same medication logged on multiple devices offline?

**Decision**: Last-Write-Wins (LWW) for MVP; defer complex CRDT to future

**Rationale**:
- **Simplicity**: LWW is Firestore's default behavior; no custom logic needed
- **MVP scope**: Clarification confirmed "not solved in MVP"
- **Acceptable trade-off**: Edge case (same medication logged simultaneously on 2 devices) is rare
- **User mitigation**: UI shows sync status; users can manually correct if needed

**Future Consideration**:
- Phase 2+: Implement operational transforms or CRDT for mergeable conflicts
- Log all versions with timestamps for audit trail

**References**:
- Firestore Transactions: https://firebase.google.com/docs/firestore/manage-data/transactions

---

### 5. Performance Optimization for 300ms Response Time

**Question**: How to ensure p95 < 300ms for UI actions (logging intake, viewing history)?

**Decision**: Optimistic UI updates + local-first architecture

**Rationale**:
- **Optimistic updates**: Update local state immediately, sync to Firestore in background
- **Local-first reads**: Read from AsyncStorage/Firestore offline cache (instant), sync from server in background
- **Lazy loading**: Paginate medication logs (load 30 days initially, infinite scroll for older)
- **Memoization**: Use React.memo, useMemo, useCallback to prevent unnecessary re-renders
- **Image optimization**: Compress medication photos, lazy load avatars

**Performance Testing Strategy**:
- Integration tests assert response times: `expect(duration).toBeLessThan(300)`
- React Native Performance Monitor during development
- Production monitoring: Firebase Performance Monitoring SDK

**References**:
- React Native Performance: https://reactnative.dev/docs/performance
- Firebase Performance: https://firebase.google.com/docs/perf-mon

---

### 6. Caregiver Notifications (Push When Patient Misses Dose)

**Question**: How to notify caregivers when patient misses a scheduled medication?

**Decision**: Firestore Cloud Functions + FCM push notifications

**Rationale**:
- **Server-side logic**: Cloud Function triggered when reminder time passes without log entry
- **Reliable delivery**: FCM handles push to all caregiver devices with active connections
- **Scalable**: Cloud Functions auto-scale; no server management
- **Graceful degradation**: If device offline, notification queued until online

**Implementation Flow**:
1. When medication reminder created → schedule Cloud Function for reminder time + 15 min grace period
2. Cloud Function checks: Has medication been logged?
3. If not logged → query family_connections for caregivers → send FCM to caregiver device tokens
4. Caregiver receives push: "Mom missed her 8 AM Aspirin dose"

**Alternatives Considered**:
- **Client-side check**: Unreliable if app closed; requires background tasks (limited on iOS)
- **Polling**: Inefficient; increases battery drain and Firestore reads

**References**:
- Cloud Functions: https://firebase.google.com/docs/functions
- FCM: https://firebase.google.com/docs/cloud-messaging

---

### 7. Internationalization (i18n) for English & Vietnamese

**Question**: How to support bilingual UI with RTL-ready architecture?

**Decision**: react-i18next with JSON language files

**Rationale**:
- **Industry standard**: Most popular i18n library for React/React Native
- **Easy integration**: Hooks-based API fits React paradigm
- **Scalable**: Add new languages by adding JSON files
- **Pluralization & formatting**: Built-in support for dates, numbers, plurals
- **Fallback**: Defaults to English if translation missing

**Implementation**:
- Language files: `src/i18n/en.json`, `src/i18n/vi.json`
- User selects language in settings → stored in AsyncStorage
- All UI strings use `t('key')` instead of hardcoded text

**References**:
- react-i18next: https://react.i18next.com/
- Vietnamese localization guide: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl

---

### 8. Testing Strategy for Offline-First App

**Question**: How to test offline scenarios, notifications, and cross-platform parity?

**Decision**: Multi-layer testing: Unit (Jest) + Integration (React Native Testing Library) + E2E (Detox) + Firebase Emulator

**Rationale**:
- **Unit tests**: Fast, test individual functions/components in isolation
- **Integration tests**: Test user flows with mocked Firebase (Firebase Emulator Suite)
- **E2E tests**: Detox for real device testing (critical for notifications, offline behavior)
- **Firebase Emulator**: Test Firestore rules, Cloud Functions locally without hitting production

**Test Coverage Goals**:
- Unit tests: 80% coverage for utils, services, hooks
- Integration tests: All user scenarios from spec.md (5 acceptance scenarios)
- E2E tests: Happy paths for each major flow (add medication, receive reminder, caregiver monitoring)
- Contract tests: Firestore schema validation (ensure models match database structure)

**References**:
- Jest: https://jestjs.io/
- React Native Testing Library: https://callstack.github.io/react-native-testing-library/
- Detox: https://wix.github.io/Detox/
- Firebase Emulator: https://firebase.google.com/docs/emulator-suite

---

### 9. Security & Privacy (GDPR & Vietnam Decree 13)

**Question**: How to ensure compliance with data protection regulations?

**Decision**: Firebase Security Rules + data encryption + user consent flows

**Rationale**:
- **Firestore Security Rules**: Enforce patient/caregiver access control at database level
- **Encryption**: Firebase encrypts data at rest and in transit (TLS) by default
- **User consent**: In-app privacy policy acceptance on first launch; GDPR consent for EU users
- **Data export**: Manual export flow (admin panel) for MVP; automated in Phase 2
- **Data deletion**: Cloud Function to recursively delete user data when account deleted

**Security Rules Example**:
```javascript
// Firestore Security Rules
match /medications/{medicationId} {
  allow read: if isOwnerOrCaregiver(request.auth.uid, resource.data.userId);
  allow write: if isOwnerOrCaregiver(request.auth.uid, resource.data.userId);
}
```

**Privacy Policy Requirements**:
- What data collected: Name, email, medication names, intake logs, photos
- How used: Reminders, adherence tracking, caregiver notifications
- Not shared with third parties (unless required by law)
- User rights: Access, export, delete data

**References**:
- GDPR Compliance: https://gdpr.eu/
- Vietnam Decree 13: https://www.dataguidance.com/notes/vietnam-data-protection-overview
- Firebase Security: https://firebase.google.com/docs/rules

---

### 10. PRN (As-Needed) Medications Implementation

**Question**: How to support PRN medications with caregiver instructions (what, how much, when, visual)?

**Decision**: Extend Medication model with optional PRN fields; separate UI flow

**Rationale**:
- **Data model**: `isPRN: boolean`, `prnInstructions: { what, howMuch, whenToTake, visualDescription, photoUrl }`
- **No scheduled reminders**: PRN medications don't auto-remind; patient/caregiver logs manually
- **Caregiver UX**: Form to add detailed instructions; photo upload for visual identification
- **Patient UX**: Browse PRN medications; tap to log intake with timestamp

**UI Flow**:
1. Caregiver adds PRN medication: "Tylenol for pain"
2. Instructions: "Take 1-2 tablets when headache occurs. Max 6 tablets per day. White round pill."
3. Photo: Upload image of Tylenol bottle
4. Patient views PRN list → sees instructions → taps "Log Intake" → records timestamp

**References**:
- PRN Medication Best Practices: https://www.ashp.org/pharmacy-practice/resource-centers/patient-safety

---

## Technology Stack Summary

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **Mobile Framework** | React Native + Expo | Cross-platform, fast MVP, offline-first ecosystem |
| **Language** | TypeScript | Type safety, better DX, catches errors at compile time |
| **UI Library** | React Native Paper | Material Design, accessibility, theme support |
| **Navigation** | Expo Router | File-based routing, deep linking, type-safe |
| **State Management** | React Context + Custom Hooks | Simple, no Redux overhead for MVP |
| **Backend** | Firebase (Auth, Firestore, FCM) | Serverless, auto-scaling, offline-first, push notifications |
| **Local Storage** | AsyncStorage | Simple key-value, works offline, async API |
| **Notifications** | Expo Notifications API | Local scheduling, cross-platform, works offline |
| **Testing** | Jest + React Native Testing Library + Detox | Unit, integration, E2E coverage |
| **Internationalization** | react-i18next | Industry standard, supports Vietnamese |
| **CI/CD** | Expo EAS Build + GitHub Actions | Automated builds, TestFlight/Play Store distribution |
| **Monitoring** | Firebase Crashlytics + Performance | Real-time crash reports, performance metrics |

---

## Architecture Decisions

### Offline-First Architecture
- **Local storage as source of truth**: App reads from local cache first
- **Background sync**: Firestore sync happens in background when online
- **Optimistic updates**: UI updates immediately, queue sync operations
- **Conflict resolution**: Last-write-wins for MVP

### Notification Architecture
- **Local notifications**: Scheduled on device for reliability
- **FCM for caregiver alerts**: Server-side trigger via Cloud Functions
- **Graceful degradation**: App functional even if notifications disabled

### Data Architecture
- **Firestore collections**: users, profiles, medications, medication_logs, family_connections, reminder_schedules
- **Subcollections**: medications/{medId}/logs for better query performance
- **Denormalization**: Store user name in medication for faster reads (acceptable trade-off)

### Security Architecture
- **Firebase Security Rules**: Database-level access control
- **Role-based permissions**: Patient (full), Caregiver (read + log on behalf)
- **Secure storage**: Sensitive tokens in Expo SecureStore

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| iOS notification limit (64) | Reminders may not fire | Schedule rolling 30-day window, refresh weekly |
| Firebase cost at scale | High bills at 100M users | Optimize queries, consider hybrid approach in Phase 2 |
| Notification reliability | Users miss medications | Local notifications (primary), FCM (secondary), in-app fallback |
| Offline sync conflicts | Data loss/inconsistency | LWW for MVP, log all versions, allow manual correction |
| Performance on low-end devices | Slow UI, bad UX | Optimize renders, lazy load, test on older devices |
| App store review delays | Delayed launch | Submit early, have contingency for rejection scenarios |

---

## Open Questions for Phase 1

1. ✅ Firestore data model finalized (to be created in data-model.md)
2. ✅ API contracts defined (to be created in contracts/)
3. ✅ User flows validated against spec (to be validated in quickstart.md)
4. ✅ Agent guidance file updated (to be generated via update-agent-context.sh)

**Status**: Research complete. Ready for Phase 1: Design & Contracts.
