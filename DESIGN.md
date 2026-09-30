# Design

## Architecture

The backend is a single Express 5 process in front of PostgreSQL, with Prisma for schema and queries. Request logging, input sanitizing, Zod validation, a Prisma singleton, and health checks follow a small Express layout. Account, verification, and task behaviour is written for this assignment and covered by unit tests that do not need a database.

OTP generation, expiry, attempt limits, resend cooldown, login decisions, and refresh-token decisions live in pure modules under `backend/src/domain`. Services apply those decisions to Prisma and Mailpit. The mobile app is Expo SDK 57 with file routes in `mobile/src/app`. It keeps the access token, refresh token, and cached profile in SecureStore.

A request that returns 401 `UNAUTHORIZED` refreshes once. A network failure during refresh keeps the cached session and shows a connection banner. An invalid refresh token clears the session. Verification itself does not log the user in: the brief asks for login after the code is accepted, and the profile screen appears once, on the first successful login.

## Trade-offs

Verification codes are HMAC-SHA256 with a server pepper. A 6-digit code hashed with bcrypt can still be guessed offline if the database leaks, because the space is only one million values. HMAC is useless without the pepper, and comparison uses `timingSafeEqual`. The pepper has to stay out of database backups.

Sessions are a 15-minute HS256 access token plus an opaque refresh token. The refresh token is 32 random bytes; the database stores SHA-256 only. Refresh rotates the token, and presenting a revoked token revokes every live session for that user. Bearer tokens are used because React Native does not reliably persist `Set-Cookie`. Logout revokes the refresh token immediately. The access token remains valid until it expires, which is at most 15 minutes.

Email is sent before the code row is written. If Mailpit is down on a brand-new account, the user row is removed and the API returns 502, so nobody is stuck with an account and no code. If the send works and the write fails, the next resend issues a fresh code. Marking a code used and setting `emailVerifiedAt` are two writes. If the second fails, the code is spent and a new one can be requested after the 30-second cooldown.

Business name is optional. The product is a household service, and many accounts are families. An empty string is stored as null. Name, a 10-digit Indian mobile (saved as `+91…`), and address are required.

The catalogue search box filters the list already loaded on the phone. The API also accepts `q`, so a larger catalogue can move the filter server-side without a new screen.

## Left out

Password reset, email change, and account deletion are absent. There is no Lifestyle Manager inbox, task status, payment, or push notification. Production SMTP is Mailpit. The auth routes are limited to 40 requests per 15 minutes per IP, plus the per-account resend cooldown. There is no separate per-email lockout beyond the five wrong codes. iOS is configured with a bundle id, and no IPA is produced. The app does not ship a prebuilt APK; Expo Go and the EAS `preview` profile are the run paths.

## Another week

Add password reset through the same hashed-code path. Let a person revoke other sessions and expire access tokens on logout. Assign a saved selection to a manager with a status the household can see. Put the unit tests and `scripts/smoke.mjs` in CI, and add an emulator pass over register, verify, profile, and confirm. Move secrets and SMTP to a real provider only when this leaves the laptop.
