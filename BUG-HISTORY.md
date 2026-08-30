# Bug History

## Fixed

1. **Active Workout tasks needed manual taps**
   - Cause: exercise `done` was changed only by `onPress`.
   - Fix: selected workout duration schedule marks tasks complete sequentially based on exercise count.

2. **Push-up camera had no real pose overlay**
   - Cause: camera screen only rendered a video and manual `+` button.
   - Fix: MediaPipe Pose Landmarker runtime loader, smoothing, skeleton, joint glow, and push-up highlights.

3. **Half push-up movements could be counted if detection was added directly**
   - Fix: `DOWN -> UP` state machine with alignment, elbow-angle thresholds, and consecutive-frame debounce.

4. **Workout API POST referenced undefined `userId`**
   - Fix: use authenticated `req.authUserId`.

5. **API routes trusted arbitrary user IDs**
   - Fix: goals, progress, achievements, and workout detail mutations now use authenticated ownership checks.

6. **Generated Zod barrel failed TypeScript check**
   - Cause: runtime `ForgotPasswordBody` and type `ForgotPasswordBody` had the same export name.
   - Fix: explicit type exports with `ForgotPasswordBodyType` alias.

7. **Remote email changes were local-only in the mobile client**
   - Fix: mobile client calls `/users/change-email` and updates the cached remote user.

8. **Expo export failed on MediaPipe's dynamic module import**
   - Fix: browser-only official CDN script loader; the production bundle exports successfully.

9. **Deploy package copied stale TypeScript build cache**
   - Fix: clean package staging excludes `*.tsbuildinfo` and clean extraction/build was verified.

10. **Static frontend deep links could 404 on refresh**
    - Fix: Netlify `_redirects` now routes all client paths to `index.html`.

11. **Active Workout timing was fixed and could not match a user's session**
    - Fix: duration selector supports 10, 20, 30, or custom 1–240 minutes before the timer starts.

12. **Progress photos were not intended for server storage**
    - Fix: no photo API/table was added; photo UI remains device-local.
