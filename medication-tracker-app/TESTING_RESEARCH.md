# Testing Framework - Context7 Research Summary

**Date**: 2025-10-06  
**Task**: T005 - Set Up Testing Framework  
**Libraries Analyzed**: Jest, React Native Testing Library, Detox, Firebase Rules Unit Testing

---

## 1. React Native Testing Library (RNTL) v13.3.3

### Key Findings from Context7

#### ✅ **Breaking Changes in v13**
- **Jest matchers now built-in** - No need for `@testing-library/jest-native`
- **Preset removed** - Use `preset: 'react-native'` instead of `preset: '@testing-library/react-native'`
- **extend-expect auto-imported** - Matchers extended by default when importing from RNTL

#### ✅ **Configuration Best Practices**
```javascript
// jest.config.js - React Native preset
{
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|@react-native-firebase|react-native-paper|expo|@expo|@unimodules|expo-.*|react-native-.*)/)'
  ],
}
```

#### ✅ **Global Mocking Strategy**
- **Mock specific library paths**, not entire `react-native` package
- **Re-export actual module members** when mocking to prevent `undefined` errors
- Example from Context7:
```typescript
jest.mock('@react-navigation/native', () => {
  return {
    ...jest.requireActual('@react-navigation/native'),
    useNavigation: jest.fn(),
  };
});
```

#### ✅ **User Event API** (Modern Testing Approach)
- Replaces `fireEvent` for more realistic user interactions
- Supports delays and fake timers
```typescript
const user = userEvent.setup();
await user.press(element);
await user.type(element, 'text');
```

#### ✅ **Configuration Options**
```typescript
configure({
  asyncUtilTimeout: 2000,          // Timeout for waitFor, findBy*
  defaultHidden: false,             // Include hidden elements
  concurrentRoot: true,             // Enable React Native New Architecture
});
```

---

## 2. Detox v20.28.4 (E2E Testing)

### Key Findings from Context7

#### ✅ **React Native + Expo Setup**
- **Use `detox init`** to generate config files automatically
- **Configuration structure**:
```javascript
module.exports = {
  apps: {
    'ios.debug': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/app.app',
      build: 'xcodebuild -workspace ... -scheme ... -configuration Debug',
    },
    'android.debug': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      build: 'cd android && ./gradlew assembleDebug assembleAndroidTest',
    },
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: { type: 'iPhone 15 Pro' },
    },
    emulator: {
      type: 'android.emulator',
      device: { avdName: 'Pixel_7_Pro_API_34' },
    },
  },
};
```

#### ✅ **Android-Specific Requirements**
1. **Minimum SDK 21** - Set in `android/build.gradle`
2. **Kotlin support** - Add Kotlin Gradle plugin
3. **Network security config** - Allow cleartext HTTP to `10.0.2.2` and `localhost`
4. **Detox AAR repository** - Add to `allprojects.repositories`
5. **DetoxTest.java** - Create auxiliary test file for AndroidJUnitRunner

#### ✅ **Debugging Native Code**
- Set `launchApp: "manual"` in configuration
- Configure fixed debug session with `debugSynchronization: 0`
- Increase `testTimeout: 999999` for breakpoint debugging
- Disable artifacts collection: `artifacts: false`

#### ✅ **Mocking for E2E Tests** (Metro Bundler)
- Use Metro's source extension override for conditional mocking
- Set environment variable `MY_APP_MODE=mocked`
- Configure `metro.config.js`:
```javascript
const defaultSourceExts = require('metro-config/src/defaults/defaults').sourceExts;

module.exports = {
  resolver: {
    sourceExts: process.env.MY_APP_MODE === 'mocked'
      ? ['mock.js', ...defaultSourceExts]
      : defaultSourceExts,
  },
};
```

---

## 3. Jest v30.1.0 (Test Runner)

### Key Findings from Context7

#### ✅ **React Native Preset Configuration**
```json
{
  "jest": {
    "preset": "react-native"
  }
}
```
- Optimizes testing environment for React Native (no DOM APIs)
- Pre-configures React Native-specific transformers

#### ✅ **TypeScript Support**
- Use `ts-jest` for TypeScript transformation
- Or use `babel-jest` with Babel TypeScript preset (we chose this)
- **Config loader directive** for TypeScript config files:
```typescript
/** @jest-config-loader ts-node */
import type {Config} from 'jest';

const config: Config = {
  verbose: true,
};

export default config;
```

#### ✅ **Fake Timers Configuration**
```typescript
const config: Config = {
  fakeTimers: {
    enableGlobally: true,              // Enable for all tests
    doNotFake: ['nextTick'],           // Don't fake specific timers
    timerLimit: 1000,                  // Max recursive timer depth
  },
};
```

#### ✅ **Module Name Mapping** (Critical for React Native)
```json
{
  "moduleNameMapper": {
    "^@/(.*)$": "<rootDir>/src/$1",
    "\\.(jpg|jpeg|png|gif|webp|svg)$": "<rootDir>/tests/__mocks__/fileMock.js"
  }
}
```

#### ✅ **Setup Files After Environment**
- `setupFilesAfterEnv` runs after test environment is ready but before tests
- Used for global matchers, mocks, and test utilities
- Context7 example:
```typescript
// Enable API mocking via MSW
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

---

## 4. Firebase Rules Unit Testing v3.2.0

### Key Findings from Context7

#### ✅ **Library Comparison**
Context7 search returned:
- **PHPUnit** (9.8 trust score) - PHP testing, not relevant
- **Firebase Auth Mocks** (7.4 trust score) - Dart/Flutter, not JavaScript
- **xUnit.net** (8.8 trust score) - .NET testing, not relevant

**Conclusion**: Firebase Rules Unit Testing is specialized library with less community documentation. Rely on official Firebase docs for this.

#### ✅ **Usage Pattern** (from Firebase docs, not Context7)
```typescript
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';

const testEnv = await initializeTestEnvironment({
  projectId: 'test-project',
  firestore: {
    rules: fs.readFileSync('firestore.rules', 'utf8'),
    host: 'localhost',
    port: 8080,
  },
});

// Test authenticated context
const aliceDb = testEnv.authenticatedContext('alice').firestore();
await assertFails(aliceDb.collection('private').doc('bob').get());
```

---

## 5. Implementation Decisions Based on Context7

### ✅ **What We Implemented**

1. **Jest Configuration**
   - React Native preset (Context7 best practice)
   - Babel transformation with `babel-preset-expo`
   - Transform ignore patterns for node_modules (Context7 pattern)
   - Coverage thresholds: 80% statements/functions/lines, 75% branches

2. **Global Mocks** (jest.setup.js)
   - Firebase modules mocked with factory functions (Context7 pattern)
   - AsyncStorage mocked (Context7 recommendation)
   - Expo modules mocked (expo-constants, expo-notifications)
   - Console logs silenced during tests (Context7 pattern)

3. **Detox Configuration**
   - iOS simulator: iPhone 15 Pro
   - Android emulator: Pixel_7_Pro_API_34
   - Separate debug/release configs (Context7 pattern)
   - Jest integration via `detox/runners/jest` (Context7 recommended)

4. **Test Directory Structure** (Context7 best practice)
   ```
   tests/
   ├── unit/              # Component, hook, util tests
   ├── integration/       # Service integration tests
   ├── contract/          # Firestore security rules tests
   ├── e2e/              # Detox end-to-end tests
   └── __mocks__/        # Global mock files
   ```

5. **Test Scripts** (package.json)
   - Separate scripts for each test type (Context7 recommendation)
   - Coverage script with threshold enforcement
   - E2E scripts for both platforms
   - Build scripts for Detox binaries

### ✅ **What We Deferred**

1. **User Event API** - Will implement when writing interaction tests (Phase 3.2)
2. **MSW (Mock Service Worker)** - Not needed yet, will add for API tests
3. **React Native New Architecture** - Set `concurrentRoot: false` for now (SDK 54 stable)
4. **Metro Mocking** - Will implement when E2E mocking is needed (Phase 3.2)

---

## 6. Key Learnings & Best Practices

### ✅ **From Context7 Documentation**

1. **RNTL v13 Breaking Changes**
   - Remove `@testing-library/jest-native` dependency
   - Remove explicit `extend-expect` import
   - Use `react-native` preset instead of RNTL preset

2. **Mocking Best Practices**
   - Mock specific library paths, not entire packages
   - Always re-export actual module members with `...jest.requireActual()`
   - Use factory functions for Firebase mocks to avoid initialization errors

3. **Detox + React Native**
   - Always run Metro bundler for debug builds
   - Set minimum SDK to 21 for Android
   - Configure network security for cleartext HTTP
   - Use separate configurations for debug/release

4. **Jest + TypeScript**
   - Use `babel-jest` with Expo preset (simpler than `ts-jest`)
   - Configure `transformIgnorePatterns` for React Native node_modules
   - Use TypeScript types for configuration: `Config` from 'jest'

5. **Fake Timers**
   - Enable globally for all tests or per-test as needed
   - Use `jest.advanceTimersByTime()` for deterministic time control
   - Set `RNTL_SKIP_AUTO_DETECT_FAKE_TIMERS=true` for custom implementations

---

## 7. Context7 Trust Scores

- **Jest** (/jestjs/jest): 6.9 trust score, 1717 code snippets
- **RNTL** (/callstack/react-native-testing-library): 10.0 trust score, 439 code snippets ⭐
- **Detox** (/wix/detox): 9.1 trust score, 1111 code snippets ⭐
- **Testing Library Jest DOM** (/testing-library/jest-dom): 9.3 trust score (not used - web only)
- **Ts-Jest** (/kulshekhar/ts-jest): 8.9 trust score (not used - chose babel-jest)

**Highest Quality**: RNTL (10.0) and Detox (9.1) have excellent documentation and community support.

---

## 8. Next Steps (Phase 3.2 - Tests First)

### ✅ **T006-T010: Contract Tests** (Firestore Security Rules)
- Use `@firebase/rules-unit-testing` with Firebase Emulator
- Test all FHIR resource collections (Patient, MedicationRequest, MedicationAdministration)
- Test family connections (caregiver permissions)
- Test composite indexes

### ✅ **T011-T015: Integration Tests** (End-to-End Scenarios)
- Use RNTL for component + service integration
- Test 5 quickstart scenarios:
  1. Single-profile setup & daily adherence
  2. Multi-profile management
  3. PRN (as-needed) medication
  4. Caregiver monitoring & remote logging
  5. Offline-first & conflict resolution

### ✅ **Testing Workflow** (TDD)
1. Write failing test (red)
2. Implement minimum code to pass (green)
3. Refactor with confidence
4. Validate with `npm test`

---

## 9. Validation Checklist

- [x] Jest runs without errors
- [x] Sample unit test passes (2/2)
- [x] TypeScript compiles with strict mode
- [x] Coverage thresholds configured
- [x] Firebase mocks working
- [x] Detox configuration complete
- [x] Test scripts added to package.json
- [x] Test directory structure created
- [x] Context7 documentation reviewed
- [x] Best practices documented

---

**Status**: ✅ T005 COMPLETE - Ready for Phase 3.2 (Write Tests First)  
**Next Command**: Begin T006 - Contract Test for Firestore Patients collection

---

## References

- [React Native Testing Library v13 Docs](https://callstack.github.io/react-native-testing-library/)
- [Detox Documentation](https://wix.github.io/Detox/)
- [Jest Documentation](https://jestjs.io/)
- [Firebase Rules Unit Testing](https://firebase.google.com/docs/rules/unit-tests)
- [Context7 Library Search](https://context7.dev/)
