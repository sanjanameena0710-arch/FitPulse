==========================================================
  FitPulse - Premium Fitness Tracker (Mobile App Source)
==========================================================

Full source code for the FitPulse mobile app.
Built with: Expo (React Native), TypeScript, Express, SQLite.

----------------------------------------------------------
  REQUIREMENTS
----------------------------------------------------------
  - Node.js v18 or higher  (https://nodejs.org)
  - pnpm                   (npm install -g pnpm)
  - Expo Go app on your phone (App Store / Play Store)
    OR Android Studio / Xcode for native builds

----------------------------------------------------------
  PROJECT STRUCTURE
----------------------------------------------------------
  artifacts/
    mobile/         → The Expo React Native mobile app
    api-server/     → Express backend (REST API)
  lib/              → Shared packages (database, types)
  package.json      → Workspace root
  pnpm-workspace.yaml

----------------------------------------------------------
  SETUP (one-time)
----------------------------------------------------------

  STEP 1 - Install pnpm globally (if you don't have it):
      npm install -g pnpm

  STEP 2 - Install dependencies:
      pnpm install

----------------------------------------------------------
  RUNNING THE APP
----------------------------------------------------------

  You need TWO terminals open:

  ─── Terminal 1: Start the backend API ──────────────
      pnpm --filter @workspace/api-server dev

      → Backend runs on http://localhost:3001

  ─── Terminal 2: Start the mobile app ───────────────
      pnpm --filter @workspace/mobile dev

      → Expo dev server starts and shows a QR code.
      → Open Expo Go on your phone and scan the QR.
      → OR press 'w' to open in your web browser.
      → OR press 'a' for Android emulator, 'i' for iOS sim.

----------------------------------------------------------
  DEMO ACCOUNT (auto-seeded on first launch)
----------------------------------------------------------
      Email:     demo@fitpulse.app
      Password:  demo123

----------------------------------------------------------
  BUILDING NATIVE APPS (APK / IPA)
----------------------------------------------------------

  To create installable .apk (Android) or .ipa (iOS) files,
  use Expo Application Services (EAS):

      npm install -g eas-cli
      cd artifacts/mobile
      eas login
      eas build --platform android   (for Android APK)
      eas build --platform ios       (for iOS IPA)

  See: https://docs.expo.dev/build/introduction/

----------------------------------------------------------
  FEATURES
----------------------------------------------------------
  ✓ User authentication (register, login, change pwd/email)
  ✓ Workout plans (Beginner, HIIT, Strength, Yoga, 5K)
  ✓ Exercise library with instructions
  ✓ Workout timer with calorie tracking
  ✓ Goals tracking with progress
  ✓ BMI calculator
  ✓ Progress charts (weekly / monthly)
  ✓ Profile & settings
  ✓ Dark theme with purple-orange-cyan gradients
  ✓ Glassmorphism UI design

----------------------------------------------------------
  DATABASE
----------------------------------------------------------
  The backend uses SQLite by default (file: artifacts/
  api-server/fitpulse.db, auto-created on first run).

  No external database setup required.

----------------------------------------------------------
  TECH STACK
----------------------------------------------------------
  Frontend:  Expo SDK 53, React Native, expo-router,
             react-native-reanimated, react-native-svg,
             expo-linear-gradient
  Backend:   Express, Drizzle ORM, better-sqlite3
  Language:  TypeScript
  Build:     pnpm workspaces (monorepo)

==========================================================
