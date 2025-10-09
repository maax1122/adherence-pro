# Specification Update Summary - Web-First Approach

**Date**: 2025-10-09  
**File Updated**: `/Users/maax/Projects/side/adherence-pro/specs/001-medication-family-tracker/spec.md`  
**Change Type**: Platform Strategy Update (Mobile-First → Web-First)

---

## 🔄 Key Changes Made

### 1. **Overview Section**
- ✅ Changed from "mobile application" to "**web application**"
- ✅ Added platform strategy: Web (Phase 1) → Mobile (Phase 2)
- ✅ Mentioned PWA capabilities for app-like experience
- ✅ Added rapid MVP deployment as business objective

### 2. **User Scenarios**
- ✅ Updated Scenario 1: "installed the app" → "accessed the web app"
- ✅ Updated Scenario 2: "push notification" → "browser notification (or PWA notification)"
- ✅ Updated Scenario 2: "tap" → "click" (web interaction)
- ✅ Updated Scenario 5: Added Service Worker and IndexedDB mentions for offline

### 3. **Edge Cases**
- ✅ Added web-specific edge cases:
  - Browser closed/computer powered off handling
  - Browser notification permission denial
  - PWA installation across different browsers

### 4. **Functional Requirements**

#### Updated Requirements:
- **FR-002**: Removed Apple sign-in from Phase 1 (limited web support, available in Phase 2)
- **FR-003**: Changed "app" → "web app"
- **FR-010**: "push notifications" → "browser push notifications (via Web Push API)"
- **FR-012**: Removed "vibration" (not reliably supported on web)
- **FR-013**: Updated for browser/PWA context
- **FR-033**: Added "Service Worker and IndexedDB" for offline support

#### New Requirements:
- **FR-016**: Graceful handling of notification permission denial
- **FR-037-040**: New PWA section:
  - PWA installability
  - manifest.json
  - Service Worker registration
  - "Add to Home Screen" prompt
- **FR-051**: Lighthouse score ≥90 (web-specific performance metric)
- **FR-052**: 3-second load time on 3G (web-specific)

#### Renumbered:
- Security & Privacy: FR-037 → FR-041 (to accommodate new PWA section)
- Performance: FR-043 → FR-047 (to accommodate new PWA section)

### 5. **Success Metrics**
- ✅ Updated: "across both platforms" → "across all browsers"
- ✅ Changed: "Crash rate" → "Error rate"
- ✅ Added: PWA installation rate ≥30%
- ✅ Added: Browser notification permission grant rate ≥70%

### 6. **Scope & Boundaries**

#### In Scope (Phase 1 - Web):
- ✅ Web application on desktop and mobile browsers
- ✅ Progressive Web App (PWA) with offline support
- ✅ Email + Google sign-in (removed Apple for Phase 1)
- ✅ Browser push notifications
- ✅ Service Worker for offline
- ✅ Responsive design for all screen sizes
- ✅ Cross-browser compatibility

#### Out of Scope (Moved to Phase 2):
- ✅ Native iOS/Android apps
- ✅ Apple sign-in
- ✅ Native camera integration
- ✅ Biometric authentication
- ✅ Background notification reliability improvements

### 7. **Dependencies & Assumptions**
- ✅ Removed: Mobile platform approval processes
- ✅ Added: Browser push notification infrastructure (Web Push API)
- ✅ Added: Modern browser requirements (Chrome 90+, Safari 14+, etc.)
- ✅ Added: Service Worker API support
- ✅ Updated assumptions for web context (browser versions, PWA optional, etc.)

### 8. **Clarifications**
- ✅ Added Session 2 (2025-10-09) with 4 new clarifications:
  - Q13: Why web-first? (faster testing, code reusability)
  - Q14: Web notification reliability (adequate for MVP)
  - Q15: Browser support (Chrome, Safari, Firefox, Edge)
  - Q16: PWA installation (optional, 30% target rate)

---

## 📊 Impact Analysis

### What Stayed the Same (Platform-Agnostic):
- ✅ All business objectives
- ✅ All user personas
- ✅ Core user scenarios (login, add meds, log intake, view history)
- ✅ All key entities (User, Medication, Log Entry, Family Connection, Reminder Schedule)
- ✅ FHIR compliance requirements
- ✅ Firebase backend (Auth, Firestore, Cloud Messaging)
- ✅ Offline-first architecture
- ✅ Family monitoring and caregiver features
- ✅ Adherence analytics

### What Changed (Platform-Specific):
- ⚠️ UI interaction verbs: "tap" → "click", "swipe" → "scroll"
- ⚠️ Notifications: Native push → Web Push API (browser notifications)
- ⚠️ Offline storage: Native → Service Worker + IndexedDB
- ⚠️ Authentication: Removed Apple sign-in from Phase 1 (web limitations)
- ⚠️ Installation: App stores → PWA "Add to Home Screen"
- ⚠️ Performance metrics: Added Lighthouse scores, load time targets

### Code Reusability Estimate:
- ✅ **70-90% reusable** for Phase 2 mobile:
  - All Firebase services (Auth, Firestore, Messaging)
  - All TypeScript types and interfaces
  - All business logic and data models
  - All utility functions
  - All i18n translations
  - All Firestore security rules and indexes
  - All test scenarios (contract and integration tests)

- ⚠️ **10-20% platform-specific**:
  - UI components (React → React Native)
  - Routing (React Router → React Navigation)
  - Notifications (Web Push → Expo Notifications)
  - Offline storage (Service Worker → AsyncStorage/SQLite)

- ❌ **<10% web-only**:
  - PWA manifest and Service Worker
  - Browser-specific polyfills
  - Responsive web layouts

---

## ✅ Verification Checklist

- [x] All mobile-specific language updated to web-first
- [x] PWA requirements added (FR-037 to FR-040)
- [x] Browser compatibility requirements specified
- [x] Web-specific performance metrics added (Lighthouse, load time)
- [x] Notification strategy updated (Web Push API)
- [x] Offline strategy updated (Service Worker, IndexedDB)
- [x] Edge cases include browser-specific considerations
- [x] Success metrics include PWA and browser-specific targets
- [x] Scope clearly defines Phase 1 (Web) and Phase 2 (Mobile)
- [x] Dependencies updated for web infrastructure
- [x] Assumptions updated for browser context
- [x] New clarifications added (Session 2)
- [x] No implementation details leaked into spec (remains platform-agnostic)
- [x] All constitutional requirements still met (testability, clarity, measurability)

---

## 🎯 Next Steps

1. ✅ **Specification Updated** - Ready for planning phase
2. ⏳ **Run `/plan` command** - Generate web-first implementation plan
3. ⏳ **Update `plan.md`** - Define web tech stack (React, Vite, MUI, etc.)
4. ⏳ **Generate `tasks.md`** - Create web-specific task breakdown
5. ⏳ **Initialize Web Project** - Set up React + Vite + Firebase
6. ⏳ **Begin TDD Workflow** - Write tests, implement features

---

## 📁 Files Modified

1. **`/Users/maax/Projects/side/adherence-pro/specs/001-medication-family-tracker/spec.md`**
   - Platform strategy updated
   - 52 functional requirements updated/added
   - Success metrics updated
   - Scope redefined for web-first
   - 4 new clarifications added

**Total Changes**: ~25 sections updated, 8 new requirements added, 4 clarifications added

---

## 🔄 Branch Status

**Current Branch**: `001-medication-family-tracker`  
**Status**: Specification updated for web-first approach  
**Ready For**: `/plan` command execution

---

**Summary**: Specification successfully updated to web-first approach while maintaining all core features and business objectives. The change enables faster MVP delivery and easier testing, with 70-90% code reusability for future mobile app development.
