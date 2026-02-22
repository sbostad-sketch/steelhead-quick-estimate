# Steelhead Quick Estimate

Next.js web app for rough construction estimates with dynamic inputs, configurable estimator settings, lead capture, and admin management.

## Features

- Customer estimator for `Fence`, `Deck`, `Pergola`, and `Repair/Handyman`
- Dynamic form fields per project type (linear feet, height, square feet, or hours)
- Estimator engine with configurable:
  - labor rate
  - unit material costs
  - production rates
  - complexity multipliers (`access`, `demo/haul-off`, `slope`)
  - minimum charges
- Estimate output:
  - low/high total range
  - low/high line-item range for materials and labor
- Admin auth hardening:
  - password hash support (`ADMIN_PASSWORD_HASH`)
  - server-side session store in DB
  - logout invalidates server session
- Admin tools:
  - update all estimator settings
  - export lead list to CSV
- Lead capture:
  - name/phone/email/zip + optional photo uploads
  - submissions stored in DB
  - optional SMTP email notifications on new leads
- Disclaimer in estimate results:
  - rough estimate only; final price after site visit

## Tech

- Next.js App Router + TypeScript
- SQLite (`better-sqlite3`) for local development
- Postgres (`pg`) for production persistence (Vercel-compatible)
- Zod validation
- Nodemailer notifications
- Vitest tests

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment:

```bash
cp .env.example .env.local
```

3. Set admin auth:

Recommended (hashed password):

```bash
npm run hash:admin -- "your-strong-password"
```

Copy the printed `ADMIN_PASSWORD_HASH=...` into `.env.local`.

4. Start dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Usage

- Customer page: `/`
- Admin login: `/admin/login`
- Admin settings + leads + CSV export: `/admin`
- Lead detail page: `/admin/leads/:id`

## Database Modes

The app auto-selects storage mode:

- `POSTGRES_URL` set: uses Postgres (recommended for production)
- `POSTGRES_URL` unset: uses local SQLite (`./data.sqlite` or `SQLITE_PATH` override)

## Photo Storage

- SQLite mode: photos are saved to `public/uploads/` and file paths are stored in DB.
- Postgres mode: photos are stored inline (data URLs) in DB for persistence in serverless environments.
- Limits: max 6 photos per lead, 5MB each.

## SMTP Notifications

Set these env vars to send a lead email on submission:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `NOTIFY_EMAIL_TO`
- `NOTIFY_EMAIL_FROM`

## Vercel Deployment (Persistent DB + SMTP)

1. Push repo to GitHub.
2. Create a Vercel project from the repo.
3. Add a persistent Postgres database:
   - Vercel Postgres (recommended in Vercel dashboard), or
   - external provider (Neon/Supabase).
4. Set Vercel environment variables:
   - `POSTGRES_URL` (required for persistence)
   - `ADMIN_PASSWORD_HASH` (generate via `npm run hash:admin -- "..."`)
   - `AUTH_COOKIE_NAME` (optional)
   - `ADMIN_SESSION_HOURS` (optional)
   - SMTP vars (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `NOTIFY_EMAIL_TO`, `NOTIFY_EMAIL_FROM`)
5. Deploy.

If `POSTGRES_URL` is missing in production, the app falls back to local SQLite, which is not persistent on Vercel.

## Tests

Run tests:

```bash
npm test
```

Production build check:

```bash
npm run build
```
