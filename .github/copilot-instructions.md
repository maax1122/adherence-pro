# adherence-pro Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-10-06

## Active Technologies
- TypeScript/JavaScript (React Native with Expo SDK 50+) + React Native, Expo, Firebase (Auth, Firestore, Cloud Messaging), AsyncStorage (001-medication-family-tracker)
- TypeScript/JavaScript (React 18+ with Vite 5+) + React, Firebase (Auth, Firestore, Cloud Messaging), Material UI or Chakra UI, React Router, Zustand (001-medication-family-tracker)
- Firebase Firestore (cloud), IndexedDB (local offline cache via Service Worker) (001-medication-family-tracker)

## Project Structure
```
src/
tests/
```

## Commands
npm test [ONLY COMMANDS FOR ACTIVE TECHNOLOGIES][ONLY COMMANDS FOR ACTIVE TECHNOLOGIES] npm run lint

## Code Style
TypeScript/JavaScript (React Native with Expo SDK 50+): Follow standard conventions

## Recent Changes
- 001-medication-family-tracker: Added TypeScript/JavaScript (React 18+ with Vite 5+) + React, Firebase (Auth, Firestore, Cloud Messaging), Material UI or Chakra UI, React Router, Zustand
- 001-medication-family-tracker: Added TypeScript/JavaScript (React Native with Expo SDK 50+) + React Native, Expo, Firebase (Auth, Firestore, Cloud Messaging), AsyncStorage

<!-- MANUAL ADDITIONS START -->

## Version Management Policy

**CRITICAL: Always verify package versions with Context7 before installation or updates**

When working with dependencies:
1. **NEVER install packages without checking Context7 first**
2. **Use Context7 to verify**:
   - Latest stable version compatible with your stack
   - Breaking changes between versions
   - Peer dependency compatibility
   - Best practices for the specific version

3. **Process for adding/updating packages**:
   ```bash
   # Step 1: Query Context7 for the package
   # Example: "Get latest stable version of firebase compatible with React 18"
   
   # Step 2: Review Context7 documentation for:
   # - Installation instructions
   # - Version compatibility
   # - Configuration requirements
   # - Known issues
   
   # Step 3: Only then run npm install with the verified version
   npm install package@verified-version
   ```

4. **Version conflicts**:
   - If TypeScript errors appear after installation (e.g., "Could not find declaration file")
   - Check Context7 for known issues with that version
   - Verify the package includes TypeScript definitions
   - Consider alternative versions if current one has issues

5. **Documentation priority**:
   - Context7 documentation > npm registry > GitHub README
   - Context7 provides version-specific, tested information
   - Reduces trial-and-error and broken installations

**Example Context7 queries**:
- "Latest stable version of firebase SDK with TypeScript support"
- "React Router v6 installation best practices"
- "Vite configuration for React 18"
- "Material-UI v5 peer dependencies"

This policy prevents:
- Installing incompatible versions
- Missing TypeScript definitions
- Peer dependency conflicts
- Breaking changes without migration guides

<!-- MANUAL ADDITIONS END -->
