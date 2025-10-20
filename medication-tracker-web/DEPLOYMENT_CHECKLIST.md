# Web Deployment Checklist (W030)

This guide explains the files that must be completed before running `firebase deploy --only hosting`.

## 1. Environment Variables

Create `medication-tracker-web/.env.production` with your Firebase web config:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_VAPID_KEY=...
```

You can copy the values from the Firebase console under **Project Settings → General → Your Apps**.

## 2. Firebase CLI Setup

1. Install CLI (already added to package):
   ```bash
   npm install -g firebase-tools
   ```
2. Authenticate:
   ```bash
   firebase login
   ```
3. Switch to the web app directory if you prefer:
   ```bash
   cd medication-tracker-web
   ```

## 3. Fill Out Project Files

- `.firebaserc` (repo root)
  ```json
  {
    "projects": {
      "default": "<your-project-id>"
    }
  }
  ```
  Replace `<your-project-id>` with the ID from Firebase console (e.g. `adherence-pro`).

- `firebase.json` (repo root)
  - Leave as-is unless you need to change the `public` directory.

- `firebase/firestore.rules`
  - Replace the placeholder rules with the production rules from `specs/` once finalized.

- `firebase/firestore.indexes.json`
  - Import Firestore indexes via `firebase firestore:indexes` or paste the exported config.

## 4. Deploy Steps

From the repository root:

```bash
npm run build --prefix medication-tracker-web
firebase deploy --only hosting
```

If you need to deploy Firestore rules/indexes as well:
```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

## 5. Post-Deploy Verification

- Visit the hosting URL shown in the CLI output (e.g. `https://adherence-pro.web.app`).
- Log in and confirm the main flows load with cached service worker assets.
- Record the deployment in `specs/001-medication-family-tracker/tasks.md` (W030).
