# FitPulse — Premium Fitness Tracker

## Overview
FitPulse is a fully OFFLINE premium fitness app available as both a mobile (Expo/React Native) app and a standalone website. Both versions work without any backend, server, internet, or database setup. All data lives on the user's device.

## Key Features
- Login / Register / Profile (offline auth)
- 8 ready-made workout plans + custom workouts
- AI Rep Counter Camera (expo-camera on mobile, getUserMedia on web)
- Water tracking (8 glasses/day)
- Progress charts (weekly activity + water)
- Custom Goals
- 12 Achievement badges
- Before/After Progress Photos with side-by-side comparison
- BMI calculator
- Data Export/Import (JSON backup)

## Architecture

### Mobile (`artifacts/mobile/`)
- **Stack**: Expo SDK 54, React Native, TypeScript, expo-router
- **Storage**: AsyncStorage via `lib/localStore.ts` (LocalStore)
- **Auth**: `context/AuthContext.tsx` (offline, no API calls)
- **Camera**: `app/workout/camera.tsx` (expo-camera with simulated rep detection)
- **Photos**: `app/photos.tsx` (expo-image-picker, before/after compare)
- **Achievements**: `app/achievements.tsx` (12 badges, auto-unlock)
- **Tabs**: `app/(tabs)/` — index/workout/progress/profile (all offline)

### Website (`/tmp/FitPulse-Web-Offline/`)
- **Stack**: Vanilla JS, no build step, no dependencies
- **Files**: index.html + styles.css + db.js + app.js
- **Storage**: localStorage (with base64 photos)
- **Camera**: getUserMedia API (HTTPS required in prod)
- **Deployment**: drag-drop to Netlify/Vercel/GitHub Pages

### Backend
- The original Express/SQLite API server is still in `artifacts/api-server/` but is NOT used by either offline version. It can be removed if not needed.

## Demo Credentials (auto-seeded)
- Email: `demo@fitpulse.app`
- Password: `demo123`
- Comes with 5 sample workouts, 7 days of water data, 3 goals

## Deliverables (in project root)
- `FitPulse-App-Source.zip` — full mobile app source for editing
- `FitPulse-Web-Source.zip` — full website source for editing
- `FitPulse-Web-Deploy.zip` — clean website ready to drag-drop to Netlify
- `FitPulse-APK-Build.zip` — mobile source + EAS config + build instructions
- `SELLING-GUIDE.txt` — pricing/pitch guide for selling at ₹30K-40K (Hindi/Urdu)
- `CLIENT-WEB-DEPLOY.txt` — deployment guide for end clients
- `CLIENT-USER-GUIDE.txt` — user manual for end users (Hindi/Urdu mix)

## User Communicates In
Hindi/Urdu — replies should be in Hindi/Urdu mixed with English keywords.
