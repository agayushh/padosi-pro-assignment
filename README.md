# PadosiPro take-home

A household creates an account, verifies email, adds identity details, and chooses tasks for a Lifestyle Manager. The API and the Expo app run locally with test data. Mailpit catches verification email. Nothing here calls the production PadosiPro service.

## Prerequisites

- Docker with Compose
- Node.js 22 or newer, and pnpm 10, for the unit tests and the Expo app
- Expo Go on a phone, or an Android emulator, to run the app

The API container installs its own dependencies. You do not need a local Postgres or SMTP server.

## Backend

From this directory:

```bash
docker compose up --build
```

That starts three services:

| Service | Address | What it is |
| --- | --- | --- |
| API | http://localhost:3001 | Express API. `GET /healthz` and `GET /readyz` report process and database health. |
| Mailpit | http://localhost:8025 | Inbox for verification codes. SMTP is `localhost:1025`. |
| Postgres 16 | `localhost:55432` | Database `padosipro`, user `padosi`, password `padosi`. Host port 55432 avoids a Postgres already bound to 5432. |

The API container applies the Prisma migration, seeds the task catalogue, then listens on port 3001. The first build takes a few minutes. Later starts reuse the image.

Compose injects the environment itself. `backend/.env.example` lists the same variables for running the API on the host. Those values are local placeholders. Do not commit a real `.env`.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string |
| `ACCESS_TOKEN_SECRET` | HMAC secret for 15-minute access tokens. At least 16 characters. |
| `OTP_PEPPER` | HMAC pepper for verification codes. At least 16 characters. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` | Mailpit is `mailpit:1025` inside Compose and `localhost:1025` from the host. |
| `SMTP_USER`, `SMTP_PASS` | Leave empty for Mailpit. |
| `SMTP_FROM` | From address on the verification email |
| `PORT` | API port, default `3001` |
| `REFRESH_TOKEN_DAYS` | Refresh-token lifetime, default 30 |

Host-only alternative, after `docker compose up -d db mailpit`:

```bash
cd backend
cp .env.example .env
pnpm install
pnpm exec prisma migrate deploy
pnpm run db:seed
pnpm run dev
```

### Checks

Unit tests do not need the database:

```bash
cd backend
pnpm install
pnpm test
```

With Compose up and healthy, the integration script registers a user, reads the code from Mailpit, and walks verification, login, profile, and task selection. It waits out the 30-second resend cooldown, so it takes a little over half a minute.

```bash
node scripts/smoke.mjs
```

## Mobile app

```bash
cd mobile
pnpm install
npx expo start
```

Open the project in Expo Go. The app stores the session in Expo SecureStore, so it stays signed in after a restart.

The API base URL is chosen in this order:

1. A server saved from **Change server** on the register or login screen
2. `EXPO_PUBLIC_API_URL`, if set (`mobile/.env.example`)
3. The Metro host on port 3001, when that host is not localhost
4. `http://10.0.2.2:3001` on Android, which is the emulator's route to the computer
5. `http://localhost:3001`

A physical phone cannot use `10.0.2.2` or `localhost`. Put the computer and the phone on the same network, then set **Change server** to `http://<computer-lan-ip>:3001`.

### Screen path

1. Create an account with email, password, and confirm password. Password needs 8 to 72 characters, a letter, and a digit.
2. Open Mailpit at http://localhost:8025 and enter the 6-digit code. The code lasts 10 minutes, works once, and allows 5 wrong attempts. Resend waits 30 seconds.
3. Log in. An unverified account is sent back to the code screen.
4. The first successful login asks for name, Indian mobile, and address. Business name can be left blank: many households are families, and an empty value is stored as null.
5. Pick tasks by category, search, then confirm.
6. Home lists the saved tasks. Edit details, change the selection, or log out from there.

Every networked screen has a loading state, an empty state where one applies, and an error with a way forward.

## APK

This repository does not include a built APK. Expo Go is enough to run the app against the local API. To produce an installable APK, use the `preview` profile in `mobile/eas.json` (`android.buildType` is `apk`):

```bash
cd mobile
npx eas-cli@latest build -p android --profile preview
```

That uploads the project to EAS and needs an Expo account. When the build finishes, install the APK and set **Change server** to the computer running Docker. The Android app allows cleartext HTTP so the local API does not need TLS.

A machine with the Android SDK and a JDK can also prebuild and assemble locally:

```bash
cd mobile
npx expo prebuild --platform android
cd android && ./gradlew assembleRelease
```

The release APK is written under `android/app/build/outputs/apk/release/`.

## API

Responses use `{ success, message, code?, data?, errors? }`. Protected routes expect `Authorization: Bearer <access token>`.

| Method | Path | Auth | Role |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | no | Create an account and send a code. A verified email returns 409. |
| POST | `/api/auth/verify-email` | no | Consume the code. |
| POST | `/api/auth/resend-otp` | no | Send another code, or 429 during the cooldown. |
| POST | `/api/auth/login` | no | Verified users receive an access token and a refresh token. |
| POST | `/api/auth/refresh` | no | Rotate the refresh token. |
| POST | `/api/auth/logout` | no | Revoke the refresh token. |
| GET | `/api/me` | yes | Current profile. |
| PUT | `/api/me/profile` | yes | Save identity. |
| GET | `/api/tasks` | yes | Catalogue. Optional `q` filters on the server. |
| GET | `/api/me/tasks` | yes | Saved selection. |
| PUT | `/api/me/tasks` | yes | Replace the selection with `{ taskIds }`. |

The seeded catalogue has 8 categories and 39 tasks: errands, home services, travel, health, senior care, events, workforce, and digital help. Passwords are bcrypt with cost 12. Verification codes are stored as HMAC-SHA256. Refresh tokens are random and only their SHA-256 hash is stored.
