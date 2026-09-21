# FitPulse Security Report

## Implemented protections

- Helmet HTTP security headers.
- Global API rate limit: 120 requests per IP per minute.
- Authentication rate limit: 20 requests per IP per 15 minutes.
- Signed HMAC bearer tokens with a seven-day expiry.
- Production startup requires `TOKEN_SECRET` for token operations.
- Scrypt salted password hashing for new and changed passwords.
- Legacy SHA-256 password hashes remain verifiable during migration.
- Email normalization and validation.
- Password length validation: 6 to 128 characters.
- Express JSON/urlencoded body limit: 1 MB.
- Production CORS allowlist through `CORS_ORIGIN`.
- Authenticated ownership checks for workouts, goals, progress, achievements, and camera sessions.
- Camera frames and progress photos are not sent to the backend.

## Security tests

Run from the repository root:

```bash
pnpm --filter @workspace/api-server run test:security
```

The suite covers password hashing, legacy verification, token tampering, validation helpers,
and the authentication API rate limiter.

## Deployment requirements

Set these backend variables in Render:

```text
DATABASE_URL
CORS_ORIGIN
TOKEN_SECRET
```

Do not commit these values to GitHub or put them in frontend JavaScript.

## Known limitation

The current rate limiter uses in-memory storage. It protects a single Render instance,
which is appropriate for the selected free deployment. If the API is later scaled to
multiple instances, use a shared Redis-compatible rate-limit store so limits apply across
all instances.
