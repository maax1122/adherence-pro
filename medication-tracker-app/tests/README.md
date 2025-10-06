# Testing Framework

This project uses a comprehensive testing strategy with multiple test levels.

## Test Levels

### 1. Unit Tests (`tests/unit/`)
- Test individual components, functions, and hooks in isolation
- Fast execution, no dependencies on external services
- Run with: `npm run test:unit`

### 2. Integration Tests (`tests/integration/`)
- Test interactions between multiple components
- Test service integrations (Auth, Firestore, Storage)
- Run with: `npm run test:integration`

### 3. Contract Tests (`tests/contract/`)
- Test Firestore security rules
- Test Firebase data model compliance
- Run with: `npm run test:contract`

### 4. E2E Tests (`tests/e2e/`)
- Test complete user flows
- Run on iOS/Android simulators using Detox
- Run with: `npm run test:e2e:ios` or `npm run test:e2e:android`

## Running Tests

```bash
# Run all tests (unit + integration + contract)
npm test

# Run tests in watch mode
npm run test:watch

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run contract tests only
npm run test:contract

# Run E2E tests on iOS
npm run test:e2e:ios

# Run E2E tests on Android
npm run test:e2e:android

# Generate coverage report
npm run test:coverage
```

## Test Structure

```
tests/
├── unit/               # Unit tests
│   ├── components/     # Component tests
│   ├── hooks/          # Custom hook tests
│   ├── utils/          # Utility function tests
│   └── services/       # Service tests
├── integration/        # Integration tests
│   ├── auth/           # Auth flow tests
│   ├── firestore/      # Firestore CRUD tests
│   └── features/       # Feature integration tests
├── contract/           # Contract tests
│   └── firestore/      # Firestore security rules tests
├── e2e/                # End-to-end tests
│   ├── auth.e2e.ts     # Authentication flows
│   ├── medication.e2e.ts # Medication management
│   └── adherence.e2e.ts  # Adherence tracking
└── __mocks__/          # Global mocks
```

## Writing Tests

### Unit Test Example

```typescript
import { render, fireEvent } from '@testing-library/react-native';
import { MyComponent } from '@/components/MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    const { getByText } = render(<MyComponent />);
    expect(getByText('Hello')).toBeTruthy();
  });
});
```

### Integration Test Example

```typescript
import firebase from '@/config/firebase';

describe('Auth Integration', () => {
  it('should sign in with valid credentials', async () => {
    const auth = firebase.auth();
    const user = await auth.signInWithEmailAndPassword(
      'test@example.com',
      'password123'
    );
    expect(user).toBeTruthy();
  });
});
```

### Contract Test Example

```typescript
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';

describe('Firestore Security Rules', () => {
  it('should deny read access to other users data', async () => {
    const testEnv = await initializeTestEnvironment({
      projectId: 'test-project',
    });
    
    // Test rules here
  });
});
```

### E2E Test Example

```typescript
describe('Authentication Flow', () => {
  it('should complete sign up flow', async () => {
    await element(by.id('signUpButton')).tap();
    await element(by.id('emailInput')).typeText('test@example.com');
    await element(by.id('passwordInput')).typeText('password123');
    await element(by.id('submitButton')).tap();
    await expect(element(by.id('homeScreen'))).toBeVisible();
  });
});
```

## Coverage Requirements

Minimum coverage thresholds (enforced in jest.config.js):
- Statements: 80%
- Branches: 75%
- Functions: 80%
- Lines: 80%

## CI/CD Integration

Tests are automatically run in CI/CD pipeline:
1. Lint → Type check → Unit tests → Integration tests → Contract tests
2. E2E tests run on pull requests to main branch
3. Coverage reports uploaded to code coverage service

## Troubleshooting

### Jest tests fail with "Cannot find module"
- Ensure `jest.config.js` has correct `moduleNameMapper`
- Check `tsconfig.json` paths match Jest module aliases

### Detox tests fail to launch app
- Ensure simulator/emulator is running
- Run `npx expo prebuild` to generate native projects
- Build app with `npm run detox:build:ios` or `npm run detox:build:android`

### Firebase Rules tests fail
- Ensure Firebase emulator is running: `firebase emulators:start`
- Check rules in `specs/contracts/firestore.rules`

## References

- [Jest Documentation](https://jestjs.io/)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Detox Documentation](https://wix.github.io/Detox/)
- [Firebase Rules Unit Testing](https://firebase.google.com/docs/rules/unit-tests)
