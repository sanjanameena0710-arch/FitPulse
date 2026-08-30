# FitPulse Deployment Guide

The screenshot-compatible Expo frontend and the API backend are separate deployables.
The frontend keeps the existing UI and calls the backend URL configured in `config.js`.

## 1. Deploy the backend on Render

Use `FitPulse-Backend-Render-Deploy.zip` or deploy this repository using `render.yaml`.

Required Render environment variables:

```text
DATABASE_URL=your PostgreSQL connection string
CORS_ORIGIN=https://your-frontend-domain.example
TOKEN_SECRET=long random secret
```

For a long-term free database, create a small Neon PostgreSQL project and put its
connection string in `DATABASE_URL`. Render's free Postgres is suitable for testing,
but its current free database limit is time-limited. The Render backend itself remains
the deployed API service.

The Render service runs the database schema push before the API build. After deployment,
verify:

```text
https://YOUR-BACKEND.onrender.com/api/healthz
```

Expected response:

```json
{"status":"ok"}
```

The camera session endpoint is:

```text
POST https://YOUR-BACKEND.onrender.com/api/camera-sessions
```

Camera frames are processed in the browser and are not uploaded to the backend.

## 2. Deploy the frontend separately

1. Extract `FitPulse-Web-Deploy.zip`.
2. Open `config.js`.
3. Replace the placeholder API URL:

```js
window.__FITPULSE_CONFIG__ = {
  apiUrl: "https://YOUR-BACKEND.onrender.com/api"
};
```

4. Upload the extracted folder to Netlify.
5. Keep `_redirects` in the upload; it prevents `/login` and other client-side routes from returning 404 on refresh.
6. Use HTTPS. Camera access and MediaPipe pose detection require a secure context.
7. Put the exact frontend origin in Render's `CORS_ORIGIN` value and redeploy the backend.

## 3. Build the online WebView APK

Use `FitPulse-WebView-APK-Source.zip`.

1. Extract the source.
2. Create `.env` from `.env.example`.
3. Set the deployed frontend URL:

```text
EXPO_PUBLIC_WEB_APP_URL=https://YOUR-FRONTEND-DOMAIN.example
```

4. Install dependencies.
5. Run:

```bash
npx eas build --platform android --profile production-apk
```

The APK loads the frontend URL online, so internet is required. The APK also requests
camera permission so the web camera and pose overlay can run. The browser must be able
to reach the official MediaPipe runtime/model CDN for pose tracking; if a network blocks
those CDN domains, the normal camera preview still opens but pose tracking cannot start.

## 4. Automatic exercise completion

The Active Workout screen keeps the same UI. A 20-minute workout is divided equally across
its current exercises:

- 4 exercises: one task every 5 minutes
- 5 exercises: one task every 4 minutes
- Timer pause pauses automatic completion
- Reset clears the timer and task checks

The camera counter is separate: it counts a push-up only after a valid down phase followed
by a valid up phase with visible body landmarks.

## 5. Important hosting limitation

Render free web services can sleep or cold-start. The API needs a PostgreSQL connection for
persistent user/workout/camera-session data. Database plan and free availability depend on
the selected PostgreSQL provider.
