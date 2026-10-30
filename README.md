# BookWell: Service Booking Platform

Customers find local service providers (barbers, tutors, cleaners, trainers and others), see live availability and book appointments. Providers publish their hours, accept or decline requests and track their schedule and earnings.

```
/frontend   Next.js 15 (App Router) + TypeScript + Tailwind v4 + shadcn/ui
/backend    FastAPI + asyncpg (raw SQL) + Alembic, PostgreSQL (Neon)
```

## How it fits together

```
Browser ──► Next.js ──(Server Components, /api/proxy/*)──► FastAPI ──► PostgreSQL
              │                                               │
              └─ httpOnly cookies hold the JWTs               └─ Resend (email)
```

- **Auth.** FastAPI issues an access token (30 min) and a refresh token (14 days). Next.js stores both in **httpOnly cookies**, so page JavaScript can't read them. The browser never calls FastAPI directly. Client components call `/api/proxy/...`, a route handler that attaches the access token and, when FastAPI returns 401, refreshes the token once and retries. `middleware.ts` verifies the JWT with the shared secret, silently refreshes expired sessions, and guards routes: `/dashboard` requires login, and `/provider/*` requires the PROVIDER role.
- **Role guards on the API.** The `require_customer`, `require_provider` and `get_provider_profile` dependencies are in `backend/app/core/deps.py`.
- **No double-bookings.** `POST /bookings` runs in a transaction. It locks the provider row (`SELECT … FOR UPDATE`), checks working hours, blocked dates and overlapping PENDING/CONFIRMED bookings, then inserts the booking. As a second safeguard, a Postgres exclusion constraint (`bookings_no_overlap`, which needs `btree_gist`) rejects any overlapping active bookings for the same provider. A test runs six concurrent requests for the same slot and checks that exactly one succeeds.
- **Slots.** `GET /providers/{id}/slots?service_id&date` takes the weekly hours, removes blocked dates, existing bookings and times that have already passed, and returns start times at a 30-minute step. The step is configurable.
- **Background jobs.** These run every 15 minutes in-process, and an external cron can trigger them. They send the 24-hour reminders, mark finished CONFIRMED bookings as COMPLETED, and expire PENDING requests the provider never answered.
- **Emails.** These are sent through Resend: request received, confirmed, declined, cancelled (to the other party), reminder, and password reset. If `RESEND_API_KEY` is empty, emails are logged to the console instead, so local development needs no email account.

## Prerequisites

- Python 3.9+ (3.11+ recommended)
- Node.js 20+
- A PostgreSQL 14+ database. A free [Neon](https://neon.tech) project works, and so does a local Postgres.

## Backend setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt

cp .env.example .env
# Edit .env and set:
#   DATABASE_URL: your Neon connection string (keep ?sslmode=require)
#   JWT_SECRET:   python -c "import secrets; print(secrets.token_urlsafe(48))"

alembic upgrade head        # create the schema
python -m app.seed          # optional: demo providers, services, bookings and reviews
uvicorn app.main:app --reload --port 8000
```

Interactive API docs: <http://localhost:8000/docs>

## Frontend setup

```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local and set JWT_SECRET to exactly the value in backend/.env
npm run dev
```

Open <http://localhost:3000>.

## Demo accounts (after `python -m app.seed`)

All demo accounts use the password `password123`.

| Email | Role |
| --- | --- |
| `customer@example.com` | Customer with upcoming bookings and a completed booking to review |
| `marcus@example.com` | Provider (Barber) with pending requests, today's schedule and earnings |
| `priya@example.com` | Provider (Tutor) |

Re-running the seed deletes and recreates every `@example.com` account.

## Tests

```bash
# Backend: the slot tests always run. The API tests need an empty, disposable database.
cd backend
TEST_DATABASE_URL=postgresql://user:pass@localhost:5432/servicebooking_test pytest

# Frontend: unit tests, type check, lint
cd frontend
npm test && npm run typecheck && npm run lint
```

> ⚠️ The API tests **drop and recreate the schema** in `TEST_DATABASE_URL`. Never point it at real data.

## Environment variables

**backend/.env** (full list with comments in `backend/.env.example`)

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string |
| `JWT_SECRET` | Signs access and refresh tokens. Must match the frontend. |
| `ACCESS_TOKEN_EXPIRE_MINUTES`, `REFRESH_TOKEN_EXPIRE_DAYS` | Token lifetimes |
| `RESEND_API_KEY`, `EMAIL_FROM` | Email delivery. Leave the key empty to log emails instead. |
| `FRONTEND_URL` | Base URL for links in emails |
| `CORS_ORIGINS` | Comma-separated list of origins allowed to call the API directly |
| `APP_TIMEZONE` | Timezone used for "today", slot generation and reminders |
| `SLOT_INTERVAL_MINUTES`, `BOOKING_HORIZON_DAYS` | Slot step and how far ahead customers can book |
| `ENABLE_SCHEDULER`, `SCHEDULER_INTERVAL_SECONDS` | In-process background jobs |
| `CRON_SECRET` | Enables `POST /api/v1/internal/run-jobs` (send the `X-Cron-Secret` header) |

**frontend/.env.local**

| Variable | Purpose |
| --- | --- |
| `API_URL` | FastAPI base URL. It is only used on the server. |
| `JWT_SECRET` | Same value as in the backend. Middleware uses it to verify sessions. |

## Deploying

- **Backend on Render.** Build command: `pip install -r requirements.txt && alembic upgrade head`. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`. The free tier sleeps when idle, so set `CRON_SECRET` and point a cron job (for example a Render Cron Job or cron-job.org) at `POST /api/v1/internal/run-jobs` every 15 minutes so reminders still go out.
- **Frontend on Vercel.** Set the root directory to `frontend`, then set `API_URL` (your Render URL) and `JWT_SECRET`.
- **Resend.** To send from your own address, verify a domain and update `EMAIL_FROM`. The default `onboarding@resend.dev` sender only delivers to your own Resend account email.

## Notes and design decisions

- **Time zones.** Appointment dates and times are stored as local wall-clock time (`DATE` + `TIME`) and interpreted in `APP_TIMEZONE`. This is fine for a single-region launch. Supporting providers in several time zones would need a timezone column on each provider.
- **Day numbering.** `day_of_week` uses 0 = Sunday … 6 = Saturday, matching JavaScript's `Date.getDay()`.
- **Deleting a service.** Services are soft-deleted (`is_active = false`) so past bookings keep their history.
- **Booking prices.** Each booking stores the price at booking time, and earnings are calculated from that stored price.
- **Declined requests.** A declined request becomes `CANCELLED` with `cancelled_by = PROVIDER`. The schema has no separate `DECLINED` status.
- **Dark mode.** Supported and follows the system setting, with a toggle in the header.
