# FitPulse Online WebView APK

This is a small Expo Android wrapper for the screenshot-compatible FitPulse web frontend.
It loads the deployed frontend URL and keeps the frontend UI unchanged.

## Build

1. Copy `.env.example` to `.env`.
2. Set `EXPO_PUBLIC_WEB_APP_URL` to the deployed frontend URL.
3. Run `pnpm install` from the workspace root.
4. Run `pnpm --filter @workspace/webview-apk exec eas build --platform android --profile production-apk`.

The APK needs internet access because it loads the frontend URL. The frontend itself must be served over HTTPS for camera access.
