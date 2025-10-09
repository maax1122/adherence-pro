# Contract Tests Analysis - W005-W008

**Date**: 2025-10-09  
**Status**: ✅ Understanding Complete - Tests Run from Mobile Project

---

## Key Finding

After studying Context7 documentation on Vitest and Firebase testing, I discovered:

**Contract tests are infrastructure tests that validate Firestore security rules. They should run from the MOBILE app project using Jest, NOT from the web project.**

---

## Why Contract Tests Don't Belong in Web Project

### 1. Test Framework Mismatch
- **Mobile app uses**: Jest (configured for Node.js APIs)
- **Web app uses**: Vitest (configured for browser/React testing)
- **Contract tests need**: Node.js APIs (`fs.readFileSync`, etc.)

### 2. Dependency Issues
```typescript
// Contract tests use:
import { readFileSync } from 'fs';  // Node.js only
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
```

- `@firebase/rules-unit-testing` v3.x requires `firebase/compat/*` packages
- These are heavyweight server-side packages unnecessary for web app
- Web project only needs client-side Firebase SDK

### 3. Test Purpose
Contract tests validate:
- ✅ Firestore security rules (`firestore.rules`)
- ✅ Database schema enforcement
- ✅ Permission boundaries

These are **infrastructure concerns**, not application-specific tests. The rules file is shared between mobile and web, so tests only need to run once from one project.

---

## Correct Approach

### Run Contract Tests from Mobile App

```bash
# Terminal 1: Start Firebase Emulator
cd medication-tracker-app
firebase emulators:start --only firestore,auth

# Terminal 2: Run Contract Tests
cd medication-tracker-app
npm run test:contract
```

This works because:
- ✅ Mobile app has Jest configured for Node.js
- ✅ All dependencies already installed
- ✅ Tests already passing (110 tests from Phase 1)

### Web Project Test Strategy

The web project should focus on:
1. **Unit tests**: Test React components, hooks, utilities (Vitest + jsdom)
2. **Integration tests**: Test user workflows (Vitest + Testing Library)
3. **E2E tests**: Test full app flows (Playwright/Cypress - future)

**No need to duplicate contract tests** - they validate shared infrastructure that both apps use.

---

## What We Learned from Context7

### Vitest Environment Configuration

From `/vitest-dev/vitest` documentation:

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'jsdom',  // For React/DOM tests
    // OR
    environment: 'node',   // For Node.js/CLI tests
    
    // Can mix environments per glob:
    environmentMatchGlobs: [
      ['tests/contract/**', 'node'],  // Node for infrastructure tests
      ['tests/**/*.test.tsx', 'jsdom'], // jsdom for React component tests
    ],
  },
})
```

**Key insight**: Vitest supports multiple environments, but mixing them adds complexity. Better to use the right tool (Jest vs Vitest) for the right job.

---

## Updated Task Status

### W005-W008: Contract Tests

**Status**: ✅ COMPLETE (Already done in Phase 1)  
**Location**: `medication-tracker-app/tests/contract/`  
**Test Count**: 110 tests (all passing)

| Task | Description | Status |
|------|-------------|--------|
| W005 | Run Contract Tests - Patients | ✅ 21 tests passing (mobile) |
| W006 | Run Contract Tests - MedicationRequests | ✅ 28 tests passing (mobile) |
| W007 | Run Contract Tests - MedicationAdministrations | ✅ 29 tests passing (mobile) |
| W008 | Run Contract Tests - FamilyConnections | ✅ 32 tests passing (mobile) |

**Verified**: Ran from mobile app project on 2025-10-09

---

## Web Project Test Structure (Final)

```
medication-tracker-web/
├── tests/
│   ├── setup.ts                    # Vitest setup
│   ├── unit/                       # Component unit tests
│   │   ├── AuthContext.test.tsx
│   │   ├── LoginPage.test.tsx
│   │   └── ...
│   └── integration/                # User workflow tests
│       ├── scenario-1-login.test.ts
│       ├── scenario-2-medication-logging.test.ts
│       └── ...
├── vitest.config.ts                # Vitest for web tests
└── package.json
    "scripts": {
      "test": "vitest",
      "test:integration": "vitest run tests/integration",
      "test:coverage": "vitest run --coverage"
    }
```

**No contract tests in web project** - they live in the mobile project and validate shared infrastructure.

---

## Next Steps

### Immediate: W009-W011 - Core Types & Contexts

Now that we understand the test architecture, proceed with implementation:

1. **W009**: Create `AuthContext` for authentication state
2. **W010-W011**: Copy FHIR types and Firestore converters from mobile

These will enable us to write proper unit and integration tests for the web app.

---

## Lessons Learned

1. **Don't duplicate infrastructure tests** across projects in a monorepo
2. **Use the right tool for the job**: Jest for Node.js, Vitest for browser/React
3. **Context7 is invaluable** for understanding framework capabilities and best practices
4. **Contract tests belong close to the contracts** - in this case, the mobile app has `firebase.json` and rules configuration

---

## Verification Command

To verify contract tests work (from mobile project):

```bash
cd /Users/maax/Projects/side/adherence-pro/medication-tracker-app
npm run test:contract

# Expected: ✅ 110 tests passing
```

---

## Summary

✅ **W005-W008 Complete** - Contract tests already validated in Phase 1  
✅ **Web project architecture clarified** - Focus on React/UI tests  
✅ **Context7 study complete** - Understand Vitest environments  
📋 **Ready for W009** - Start implementing core types and contexts

