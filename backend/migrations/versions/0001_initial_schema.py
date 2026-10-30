"""Initial schema

Revision ID: 0001
Revises:
Create Date: 2026-10-22
"""
from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None

# One statement per entry: asyncpg cannot run several statements in one prepared query.
UPGRADE = [
    # btree_gist lets the bookings exclusion constraint mix "=" on uuid with "&&" on ranges.
    # Neon and standard Postgres builds ship it; if a minimal build lacks it we carry on
    # without the constraint (the booking transaction's row locks still prevent overlaps).
    """
    DO $$ BEGIN
        CREATE EXTENSION IF NOT EXISTS btree_gist;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'btree_gist unavailable, skipping bookings_no_overlap constraint';
    END $$
    """,
    "CREATE TYPE user_role AS ENUM ('CUSTOMER', 'PROVIDER')",
    "CREATE TYPE booking_status AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED')",
    """
    CREATE TABLE users (
        id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name           text NOT NULL,
        email          text NOT NULL,
        password_hash  text NOT NULL,
        role           user_role NOT NULL,
        token_version  integer NOT NULL DEFAULT 0,
        created_at     timestamptz NOT NULL DEFAULT now()
    )
    """,
    "CREATE UNIQUE INDEX users_email_lower_key ON users (lower(email))",
    """
    CREATE TABLE provider_profiles (
        id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id      uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        bio          text NOT NULL DEFAULT '',
        category     text NOT NULL,
        location     text NOT NULL,
        hourly_rate  numeric(10, 2) NOT NULL CHECK (hourly_rate >= 0),
        avatar_url   text,
        created_at   timestamptz NOT NULL DEFAULT now()
    )
    """,
    "CREATE INDEX provider_profiles_category_idx ON provider_profiles (lower(category))",
    """
    CREATE TABLE services (
        id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        provider_id       uuid NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
        name              text NOT NULL,
        description       text NOT NULL DEFAULT '',
        duration_minutes  integer NOT NULL CHECK (duration_minutes BETWEEN 5 AND 720),
        price             numeric(10, 2) NOT NULL CHECK (price >= 0),
        is_active         boolean NOT NULL DEFAULT true,
        created_at        timestamptz NOT NULL DEFAULT now()
    )
    """,
    "CREATE INDEX services_provider_idx ON services (provider_id)",
    """
    CREATE TABLE availability_slots (
        id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        provider_id  uuid NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
        day_of_week  smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
        start_time   time NOT NULL,
        end_time     time NOT NULL,
        CHECK (start_time < end_time)
    )
    """,
    "CREATE INDEX availability_slots_provider_idx ON availability_slots (provider_id, day_of_week)",
    """
    CREATE TABLE blocked_dates (
        id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        provider_id  uuid NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
        date         date NOT NULL,
        reason       text,
        UNIQUE (provider_id, date)
    )
    """,
    """
    CREATE TABLE bookings (
        id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider_id       uuid NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
        service_id        uuid NOT NULL REFERENCES services(id),
        date              date NOT NULL,
        start_time        time NOT NULL,
        end_time          time NOT NULL,
        status            booking_status NOT NULL DEFAULT 'PENDING',
        price             numeric(10, 2) NOT NULL,
        cancelled_by      user_role,
        reminder_sent_at  timestamptz,
        created_at        timestamptz NOT NULL DEFAULT now(),
        updated_at        timestamptz NOT NULL DEFAULT now(),
        CHECK (start_time < end_time)
    )
    """,
    # Last line of defence against double-booking: no two active bookings
    # for the same provider may overlap in time.
    """
    DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'btree_gist') THEN
            ALTER TABLE bookings ADD CONSTRAINT bookings_no_overlap EXCLUDE USING gist (
                provider_id WITH =,
                tsrange(date + start_time, date + end_time) WITH &&
            ) WHERE (status IN ('PENDING', 'CONFIRMED'));
        END IF;
    END $$
    """,
    "CREATE INDEX bookings_provider_date_idx ON bookings (provider_id, date)",
    "CREATE INDEX bookings_customer_idx ON bookings (customer_id, date)",
    """
    CREATE TABLE reviews (
        id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        booking_id   uuid NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
        customer_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider_id  uuid NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
        rating       smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
        comment      text NOT NULL DEFAULT '',
        created_at   timestamptz NOT NULL DEFAULT now()
    )
    """,
    "CREATE INDEX reviews_provider_idx ON reviews (provider_id, created_at DESC)",
    """
    CREATE TABLE password_reset_tokens (
        id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash  text NOT NULL UNIQUE,
        expires_at  timestamptz NOT NULL,
        used_at     timestamptz,
        created_at  timestamptz NOT NULL DEFAULT now()
    )
    """,
]

DOWNGRADE = [
    "DROP TABLE IF EXISTS password_reset_tokens",
    "DROP TABLE IF EXISTS reviews",
    "DROP TABLE IF EXISTS bookings",
    "DROP TABLE IF EXISTS blocked_dates",
    "DROP TABLE IF EXISTS availability_slots",
    "DROP TABLE IF EXISTS services",
    "DROP TABLE IF EXISTS provider_profiles",
    "DROP TABLE IF EXISTS users",
    "DROP TYPE IF EXISTS booking_status",
    "DROP TYPE IF EXISTS user_role",
]


def upgrade() -> None:
    for statement in UPGRADE:
        op.execute(statement)


def downgrade() -> None:
    for statement in DOWNGRADE:
        op.execute(statement)
