# Medication Tracker - Web Application

A Progressive Web App (PWA) for tracking medications for yourself and your family members.

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite 5
- **UI Framework**: Material-UI (MUI) v5
- **State Management**: Zustand
- **Routing**: React Router v6
- **Backend**: Firebase (Auth, Firestore, Cloud Messaging, Hosting)
- **Testing**: Vitest + React Testing Library + Firebase Emulator Suite
- **Standards**: FHIR R4 compliant data model

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Firebase CLI: `npm install -g firebase-tools`

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Environment Variables

Copy `.env.example` to `.env.local` and fill in your Firebase configuration:

```bash
cp .env.example .env.local
```

Get your Firebase credentials from:
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to Project Settings > General
4. Scroll to "Your apps" and copy the config values

### 3. Start Development Server

```bash
npm run dev
```

The app will open at `http://localhost:3000`

### 4. Run with Firebase Emulators (Recommended for Development)

In a separate terminal:

```bash
# From the root project directory
cd ../medication-tracker-app
firebase emulators:start
```

Then start the web app with emulators enabled:

```bash
# Make sure VITE_USE_EMULATORS=true in .env.local
npm run dev
```

## Available Scripts

### Development
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Testing
- `npm test` - Run all tests in watch mode
- `npm run test:ui` - Run tests with UI
- `npm run test:contract` - Run Firestore security rules tests
- `npm run test:integration` - Run integration tests
- `npm run test:coverage` - Run tests with coverage report

### Linting
- `npm run lint` - Run ESLint

## Project Structure

```
medication-tracker-web/
├── src/
│   ├── components/        # Reusable React components
│   ├── pages/            # Page components (routes)
│   ├── contexts/         # React contexts (Auth, etc.)
│   ├── hooks/            # Custom React hooks
│   ├── services/         # Business logic & Firebase services
│   │   ├── auth/
│   │   ├── firestore/
│   │   └── notifications/
│   ├── stores/           # Zustand stores
│   ├── types/            # TypeScript type definitions
│   ├── config/           # Configuration files
│   │   └── firebase.ts
│   ├── App.tsx           # Root component
│   ├── main.tsx          # Entry point
│   └── index.css         # Global styles
├── tests/
│   ├── contract/         # Firestore security rules tests
│   ├── integration/      # Integration tests
│   ├── unit/             # Unit tests
│   └── setup.ts          # Test setup
├── public/
│   ├── manifest.json     # PWA manifest
│   └── service-worker.js # Service worker for offline support
├── vite.config.ts        # Vite configuration
├── vitest.config.ts      # Vitest configuration
└── tsconfig.json         # TypeScript configuration
```

## Features

### ✅ Phase 1 (Current)
- User authentication (Firebase Auth)
- Patient profile management
- Medication CRUD operations
- Scheduled & PRN medications
- Medication intake logging
- Adherence tracking
- Browser notifications
- Offline support (Service Worker + IndexedDB)
- Caregiver invitations & monitoring

### 🔜 Phase 2 (Future)
- Advanced analytics
- Medication refill reminders
- Photo recognition for pills
- Integration with pharmacy APIs
- Multi-language support (English + Vietnamese)

## Testing

### Run Contract Tests (Firestore Security Rules)

1. Start Firebase Emulator:
```bash
cd ../medication-tracker-app
firebase emulators:start --only firestore
```

2. Run contract tests:
```bash
npm run test:contract
```

### Run Integration Tests

```bash
npm run test:integration
```

### Run All Tests with Coverage

```bash
npm run test:coverage
```

## Deployment

### Deploy to Firebase Hosting

1. Build the production bundle:
```bash
npm run build
```

2. Deploy to Firebase:
```bash
cd ../medication-tracker-app
firebase deploy --only hosting
```

Your app will be live at: `https://your-project-id.web.app`

## PWA Features

### Offline Support
- Service Worker caches static assets
- Firestore offline persistence (IndexedDB)
- Queued writes sync when online

### Install as App
- Users can install the PWA on desktop/mobile
- Works like a native app
- Add to home screen on mobile devices

### Push Notifications
- Browser notifications for medication reminders
- Missed dose alerts for caregivers
- Requires notification permission from user

## Data Model

The app uses a **FHIR R4-compliant** data model with flat collections:

- `/patients/{id}` - Patient profiles
- `/medication_requests/{id}` - Medication prescriptions
- `/medication_administrations/{id}` - Intake logs
- `/family_connections/{id}` - Caregiver relationships
- `/reminder_schedules/{id}` - Notification schedules

See `../specs/001-medication-family-tracker/data-model.md` for full schema.

## Security

### Firestore Security Rules
- Enforced at database level
- Users can only access their own data
- Caregivers have read-only access (except logging)
- 24-hour edit window for medication logs

### Authentication
- Email/password authentication
- Password reset via email
- Session management via Firebase Auth

## Browser Support

- Chrome/Edge >= 90
- Firefox >= 88
- Safari >= 14
- Mobile browsers (iOS Safari, Chrome Android)

## Contributing

See `../specs/001-medication-family-tracker/plan.md` for development workflow.

## License

Private - All Rights Reserved

## Support

For issues or questions, see the project documentation in `../specs/`.
